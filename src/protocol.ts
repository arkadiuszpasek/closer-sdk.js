import {deepcopy} from "./utils";

// Common types:
export type Type = string;
export type ID = string;
export type Ref = string;
export type Timestamp = number;

// Datatypes:
export interface RoomAction extends RoomArchivable {
  action: "joined" | "left" | "invited";
  reason?: string;
  invitee?: ID;
}

export interface Archivable {
  type: Type;
  id: ID;
  user: ID;
  timestamp: Timestamp;
}

export interface RoomArchivable extends Archivable {
    room: ID;
}

export interface Bot {
  id: ID;
  name: string;
  creator: ID;
  callback?: string;
}

export interface Call {
  id: ID;
  created: Timestamp;
  ended?: Timestamp;
  users: Array<ID>;
  direct: boolean;
}

export interface CallAction extends CallArchivable {
  action: "joined" | "left" | "invited" | "rejected" | "answered" | "audio_muted"
    | "audio_unmuted" | "video_paused" | "video_unpaused";
  reason?: string;
  invitee?: ID;
}

export interface CallArchivable extends Archivable {
  call: ID;
}

export interface Deliverable {
  delivered?: Delivered;
}

export interface Delivered extends UserTimestamp {}

export interface Editable {
  edited?: Edited;
}

export interface Edited extends UserTimestamp {}

export interface Media extends RoomArchivable, MediaItem, Editable {}

export interface MediaItem {
  mimeType: string;
  content: string;
  description: string;
}

export interface Message extends RoomArchivable, Deliverable, Editable {
  body: string;
}

export interface Metadata extends RoomArchivable {
  payload: any;
}

export interface Room {
  id: ID;
  name: string;
  created: Timestamp;
  users: Array<ID>;
  direct: boolean;
  orgId?: ID;
  externalId?: string;
  mark?: number;
}

export interface UserTimestamp {
  user: ID;
  timestamp: Timestamp;
}

// JSON Events:
export interface BotUpdated extends Event {
  bot: Bot;
}

export interface CallActionSent extends Event {
  action: CallAction;
}

export interface CallInvitation extends Event {
  call: Call;
  inviter: ID;
}

export interface CallEnd extends Event {
  reason: string;
  timestamp: Timestamp;
}

export interface ChatDelivered extends Event {
  timestamp: Timestamp;
  user?: ID;
}

export interface ChatEdited extends Event {
  archivable: Archivable;
}

export interface ChatReceived extends Event {
  message: Message;
}

export interface ChatRequest extends Event {
  body: string;
  room: ID;
}

export interface Event {
  type: Type;
  ref?: Ref;
  id?: ID;
}

export interface Error extends Event {
  reason: string;
  cause?: any;
}

export interface ServerInfo extends Event {
  timestamp: Timestamp;
}

export interface Heartbeat extends ServerInfo {}
export interface Hello extends ServerInfo {}

export interface MuteAudio extends StreamUpdate {}
export interface PauseVideo extends StreamUpdate {}

export type Status = "away" | "available" | "unavailable";

export interface PresenceRequest extends Event {
  status: Status;
}

export interface PresenceUpdate extends Event {
  user: ID;
  status: Status;
  timestamp: Timestamp;
}

export interface RoomActionSent extends Event {
  action: RoomAction;
}

export interface RoomInvitation extends Event {
  inviter: ID;
  room: Room;
}

export interface RoomMark extends Event {
  timestamp: Timestamp;
}

export interface RoomMedia extends Event {
  media: Media;
}

export interface RoomMessage extends Event {
  message: Message;
}

export interface RoomMetadata extends Event {
  metadata: Metadata;
}

export interface RoomStartTyping extends Event {
}

export interface RoomTyping extends Event {
  user: ID;
  timestamp: Timestamp;
}

export type Candidate = RTCIceCandidate;

export interface RTCCandidate extends Event {
  peer: ID;
  candidate: Candidate;
}

export type SDP = RTCSessionDescriptionInit;

export interface RTCDescription extends Event {
  peer: ID;
  description: SDP;
}

export interface StreamUpdate extends Event {}
export interface UnmuteAudio extends StreamUpdate {}
export interface UnpauseVideo extends StreamUpdate {}

// Internal events:
export interface Disconnect extends Event {
  reason: string;
  code: number;
}

// WS API:
export function chatRequest(room: ID, body: string, ref?: Ref): ChatRequest {
  return {
    type: "chat_request",
    room,
    body,
    ref
  };
}

export function chatDelivered(id: ID, timestamp: Timestamp): ChatDelivered {
  return {
    type: "chat_delivered",
    id,
    timestamp
  };
}

export function muteAudio(id: ID): MuteAudio {
  return {
    type: "stream_mute",
    id
  };
}

export function unmuteAudio(id: ID): UnmuteAudio {
  return {
    type: "stream_unmute",
    id
  };
}

export function pauseVideo(id: ID): PauseVideo {
  return {
    type: "stream_pause",
    id
  };
}

export function unpauseVideo(id: ID): UnpauseVideo {
  return {
    type: "stream_unpause",
    id
  };
}

export function mark(id: ID, timestamp: Timestamp): RoomMark {
  return {
    type: "room_mark",
    id,
    timestamp
  };
}

export function presenceRequest(status: Status): PresenceRequest {
  return {
    type: "presence_request",
    status
  };
}

export function rtcDescription(id: ID, peer: ID, description: SDP): RTCDescription {
  return {
    type: "rtc_description",
    id,
    peer,
    description
  };
}

export function rtcCandidate(id: ID, peer: ID, candidate: Candidate): RTCCandidate {
  return {
    type: "rtc_candidate",
    id,
    peer,
    candidate
  };
}

export function startTyping(id: ID): RoomStartTyping {
  return {
    type: "room_start_typing",
    id
  };
}

export function typing(id: ID, user: ID, timestamp: Timestamp): RoomTyping {
  return {
    type: "room_typing",
    id,
    user,
    timestamp
  };
}

// REST API:
export interface CreateCall {
  users: Array<ID>;
}

export interface CreateDirectCall extends CreateDirectEntity {
  timeout?: number;
};

export interface CreateDirectEntity {
  user: ID;
}

export interface CreateDirectRoom extends CreateDirectEntity {};

export interface CreateRoom {
  name: string;
}

export interface LeaveReason {
  reason: string;
}

export interface Invite {
  user: ID;
}

export interface CreateBot {
  name: string;
  callback?: string;
}

export function createCall(users: Array<ID>): CreateCall {
  return {
    users
  };
}

export function createDirectCall(user: ID, timeout?: number): CreateDirectCall {
  return {
    user,
    timeout
  };
}

export function leaveReason(reason: string): LeaveReason {
  return {
    reason
  };
}

export function createRoom(name: string): CreateRoom {
  return {
    name
  };
}

export function createDirectRoom(user: ID): CreateDirectRoom {
  return {
    user
  };
}

export function invite(user): Invite {
  return {
    user
  };
}

export function createBot(name: string, callback?: string): CreateBot {
  return {
    name,
    callback
  };
}

// Internal API:
export function error(reason: string, cause?: any, ref?: string): Error {
  return {
    type: "error",
    reason,
    cause,
    ref
  };
}

export function disconnect(code: number, reason: string): Disconnect {
  return {
    type: "disconnect",
    reason,
    code
  };
}

// Reading & writing:
export function read(bytes: string): Event {
  return JSON.parse(bytes);
}

export function write(event: Event): string {
  return JSON.stringify(event);
}

// Backend fixer-uppers:
export function fix(e: Event): Event {
  // NOTE Use this function to fix any backend crap.
  switch (e.type) {
  case "call_end":
    let et = deepcopy(e) as CallEnd;
    et.timestamp = Date.now();
    return et;

  case "hello":
    let h = deepcopy(e) as Hello;
    h.timestamp = Date.now();
    return h;

  default:
    return e;
  }
}

export function unfix(e: Event): Event {
  // NOTE Use this function to reverse fix(e).
  switch (e.type) {
  case "call_end":
    let et = deepcopy(e) as CallEnd;
    et.timestamp = undefined;
    return et;

  case "hello":
    let h = deepcopy(e) as Hello;
    h.timestamp = undefined;
    return h;

  default:
    return e;
  }
}
