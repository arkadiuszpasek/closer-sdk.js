import { Logger } from '../logger';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { EventHandler } from '../events/event-handler';
import { RTCConfig } from './rtc-config';
import { RTCPool } from './rtc-pool';

export function createRTCPool(call: ID, config: RTCConfig, log: Logger,
                              events: EventHandler, api: ArtichokeAPI): RTCPool {
    return new RTCPool(call, config, log, events, api);
}