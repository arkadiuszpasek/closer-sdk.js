// Common types:
export type Type = string;
export type ID = string;
export type Ref = string;
export type Timestamp = number;

// Datatypes:
export interface Call {
    id: ID;
    users: Array<ID>;
    direct: boolean;
}

export interface Room {
    id: ID;
    name: string;
    direct: boolean;
}

export interface RosterRoom extends Room {
    mark?: number;
    unread?: number;
}

// JSON Events:
export interface CallInvitation extends Event {
    call: Call;
    user?: ID;   // FIXME Remove this.
    inviter?: ID;
}

interface CallAction extends Event {
    user: ID;
    timestamp?: Timestamp; // FIXME Shouldn't be optional.
}

export interface CallInvited extends CallAction {
    sender?: ID; // FIXME Remove this.
    inviter?: ID;
}

export interface CallJoined extends CallAction { }

export interface CallLeft extends CallAction {
    reason: string;
}

export interface Event {
    type: Type;
    ref?: Ref;
    id?: ID;
}

export interface Error extends Event {
    reason: string;
}

// FIXME This shouldn't be an event.
export interface Message extends Event {
    body: string;
    sender: ID;
    room: ID;
    timestamp: Timestamp;
    delivered?: Timestamp;
}

export interface MessageDelivered extends Event {
    timestamp: Timestamp;
}

export interface MessageReceived extends Event {
    message: Message;
}

export interface MessageRequest extends Event {
    body: string;
    room: ID;
}

export interface Mark extends Event {
    room: ID;
    timestamp: Timestamp;
}

export type Status = "away" | "available" | "unavailable";

export interface Presence extends Event {
    sender?: ID; // FIXME Remove.
    user?: ID;
    status: Status;
    timestamp: Timestamp;
}

export type Action = "joined" | "left" | "invited";

export interface RoomAction extends Event { // FIXME Remove this.
    originator: ID;
    action: Action;
    subject?: ID;
    timestamp: Timestamp;
}

export interface RoomInvitation extends Event {
    inviter?: ID; // FIXME Make not optional.
    room: Room;
}

interface NewRoomAction extends Event {
    timestamp: Timestamp;
    user: ID;
}

export interface RoomInvited extends NewRoomAction {
    inviter: ID;
}

export interface RoomJoined extends NewRoomAction { }

export interface RoomLeft extends NewRoomAction {
    reason: string;
}

export type Candidate = string;

export interface RTCCandidate extends Event {
    peer: ID;
    candidate: Candidate;
}

export type SDP = RTCSessionDescriptionInit;

export interface RTCDescription extends Event {
    peer: ID;
    description: SDP;
}

export interface Typing extends Event {
    user?: ID;
}

// WS API:
export function messageRequest(room: ID, body: string, ref: Ref): MessageRequest {
    return {
        type: "msg_request",
        room,
        body,
        ref
    };
}

export function messageDelivered(id: ID, timestamp: Timestamp): MessageDelivered {
    return {
        type: "msg_delivered",
        id,
        timestamp
    };
}

export function mark(room: ID, timestamp: Timestamp): Mark {
    return {
        type: "mark",
        room,
        timestamp
    };
}

export function presence(user: ID, status: Status, timestamp: Timestamp): Presence {
    return {
        type: "presence",
        sender: user,
        status,
        timestamp
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

export function typing(id: ID): Typing {
    return {
        type: "typing",
        id
    };
}

// REST API:
export interface CreateCall {
    users: Array<ID>;
}

export interface CreateDirectCall extends CreateDirectEntity {};

export interface CreateDirectEntity {
    peer: ID;
}

export interface CreateDirectRoom extends CreateDirectEntity {};

export interface CreateRoom {
    name: string;
}

export interface LeaveReason {
    reason: string;
}

export function createCall(users: Array<ID>): CreateCall {
    return {
        users
    };
}

export function createDirectCall(peer: ID): CreateDirectRoom {
    return {
        peer
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

export function createDirectRoom(peer: ID): CreateDirectRoom {
    return {
        peer
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
function clone(event: Event): Event {
    return read(write(event));
}

function fixRoomAction(a: RoomAction): NewRoomAction {
    switch (a.action) {
    case "invited":
        return {
            type: "room_invited",
            id: a.id,
            inviter: a.originator,
            user: a.subject,
            timestamp: a.timestamp
        } as RoomInvited;

    case "joined":
        return {
            type: "room_joined",
            id: a.id,
            user: a.originator,
            timestamp: a.timestamp
        } as RoomJoined;

    case "left":
        return {
            type: "room_left",
            id: a.id,
            user: a.originator,
            reason: "no reason",
            timestamp: a.timestamp
        } as RoomLeft;

    default:
        throw new Error("Unimplemented RoomAction type: " + a.action);
    }
}

export function fix(e: Event): Event {
    console.log("fix:", e);
    switch (e.type) {
    case "call_invitation":
        let c = clone(e) as CallInvitation;
        c.inviter = c.user;
        delete c.user;
        return c;

    case "call_joined":
        let cj = clone(e) as CallJoined;
        cj.timestamp = Date.now();
        return cj;

    case "call_left":
        let cl = clone(e) as CallLeft;
        cl.timestamp = Date.now();
        return cl;

    case "call_invited":
        let ci = clone(e) as CallInvited;
        ci.inviter = ci.sender;
        delete ci.sender;
        ci.timestamp = Date.now();
        return ci;

    case "presence":
        let p = clone(e) as Presence;
        p.user = p.sender;
        delete p.sender;
        return p;

    case "room_created":
        let r = clone(e) as RoomInvitation;
        r.type = "room_invitation";
        return r;

    case "room_action":
        return fixRoomAction(e as RoomAction);

    default:
        return e;
    }
}

function roomAction(a: NewRoomAction, originator: ID, action: Action, subject?: ID): RoomAction {
    let result = {
        type: "room_action",
        id: a.id,
        originator,
        action,
        timestamp: a.timestamp
    } as RoomAction;

    if (subject) {
        result.subject = subject;
    }

    return result;
}

export function unfix(e: Event): Event {
    switch (e.type) {
    case "call_invitation":
        let c = clone(e) as CallInvitation;
        c.user = c.inviter;
        delete c.inviter;
        return c;

    case "call_invited":
        let ci = e as CallInvited;
        ci.sender = ci.inviter;
        delete ci.inviter;
        delete ci.timestamp;
        return ci;

    case "call_joined":
        let cj = e as CallJoined;
        delete cj.timestamp;
        return cj;

    case "call_left":
        let cl = e as CallLeft;
        delete cl.timestamp;
        return cl;

    case "presence":
        let p = clone(e) as Presence;
        p.sender = p.user;
        delete p.user;
        return p;

    case "room_invitation":
        let r = clone(e) as RoomInvitation;
        delete r.inviter;
        r.type = "room_created";
        return r;

    case "room_invited":
        let ri = e as RoomInvited;
        return roomAction(ri, ri.inviter, "invited", ri.user);

    case "room_joined":
        let rj = e as RoomJoined;
        return roomAction(rj, rj.user, "joined");

    case "room_left":
        let rl = e as RoomLeft;
        return roomAction(rl, rl.user, "left");

    default:
        return e;
    }
}
