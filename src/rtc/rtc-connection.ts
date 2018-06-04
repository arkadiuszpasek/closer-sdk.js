// FIXME Unfuck when Chrome transitions to the Unified Plan.
import { errorEvents } from '../protocol/events/error-events';
import { Logger } from '../logger';
import { onceDelayed, Thunk } from '../utils/utils';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { Callback, EventHandler } from '../events/event-handler';
import { HackedRTCPeerConnection } from './hacked-rtc-peer-connection';
import { HackedMediaStreamEvent } from './hacked-mediastream-event';
import { HackedRTCOfferOptions } from './hacked-rtc-offer-options';
import { RTCAnswerOptions } from './rtc-answer-options';
import { RTCConfig } from './rtc-config';
import { RTCConnectionConstraints } from './rtc-connection-constraints';

export class RTCConnection {
    private call: ID;
    private peer: ID;
    private api: ArtichokeAPI;
    private events: EventHandler;
    private log: Logger;
    private conn: HackedRTCPeerConnection;
    private onICEDoneCallback: Thunk;
    private onRemoteStreamCallback: Callback<MediaStream>;
    private offerOptions: HackedRTCOfferOptions;
    private answerOptions: RTCAnswerOptions;

    // FIXME Required by the various hacks:
    private localRole: string;
    private attachedStreams: { [trackId: string]: MediaStream };
    private renegotiationTimer: number;

    constructor(call: ID, peer: ID, config: RTCConfig, log: Logger, events: EventHandler, api: ArtichokeAPI,
                constraints?: RTCConnectionConstraints, answerOptions?: RTCAnswerOptions,
                offerOptions?: HackedRTCOfferOptions) {
        log.info('Connecting an RTC connection to ' + peer + ' on ' + call);
        this.call = call;
        this.peer = peer;
        this.api = api;
        this.events = events;
        this.log = log;
        this.answerOptions = answerOptions;
        this.offerOptions = offerOptions;
        this.conn = new (RTCPeerConnection as HackedRTCPeerConnection)(config, constraints);

        this.localRole = undefined;
        this.attachedStreams = {};

        this.onRemoteStreamCallback = (stream) => {
            // Do nothing.
        };

        this.onICEDoneCallback = () => {
            // Do nothing.
        };

        this.conn.onicecandidate = (event) => {
            if (event.candidate) {
                this.log.debug('Created ICE candidate: ' + event.candidate.candidate);
                this.api.sendCandidate(this.call, this.peer, event.candidate).catch((err) => {
                    this.events.notify(new errorEvents.Error('Could not send an ICE candidate: ' + err));
                });
            } else {
                this.log.debug('Done gathering ICE candidates.');
                this.onICEDoneCallback();
            }
        };

        this.conn.ontrack = (event: HackedMediaStreamEvent) => {
            this.log.info('Received a remote stream.');
            const streams = (typeof event.streams !== 'undefined') ? event.streams : [event.stream];
            streams.forEach((stream) => {
                this.onRemoteStreamCallback(stream);
            });
        };

        this.conn.onnegotiationneeded = (event) => {
            // FIXME Chrome triggers renegotiation on... Initial offer creation...
            // FIXME Firefox triggers renegotiation when remote offer is received.
            if (this.isEstablished()) {
                this.renegotiationTimer = onceDelayed(this.renegotiationTimer, 100, () => {
                    this.log.debug('Renegotiating an RTC connection.');
                    this.offer().catch((err) => {
                        this.events.notify(new errorEvents.Error('Could not renegotiate the connection: ' + err));
                    });
                });
            }
        };
    }

    disconnect() {
        this.log.info('Disconnecting an RTC connection.');
        this.conn.close();
    }

    addTrack(track: MediaStreamTrack, stream?: MediaStream) {
        this.log.debug('Adding a stream track.');
        // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
        if (RTCConnection.supportsTracks(this.conn)) {
            this.conn.addTrack(track, stream);
        } else {
            stream = stream || new MediaStream([track]);
            this.attachedStreams[track.id] = stream;
            this.conn.addStream(stream);
        }
    }

    removeTrack(track: MediaStreamTrack) {
        this.log.debug('Removing a stream track.');
        // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
        if (RTCConnection.supportsTracks(this.conn)) {
            this.conn.getSenders().filter((s) => s.track === track).forEach((t) => this.conn.removeTrack(t));
        } else if (track.id in this.attachedStreams) {
            this.conn.removeStream(this.attachedStreams[track.id]);
        }
    }

    addCandidate(candidate: RTCIceCandidate): Promise<void> {
        this.log.debug('Received an RTC candidate: ' + candidate.candidate);
        return this.conn.addIceCandidate(new RTCIceCandidate(candidate));
    }

    offer(options?: HackedRTCOfferOptions): Promise<RTCSessionDescriptionInit> {
        this.log.debug('Creating an RTC offer.');

        return this.conn.createOffer(options || this.offerOptions).then((offer) => {
            return this.setLocalDescription(offer);
        }).then((offer) => {
            return this.api.sendDescription(this.call, this.peer, offer).then(() => offer);
        }).then((offer) => {
            this.log.debug('Sent an RTC offer: ' + offer.sdp);
            return offer;
        });
    }

    addOffer(remoteDescription: RTCSessionDescriptionInit,
             options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
        this.log.debug('Received an RTC offer.');

        return this.setRemoteDescription(remoteDescription).then((descr) => this.answer(options));
    }

    answer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
        this.log.debug('Creating an RTC answer.');

        return this.conn.createAnswer(options || this.answerOptions).then((answer) => {
            // FIXME Chrome does not support DTLS role changes.
            return this.setLocalDescription(this.patchSDP(answer));
        }).then((answer) => {
            return this.api.sendDescription(this.call, this.peer, answer).then(() => answer);
        }).then((answer) => {
            this.log.debug('Sent an RTC answer: ' + answer.sdp);
            return answer;
        });
    }

    addAnswer(remoteDescription: RTCSessionDescriptionInit): Promise<void> {
        this.log.debug('Received an RTC answer.');
        return this.setRemoteDescription(remoteDescription).then((descr) => {
            // FIXME Chrome does not support DTLS role changes.
            this.extractRole(descr);
        });
    }

    onRemoteStream(callback: Callback<MediaStream>) {
        this.onRemoteStreamCallback = callback;
    }

    // FIXME This is only used by tests...
    onICEDone(callback: Thunk) {
        this.onICEDoneCallback = callback;
    }

    // FIXME This should be private.
    setRemoteDescription(remoteDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        this.log.debug('Setting remote RTC description.');
        return this.conn.setRemoteDescription(
            new RTCSessionDescription(remoteDescription)).then(() => remoteDescription);
    }

    private setLocalDescription(localDescription: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        this.log.debug('Setting local RTC description.');
        return this.conn.setLocalDescription(new RTCSessionDescription(localDescription)).then(() => localDescription);
    }

    private isEstablished(): boolean {
        // NOTE 'stable' means no exchange is going on, which encompases 'fresh'
        // NOTE RTC connections as well as established ones.
        if (typeof this.conn.connectionState !== 'undefined') {
            return this.conn.connectionState === 'connected';
        } else {
            // FIXME Firefox does not support connectionState: https://bugzilla.mozilla.org/show_bug.cgi?id=1265827
            return this.conn.signalingState === 'stable' &&
                (this.conn.iceConnectionState === 'connected' || this.conn.iceConnectionState === 'completed');
        }
    }

    private getRole(descr: RTCSessionDescriptionInit): string {
        return /a=setup:([^\r\n]+)/.exec(descr.sdp)[1];
    }

    private updateRole(descr: RTCSessionDescriptionInit, role: string): RTCSessionDescriptionInit {
        const hackedDescr = descr;
        hackedDescr.sdp = hackedDescr.sdp.replace(/a=setup:[^\r\n]+/, 'a=setup:' + role);
        return hackedDescr;
    }

    private extractRole(descr: RTCSessionDescriptionInit) {
        if (this.localRole === undefined) {
            this.localRole = (this.getRole(descr) === 'active') ? 'passive' : 'active';
        }
    }

    private patchSDP(descr: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
        if (this.localRole !== undefined) {
            return this.updateRole(descr, this.localRole);
        } else {
            this.localRole = this.getRole(descr);
            return descr;
        }
    }

    private static supportsTracks(pc: HackedRTCPeerConnection): boolean {
        return (typeof pc.addTrack !== 'undefined') && (typeof pc.removeTrack !== 'undefined');
    }
}