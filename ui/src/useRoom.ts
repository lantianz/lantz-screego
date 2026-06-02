import React from 'react';

import {
    ICEServer,
    IncomingMessage,
    JoinRoom,
    OutgoingMessage,
    RoomCreate,
    RoomInfo,
    UIConfig,
} from './message';
import {loadSettings, resolveCodecPlaceholder} from './settings';
import {urlWithSlash} from './url';
import {authModeToRoomMode} from './useConfig';
import {getFromURL, useRoomID} from './useRoomID';
import {useI18n} from './i18n';
import {notify} from './notify';

export type RoomState = false | ConnectedRoom;
export type ConnectedRoom = {
    ws: WebSocket;
    hostStream?: MediaStream;
    clientStreams: ClientStream[];
} & RoomInfo;

interface ClientStream {
    id: string;
    peer_id: string;
    stream: MediaStream;
}

export interface UseRoom {
    state: RoomState;
    room: FCreateRoom;
    share: () => void;
    setName: (name: string) => void;
    stopShare: () => void;
}

const VisitorIDKey = 'lantzScreegoVisitorId';

const createVisitorId = (): string => {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const loadVisitorId = (): string => {
    const stored = localStorage.getItem(VisitorIDKey);
    if (stored) {
        return stored;
    }
    const visitorId = createVisitorId();
    localStorage.setItem(VisitorIDKey, visitorId);
    return visitorId;
};

const relayConfig: Partial<RTCConfiguration> =
    window.location.search.indexOf('forceTurn=true') !== -1 ? {iceTransportPolicy: 'relay'} : {};

const hostSession = async ({
    sid,
    ice,
    send,
    done,
    stream,
}: {
    sid: string;
    ice: ICEServer[];
    send: (e: OutgoingMessage) => void;
    done: () => void;
    stream: MediaStream;
}): Promise<RTCPeerConnection> => {
    const peer = new RTCPeerConnection({...relayConfig, iceServers: ice});
    peer.onicecandidate = (event) => {
        if (!event.candidate) {
            return;
        }
        send({type: 'hostice', payload: {sid: sid, value: event.candidate}});
    };

    peer.onconnectionstatechange = (event) => {
        console.log('host change', event);
        if (
            peer.connectionState === 'closed' ||
            peer.connectionState === 'disconnected' ||
            peer.connectionState === 'failed'
        ) {
            peer.close();
            done();
        }
    };

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    const preferCodec = resolveCodecPlaceholder(loadSettings().preferCodec);
    if (preferCodec) {
        const transceiver = peer
            .getTransceivers()
            .find((t) => t.sender && t.sender.track === stream.getVideoTracks()[0]);

        if (!!transceiver && 'setCodecPreferences' in transceiver) {
            const exactMatch: RTCRtpCodec[] = [];
            const mimeMatch: RTCRtpCodec[] = [];
            const others: RTCRtpCodec[] = [];

            RTCRtpReceiver.getCapabilities('video')?.codecs.forEach((codec) => {
                if (codec.mimeType === preferCodec.mimeType) {
                    if (codec.sdpFmtpLine === preferCodec.sdpFmtpLine) {
                        exactMatch.push(codec);
                    } else {
                        mimeMatch.push(codec);
                    }
                } else {
                    others.push(codec);
                }
            });

            const sortedCodecs = [...exactMatch, ...mimeMatch, ...others];

            console.log('Setting codec preferences', sortedCodecs);
            transceiver.setCodecPreferences(sortedCodecs);
        }
    }

    const hostOffer = await peer.createOffer({offerToReceiveVideo: true});
    await peer.setLocalDescription(hostOffer);
    send({type: 'hostoffer', payload: {value: hostOffer, sid: sid}});

    return peer;
};

const clientSession = async ({
    sid,
    ice,
    send,
    done,
    onTrack,
}: {
    sid: string;
    ice: ICEServer[];
    send: (e: OutgoingMessage) => void;
    onTrack: (s: MediaStream) => void;
    done: () => void;
}): Promise<RTCPeerConnection> => {
    console.log('ice', ice);
    const peer = new RTCPeerConnection({...relayConfig, iceServers: ice});
    peer.onicecandidate = (event) => {
        if (!event.candidate) {
            return;
        }
        send({type: 'clientice', payload: {sid: sid, value: event.candidate}});
    };
    peer.onconnectionstatechange = (event) => {
        console.log('client change', event);
        if (
            peer.connectionState === 'closed' ||
            peer.connectionState === 'disconnected' ||
            peer.connectionState === 'failed'
        ) {
            peer.close();
            done();
        }
    };

    let notified = false;
    const stream = new MediaStream();
    peer.ontrack = (event) => {
        stream.addTrack(event.track);
        if (!notified) {
            notified = true;
            onTrack(stream);
        }
    };

    return peer;
};

export type RoomErrorKind =
    | 'alreadyExists'
    | 'alreadyJoined'
    | 'disconnected'
    | 'notFound'
    | 'tooShort'
    | 'unauthorized';

export type RoomConnectionResult =
    | {ok: true}
    | {kind: RoomErrorKind; message: string; ok: false; reason: string};

export type FCreateRoom = (
    room: RoomCreate | JoinRoom,
    options?: {notifyInitialError?: boolean}
) => Promise<RoomConnectionResult>;

export const useRoom = (config: UIConfig): UseRoom => {
    const [roomID, setRoomID] = useRoomID();
    const {t} = useI18n();
    const conn = React.useRef<WebSocket | undefined>(undefined);
    const host = React.useRef<Record<string, RTCPeerConnection>>({});
    const client = React.useRef<Record<string, RTCPeerConnection>>({});
    const stream = React.useRef<MediaStream>(undefined);
    const visitorId = React.useRef(loadVisitorId());

    const [state, setState] = React.useState<RoomState>(false);

    const room: FCreateRoom = React.useCallback(
        (create, options = {}) => {
            return new Promise<RoomConnectionResult>((resolve) => {
                const ws = (conn.current = new WebSocket(
                    urlWithSlash.replace('http', 'ws') + 'stream'
                ));
                const send = (message: OutgoingMessage) => {
                    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
                };
                const notifyInitialError = options.notifyInitialError ?? true;
                let first = true;
                let connected = false;
                let closeNotified = false;
                let resolved = false;
                const resolveOnce = (result: RoomConnectionResult) => {
                    if (!resolved) {
                        resolved = true;
                        resolve(result);
                    }
                };
                const roomError = (reason: string): RoomConnectionResult => ({
                    kind: roomErrorKind(reason),
                    message: localizeRoomError(reason, t),
                    ok: false,
                    reason,
                });
                const notifyClose = (result: RoomConnectionResult) => {
                    if (result.ok || closeNotified || (!connected && !notifyInitialError)) {
                        return;
                    }
                    closeNotified = true;
                    notify(result.message, {
                        variant: 'error',
                        persist: true,
                    });
                };
                ws.onmessage = (data) => {
                    const event: IncomingMessage = JSON.parse(data.data);
                    if (first) {
                        first = false;
                        if (event.type === 'room') {
                            connected = true;
                            resolveOnce({ok: true});
                            setState({ws, ...event.payload, clientStreams: []});
                            setRoomID(event.payload.id);
                        } else {
                            const result = roomError('received unknown event');
                            resolveOnce(result);
                            console.log('Unknown room event', event.type);
                            notifyClose(result);
                            ws.close(1000, 'received unknown event');
                        }
                        return;
                    }

                    switch (event.type) {
                        case 'room':
                            setState((current) =>
                                current ? {...current, ...event.payload} : current
                            );
                            return;
                        case 'hostsession':
                            if (!stream.current) {
                                return;
                            }
                            hostSession({
                                sid: event.payload.id,
                                stream: stream.current!,
                                ice: event.payload.iceServers,
                                send,
                                done: () => delete host.current[event.payload.id],
                            }).then((peer) => {
                                host.current[event.payload.id] = peer;
                            });
                            return;
                        case 'clientsession':
                            const {id: sid, peer} = event.payload;
                            clientSession({
                                sid,
                                send,
                                ice: event.payload.iceServers,
                                done: () => {
                                    delete client.current[sid];
                                    setState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  clientStreams: current.clientStreams.filter(
                                                      ({id}) => id !== sid
                                                  ),
                                              }
                                            : current
                                    );
                                },
                                onTrack: (stream) =>
                                    setState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  clientStreams: [
                                                      ...current.clientStreams,
                                                      {
                                                          id: sid,
                                                          stream,
                                                          peer_id: peer,
                                                      },
                                                  ],
                                              }
                                            : current
                                    ),
                            }).then((peer) => (client.current[event.payload.id] = peer));
                            return;
                        case 'clientice':
                            host.current[event.payload.sid]?.addIceCandidate(event.payload.value);
                            return;
                        case 'clientanswer':
                            host.current[event.payload.sid]?.setRemoteDescription(
                                event.payload.value
                            );
                            return;
                        case 'hostoffer':
                            (async () => {
                                await client.current[event.payload.sid]?.setRemoteDescription(
                                    event.payload.value
                                );
                                const answer =
                                    await client.current[event.payload.sid]?.createAnswer();
                                await client.current[event.payload.sid]?.setLocalDescription(
                                    answer
                                );
                                send({
                                    type: 'clientanswer',
                                    payload: {sid: event.payload.sid, value: answer},
                                });
                            })();
                            return;
                        case 'hostice':
                            client.current[event.payload.sid]?.addIceCandidate(event.payload.value);
                            return;
                        case 'endshare':
                            client.current[event.payload]?.close();
                            host.current[event.payload]?.close();
                            setState((current) =>
                                current
                                    ? {
                                          ...current,
                                          clientStreams: current.clientStreams.filter(
                                              ({id}) => id !== event.payload
                                          ),
                                      }
                                    : current
                            );
                    }
                };
                ws.onclose = (event) => {
                    if (first) {
                        first = false;
                        const result = roomError(event.reason);
                        resolveOnce(result);
                        notifyClose(result);
                    } else {
                        notifyClose(roomError(event.reason));
                    }
                    setState(false);
                };
                ws.onerror = (err) => {
                    if (first) {
                        first = false;
                        const result = roomError('');
                        resolveOnce(result);
                        notifyClose(result);
                    } else {
                        notifyClose(roomError(''));
                    }
                    console.log('Room websocket error', err);
                    setState(false);
                };
                ws.onopen = () => {
                    create.payload.visitorId = visitorId.current;
                    send(create);
                };
            });
        },
        [setState, setRoomID, t]
    );

    const share = async () => {
        if (!navigator.mediaDevices) {
            notify(t('startShareErrorHttps'), {variant: 'error', persist: true});
            return;
        }
        if (typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
            notify(t('startShareErrorUnsupported'), {variant: 'error', persist: true});
            return;
        }
        try {
            stream.current = await navigator.mediaDevices.getDisplayMedia({
                video: {frameRate: loadSettings().framerate},
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    // https://medium.com/@trystonperry/why-is-getdisplaymedias-audio-quality-so-bad-b49ba9cfaa83
                    // @ts-expect-error
                    googAutoGainControl: false,
                },
            });
        } catch (e) {
            console.log('Could not getDisplayMedia', e);
            notify(t('startShareError'), {variant: 'error', persist: true});
            return;
        }

        stream.current?.getVideoTracks()[0].addEventListener('ended', () => stopShare());
        setState((current) => (current ? {...current, hostStream: stream.current} : current));

        conn.current?.send(JSON.stringify({type: 'share', payload: {}}));
    };

    const stopShare = async () => {
        Object.values(host.current).forEach((peer) => {
            peer.close();
        });
        host.current = {};
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = undefined;
        conn.current?.send(JSON.stringify({type: 'stopshare', payload: {}}));
        setState((current) => (current ? {...current, hostStream: undefined} : current));
    };

    const setName = (name: string): void => {
        conn.current?.send(JSON.stringify({type: 'name', payload: {username: name}}));
    };

    React.useEffect(() => {
        if (roomID) {
            const create = getFromURL('create') === 'true';
            if (create) {
                const closeOnOwnerLeaveString = getFromURL('closeOnOwnerLeave');
                const closeOnOwnerLeave =
                    closeOnOwnerLeaveString === undefined
                        ? config.closeRoomWhenOwnerLeaves
                        : closeOnOwnerLeaveString === 'true';
                room({
                    type: 'create',
                    payload: {
                        joinIfExist: true,
                        closeOnOwnerLeave,
                        id: roomID,
                        mode: authModeToRoomMode(config.authMode, config.loggedIn),
                    },
                });
            } else {
                room({type: 'join', payload: {id: roomID}});
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {state, room, share, stopShare, setName};
};

const roomErrorKind = (reason: string): RoomErrorKind => {
    const normalized = reason.trim().toLowerCase();
    if (!normalized) {
        return 'disconnected';
    }
    if (normalized.includes('not found') || normalized.includes('does not exist')) {
        return 'notFound';
    }
    if (
        normalized.includes('authenticate') ||
        normalized.includes('unauthorized') ||
        normalized.includes('you need to login')
    ) {
        return 'unauthorized';
    }
    if (normalized.includes('already exists') || normalized.includes('does already exist')) {
        return 'alreadyExists';
    }
    if (normalized.includes('already in one')) {
        return 'alreadyJoined';
    }
    if (normalized.includes('room id') && normalized.includes('at least')) {
        return 'tooShort';
    }
    return 'disconnected';
};

const localizeRoomError = (reason: string, t: ReturnType<typeof useI18n>['t']): string => {
    switch (roomErrorKind(reason)) {
        case 'notFound':
            return t('roomNotFound');
        case 'unauthorized':
            return t('roomUnauthorized');
        case 'alreadyExists':
            return t('roomAlreadyExists');
        case 'alreadyJoined':
            return t('roomAlreadyJoined');
        case 'tooShort':
            return t('roomIdTooShort', {min: 4});
        case 'disconnected':
        default:
            return t('roomDisconnected');
    }
};
