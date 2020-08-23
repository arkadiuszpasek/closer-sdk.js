import { VideoHint, AudioHint } from '../rtc/media-track-content-hint';

export interface RTCConfig extends RTCConfiguration {
    degradationPreference?: RTCDegradationPreference; // default = 'balanced'
    videoHint?: VideoHint;
    audioHint?: AudioHint;
}
