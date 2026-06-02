import React, {useCallback} from 'react';
import {Avatar, Button, Card, Chip, Separator, Slider, Tooltip} from '@heroui/react';
import {
    ArrowRightFromSquare,
    Brush,
    ChevronDown,
    ChevronUp,
    CircleFill,
    CircleLink,
    Copy,
    Eraser,
    Gear,
    Globe,
    Persons,
    Play,
    Stop,
    TrashBin,
    ArrowRotateLeft,
    Volume,
    VolumeXmark,
    Xmark,
    ArrowsExpand,
} from '@gravity-ui/icons';
import {useHotkeys} from 'react-hotkeys-hook';
import {Video} from './Video';
import {ConnectedRoom} from './useRoom';
import {RoomUser} from './message';
import {useSettings, VideoDisplayMode} from './settings';
import {SettingDialog} from './SettingDialog';
import {useI18n} from './i18n';
import {notify} from './notify';

const HostStream: unique symbol = Symbol('mystream');

interface FullScreenHTMLVideoElement extends HTMLVideoElement {
    msRequestFullscreen?: () => void;
    mozRequestFullScreen?: () => void;
    webkitRequestFullscreen?: () => void;
}

type AnnotationTool = 'pen' | 'eraser';
type Point = {x: number; y: number};
type Stroke = {
    color: string;
    size: number;
    tool: AnnotationTool;
    points: Point[];
};

const colors = [
    {key: 'colorBlue', value: '#0b6ffb'},
    {key: 'colorGreen', value: '#0f9f6e'},
    {key: 'colorOrange', value: '#f59e0b'},
    {key: 'colorRed', value: '#ef4444'},
] as const;

type DisplayUser = RoomUser & {
    connections: number;
};

const isNarrowScreen = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 720px)').matches;

const requestFullscreen = (element: FullScreenHTMLVideoElement | null) => {
    if (element?.requestFullscreen) {
        element.requestFullscreen();
    } else if (element?.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element?.msRequestFullscreen) {
        element.msRequestFullscreen();
    } else if (element?.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    }
};

const aggregateUsers = (users: RoomUser[]): DisplayUser[] => {
    const result: DisplayUser[] = [];
    const indexByVisitor = new Map<string, number>();

    users.forEach((user) => {
        const key = user.visitorId || user.id;
        const index = indexByVisitor.get(key);
        if (index === undefined) {
            indexByVisitor.set(key, result.length);
            result.push({...user, connections: 1});
            return;
        }

        const current = result[index];
        result[index] = {
            ...current,
            streaming: current.streaming || user.streaming,
            you: current.you || user.you,
            owner: current.owner || user.owner,
            connections: current.connections + 1,
        };
    });

    return result;
};

const streamHasAudioTrack = (stream: MediaStream | undefined): boolean =>
    !!stream?.getAudioTracks().some((track) => track.readyState !== 'ended');

const useHasAudioTrack = (stream: MediaStream | undefined): boolean => {
    const [hasAudioTrack, setHasAudioTrack] = React.useState(() => streamHasAudioTrack(stream));

    React.useEffect(() => {
        if (!stream) {
            setHasAudioTrack(false);
            return;
        }

        let audioTracks: MediaStreamTrack[] = [];
        const update = () => {
            audioTracks.forEach((track) => track.removeEventListener('ended', update));
            audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track) => track.addEventListener('ended', update));
            setHasAudioTrack(streamHasAudioTrack(stream));
        };

        stream.addEventListener('addtrack', update);
        stream.addEventListener('removetrack', update);
        update();

        return () => {
            stream.removeEventListener('addtrack', update);
            stream.removeEventListener('removetrack', update);
            audioTracks.forEach((track) => track.removeEventListener('ended', update));
        };
    }, [stream]);

    return hasAudioTrack;
};

export const Room = ({
    state,
    share,
    stopShare,
    setName,
}: {
    state: ConnectedRoom;
    share: () => void;
    stopShare: () => void;
    setName: (name: string) => void;
}) => {
    const {t, language, setLanguage} = useI18n();
    const [open, setOpen] = React.useState(false);
    const [settings, setSettings] = useSettings();
    const [selectedStream, setSelectedStream] = React.useState<string | typeof HostStream>();
    const [videoElement, setVideoElement] = React.useState<FullScreenHTMLVideoElement | null>(null);
    const [annotationMode, setAnnotationMode] = React.useState(false);
    const [annotationTool, setAnnotationTool] = React.useState<AnnotationTool>('pen');
    const [annotationColor, setAnnotationColor] = React.useState<string>(colors[0].value);
    const [brushSize, setBrushSize] = React.useState(4);
    const [strokes, setStrokes] = React.useState<Stroke[]>([]);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const activeStroke = React.useRef<Stroke | null>(null);

    const handleFullscreen = useCallback(() => requestFullscreen(videoElement), [videoElement]);

    React.useEffect(() => {
        if (selectedStream === HostStream && state.hostStream) {
            return;
        }
        if (state.clientStreams.some(({id}) => id === selectedStream)) {
            return;
        }
        const nextStream = state.hostStream ? HostStream : state.clientStreams[0]?.id;
        if (selectedStream !== nextStream) {
            setSelectedStream(nextStream);
        }
    }, [state.clientStreams, selectedStream, state.hostStream]);

    const stream =
        selectedStream === HostStream
            ? state.hostStream
            : state.clientStreams.find(({id}) => selectedStream === id)?.stream;
    const hasAudioTrack = useHasAudioTrack(stream);

    React.useEffect(() => {
        if (videoElement && stream) {
            videoElement.srcObject = stream;
            videoElement.play().catch((err) => {
                console.log('Could not play main video', err);
                if (err.name === 'NotAllowedError') {
                    videoElement.muted = true;
                    videoElement
                        .play()
                        .catch((retryErr) =>
                            console.log('Could not play main video with mute', retryErr)
                        );
                }
            });
        }
    }, [videoElement, stream]);

    const copyText = (text: string, successMessage: string) => {
        navigator?.clipboard?.writeText(text)?.then(
            () => notify(successMessage, {variant: 'success'}),
            (err) => notify(t('copyFailed', {error: err}), {variant: 'error'})
        );
    };

    const copyLink = () => copyText(window.location.href, t('linkCopied'));
    const copyRoom = () => copyText(state.id, t('roomCopied'));
    const leaveRoom = () => {
        stopShare();
        state.ws.close(1000, t('roomLeft'));
        window.history.pushState({roomId: undefined}, '', '?');
    };

    useHotkeys('s', () => (state.hostStream ? stopShare() : share()), [state.hostStream]);
    useHotkeys('f', () => selectedStream && handleFullscreen(), [handleFullscreen, selectedStream]);
    useHotkeys('c', copyLink);
    useHotkeys(
        'm',
        () => hasAudioTrack && videoElement && (videoElement.muted = !videoElement.muted),
        [hasAudioTrack, videoElement]
    );

    const videoClass = (() => {
        switch (settings.displayMode) {
            case VideoDisplayMode.FitWidth:
                return 'stage-video stage-video--fit-width';
            case VideoDisplayMode.FitHeight:
                return 'stage-video stage-video--fit-height';
            case VideoDisplayMode.OriginalSize:
            case VideoDisplayMode.FitToWindow:
            default:
                return 'stage-video';
        }
    })();

    useCanvas(strokes, canvasRef);
    const users = React.useMemo(() => aggregateUsers(state.users), [state.users]);

    const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!annotationMode) {
            return;
        }
        const point = eventPoint(event);
        const nextStroke: Stroke = {
            color: annotationTool === 'eraser' ? '#ffffff' : annotationColor,
            size: annotationTool === 'eraser' ? brushSize * 3 : brushSize,
            tool: annotationTool,
            points: [point],
        };
        activeStroke.current = nextStroke;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const moveStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!activeStroke.current) {
            return;
        }
        activeStroke.current.points.push(eventPoint(event));
        drawStrokes(canvasRef.current, [...strokes, activeStroke.current]);
    };

    const endStroke = () => {
        if (!activeStroke.current) {
            return;
        }
        const finalStroke = activeStroke.current;
        activeStroke.current = null;
        setStrokes((current) => [...current, finalStroke]);
    };

    const userCount = users.length;
    const viewerCount = users.filter((user) => !user.streaming).length || userCount;
    const [membersCollapsed, setMembersCollapsed] = React.useState(isNarrowScreen);
    React.useEffect(() => {
        const updateCollapsed = () => {
            if (isNarrowScreen()) {
                setMembersCollapsed(true);
            }
        };
        updateCollapsed();
        window.addEventListener('resize', updateCollapsed);
        return () => window.removeEventListener('resize', updateCollapsed);
    }, []);
    const status = state.hostStream
        ? t('sharingNow')
        : stream
          ? t('statusViewing')
          : t('waitingForScreen');

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="room-header-left">
                    <div className="brand-mark">
                        <img className="brand-logo" src="./logo.svg" alt="" aria-hidden="true" />
                    </div>
                    <div className="room-header-info">
                        <h1 className="app-title">{t('appName')}</h1>
                        <div className="room-header-meta">
                            <span>
                                {t('roomNumber')} {state.id}
                            </span>
                            <Button
                                className="room-header-copy-button"
                                isIconOnly
                                size="sm"
                                variant="tertiary"
                                aria-label={t('copy')}
                                onPress={copyRoom}
                            >
                                <Copy />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="room-header-actions">
                    <Chip
                        className="header-status-chip"
                        color={stream ? 'success' : 'warning'}
                        variant="soft"
                    >
                        <CircleFill width={7} />
                        <Chip.Label>{status}</Chip.Label>
                    </Chip>
                    <Chip className="header-users-chip" color="accent" variant="soft">
                        <Persons width={14} />
                        <Chip.Label>{t('onlineUsers', {count: userCount})}</Chip.Label>
                    </Chip>
                    <Button
                        size="sm"
                        variant="secondary"
                        aria-label={t('language')}
                        onPress={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                    >
                        <Globe />
                        <span className="header-button-label">
                            {language === 'zh' ? t('english') : t('chinese')}
                        </span>
                    </Button>
                    <Button
                        size="sm"
                        variant="danger-soft"
                        aria-label={t('leaveRoom')}
                        onPress={leaveRoom}
                    >
                        <ArrowRightFromSquare />
                        <span className="header-button-label">{t('leaveRoom')}</span>
                    </Button>
                </div>
            </header>

            <main className="room-grid">
                <aside className="side-stack">
                    <Card>
                        <Card.Header>
                            <Card.Title>{t('roomActions')}</Card.Title>
                            <Card.Description>{t('roomLink')}</Card.Description>
                        </Card.Header>
                        <Card.Content className="room-actions-grid">
                            <Button
                                fullWidth
                                className="room-action-button"
                                aria-label={state.hostStream ? t('stopSharing') : t('shareScreen')}
                                onPress={() => (state.hostStream ? stopShare() : share())}
                            >
                                {state.hostStream ? <Stop /> : <Play />}
                                <span className="room-action-label">
                                    {state.hostStream ? t('stopSharing') : t('shareScreen')}
                                </span>
                            </Button>
                            <Button
                                fullWidth
                                className="room-action-button"
                                variant="secondary"
                                aria-label={t('copyInvite')}
                                onPress={copyLink}
                            >
                                <CircleLink />
                                <span className="room-action-label">{t('copyInvite')}</span>
                            </Button>
                            <Button
                                fullWidth
                                className="room-action-button"
                                variant="tertiary"
                                aria-label={t('settings')}
                                onPress={() => setOpen(true)}
                            >
                                <Gear />
                                <span className="room-action-label">{t('settings')}</span>
                            </Button>
                        </Card.Content>
                    </Card>

                    <MembersCard
                        users={users}
                        viewerCount={viewerCount}
                        collapsed={membersCollapsed}
                        setCollapsed={setMembersCollapsed}
                    />
                </aside>

                <section className="stage-card" aria-label={t('screenStage')}>
                    {stream ? (
                        <video
                            ref={setVideoElement}
                            className={videoClass}
                            onDoubleClick={handleFullscreen}
                        />
                    ) : (
                        <EmptyStage />
                    )}
                    <canvas
                        ref={canvasRef}
                        className="annotation-canvas"
                        style={{pointerEvents: annotationMode ? 'auto' : 'none'}}
                        aria-hidden={!annotationMode}
                        aria-label={annotationMode ? t('annotationLayer') : undefined}
                        onPointerDown={startStroke}
                        onPointerMove={moveStroke}
                        onPointerUp={endStroke}
                        onPointerCancel={endStroke}
                    />
                    <div className="tool-dock">
                        {annotationMode ? (
                            <AnnotationTools
                                tool={annotationTool}
                                setTool={setAnnotationTool}
                                color={annotationColor}
                                setColor={setAnnotationColor}
                                size={brushSize}
                                setSize={setBrushSize}
                                undo={() => setStrokes((current) => current.slice(0, -1))}
                                clear={() => setStrokes([])}
                                exit={() => setAnnotationMode(false)}
                            />
                        ) : (
                            <ViewerTools
                                selected={!!selectedStream}
                                fullscreen={handleFullscreen}
                                hasAudioTrack={hasAudioTrack}
                                muted={!!videoElement?.muted}
                                toggleMute={() => {
                                    if (videoElement) {
                                        videoElement.muted = !videoElement.muted;
                                    }
                                }}
                            />
                        )}
                    </div>
                </section>

                <aside className="side-stack">
                    <Card>
                        <Card.Header>
                            <Card.Title>{t('displaySettings')}</Card.Title>
                            <Card.Description>{t('currentSettings')}</Card.Description>
                        </Card.Header>
                        <Card.Content>
                            <div className="metric-grid">
                                <Metric
                                    label={t('displayMode')}
                                    value={t(
                                        settings.displayMode === VideoDisplayMode.FitToWindow
                                            ? 'modeFitToWindow'
                                            : settings.displayMode === VideoDisplayMode.FitWidth
                                              ? 'modeFitWidth'
                                              : settings.displayMode === VideoDisplayMode.FitHeight
                                                ? 'modeFitHeight'
                                                : 'modeOriginalSize'
                                    )}
                                />
                                <Metric
                                    label={t('targetFrameRate')}
                                    value={t('frameRateValue', {value: settings.framerate})}
                                />
                            </div>
                        </Card.Content>
                    </Card>

                    <Card>
                        <Card.Header>
                            <Card.Title>{t('localPreview')}</Card.Title>
                            <Card.Description>
                                {state.clientStreams.length
                                    ? t('viewers', {count: state.clientStreams.length})
                                    : t('noPreview')}
                            </Card.Description>
                        </Card.Header>
                        <Card.Content className="grid gap-3">
                            {state.clientStreams
                                .filter(({id}) => id !== selectedStream)
                                .map((client) => (
                                    <PreviewButton
                                        key={client.id}
                                        label={
                                            state.users.find(({id}) => client.peer_id === id)
                                                ?.name ?? t('unknownUser')
                                        }
                                        stream={client.stream}
                                        onSelect={() => setSelectedStream(client.id)}
                                    />
                                ))}
                            {state.hostStream && selectedStream !== HostStream ? (
                                <PreviewButton
                                    label={t('you')}
                                    stream={state.hostStream}
                                    onSelect={() => setSelectedStream(HostStream)}
                                />
                            ) : undefined}
                        </Card.Content>
                    </Card>
                </aside>
            </main>

            <SettingDialog
                open={open}
                setOpen={setOpen}
                updateName={setName}
                saveSettings={setSettings}
            />
        </div>
    );
};

const MembersCard = ({
    users,
    viewerCount,
    collapsed,
    setCollapsed,
}: {
    users: DisplayUser[];
    viewerCount: number;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}) => {
    const {t} = useI18n();
    return (
        <Card>
            <Card.Header className="member-card-header">
                <div className="min-w-0">
                    <Card.Title>{t('viewerPanel')}</Card.Title>
                    <Card.Description>{t('viewers', {count: viewerCount})}</Card.Description>
                </div>
                <Button
                    isIconOnly
                    size="sm"
                    type="button"
                    variant="tertiary"
                    aria-label={collapsed ? t('expandMembers') : t('collapseMembers')}
                    onPress={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronDown /> : <ChevronUp />}
                </Button>
            </Card.Header>
            {!collapsed ? (
                <Card.Content className="grid gap-3">
                    {users.map((user) => (
                        <UserRow key={user.visitorId || user.id} user={user} />
                    ))}
                </Card.Content>
            ) : undefined}
        </Card>
    );
};

const UserRow = ({user}: {user: DisplayUser}) => {
    const {t} = useI18n();
    return (
        <div className="flex items-center gap-3 rounded-md bg-surface-secondary p-3">
            <Avatar size="sm" color={user.streaming ? 'success' : 'default'}>
                <Avatar.Fallback>{user.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <div className="member-tags">
                    {user.you ? (
                        <Chip size="sm" color="accent" variant="soft">
                            <Chip.Label>{t('you')}</Chip.Label>
                        </Chip>
                    ) : undefined}
                    <Chip size="sm" color={user.owner ? 'warning' : 'default'} variant="soft">
                        <Chip.Label>{user.owner ? t('owner') : t('member')}</Chip.Label>
                    </Chip>
                    {user.streaming ? (
                        <Chip size="sm" color="success" variant="soft">
                            <Chip.Label>{t('streaming')}</Chip.Label>
                        </Chip>
                    ) : undefined}
                    {user.connections > 1 ? (
                        <Chip size="sm" color="default" variant="soft">
                            <Chip.Label>{t('tabsCount', {count: user.connections})}</Chip.Label>
                        </Chip>
                    ) : undefined}
                </div>
            </div>
        </div>
    );
};

const Metric = ({label, value}: {label: string; value: string}) => (
    <div className="metric-tile">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
);

const EmptyStage = () => {
    const {t} = useI18n();
    return (
        <div className="stage-empty">
            <p className="stage-empty-text">{t('noStream')}</p>
        </div>
    );
};

const ViewerTools = ({
    selected,
    fullscreen,
    hasAudioTrack,
    muted,
    toggleMute,
}: {
    selected: boolean;
    fullscreen: () => void;
    hasAudioTrack: boolean;
    muted: boolean;
    toggleMute: () => void;
}) => {
    const {t} = useI18n();
    return (
        <>
            <Tooltip>
                <Tooltip.Trigger>
                    <Button
                        size="sm"
                        className="annotation-tool-button"
                        variant="secondary"
                        onPress={fullscreen}
                        isDisabled={!selected}
                        aria-label={t('fullScreen')}
                    >
                        <ArrowsExpand />
                        <span className="annotation-tool-label">{t('fullScreen')}</span>
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('fullScreen')}</Tooltip.Content>
            </Tooltip>
            {hasAudioTrack ? (
                <Button
                    size="sm"
                    className="annotation-tool-button"
                    variant="secondary"
                    onPress={toggleMute}
                    isDisabled={!selected}
                    aria-label={t('volume')}
                >
                    {muted ? <VolumeXmark /> : <Volume />}
                    <span className="annotation-tool-label">{t('volume')}</span>
                </Button>
            ) : undefined}
        </>
    );
};

const AnnotationTools = ({
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    undo,
    clear,
    exit,
}: {
    tool: AnnotationTool;
    setTool: (tool: AnnotationTool) => void;
    color: string;
    setColor: (color: string) => void;
    size: number;
    setSize: (size: number) => void;
    undo: () => void;
    clear: () => void;
    exit: () => void;
}) => {
    const {t} = useI18n();
    return (
        <>
            <Button
                size="sm"
                className="annotation-tool-button"
                variant={tool === 'pen' ? 'primary' : 'secondary'}
                aria-label={t('pen')}
                onPress={() => setTool('pen')}
            >
                <Brush />
                <span className="annotation-tool-label">{t('pen')}</span>
            </Button>
            <Button
                size="sm"
                className="annotation-tool-button"
                variant={tool === 'eraser' ? 'primary' : 'secondary'}
                aria-label={t('eraser')}
                onPress={() => setTool('eraser')}
            >
                <Eraser />
                <span className="annotation-tool-label">{t('eraser')}</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-1">
                {colors.map((item) => (
                    <Button
                        key={item.value}
                        isIconOnly
                        className="annotation-icon-button"
                        size="sm"
                        variant={color === item.value ? 'primary' : 'tertiary'}
                        aria-label={t(item.key)}
                        onPress={() => setColor(item.value)}
                    >
                        <span
                            className="size-4 rounded-full border border-white/50"
                            style={{background: item.value}}
                        />
                    </Button>
                ))}
            </div>
            <div className="annotation-slider">
                <Slider
                    aria-label={t('brushSize')}
                    minValue={2}
                    maxValue={16}
                    step={1}
                    value={size}
                    onChange={(nextValue) =>
                        setSize(Array.isArray(nextValue) ? nextValue[0] : nextValue)
                    }
                />
            </div>
            <Button
                isIconOnly
                size="sm"
                className="annotation-icon-button"
                variant="tertiary"
                aria-label={t('undo')}
                onPress={undo}
            >
                <ArrowRotateLeft />
            </Button>
            <Button
                isIconOnly
                size="sm"
                className="annotation-icon-button"
                variant="tertiary"
                aria-label={t('clear')}
                onPress={clear}
            >
                <TrashBin />
            </Button>
            <Button
                size="sm"
                className="annotation-exit-button"
                variant="danger-soft"
                aria-label={t('exitAnnotation')}
                onPress={exit}
            >
                <Xmark />
                <span className="annotation-tool-label">{t('exitAnnotation')}</span>
            </Button>
        </>
    );
};

const PreviewButton = ({
    stream,
    label,
    onSelect,
}: {
    stream: MediaStream;
    label: string;
    onSelect: () => void;
}) => (
    <button type="button" className="preview-button" onClick={onSelect}>
        <Video src={stream} className="preview-video" />
        <span className="preview-label">{label}</span>
    </button>
);

const eventPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
        y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
};

const useCanvas = (strokes: Stroke[], ref: React.RefObject<HTMLCanvasElement | null>) => {
    React.useEffect(() => {
        const canvas = ref.current;
        if (!canvas) {
            return;
        }
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.floor(rect.width * ratio));
            canvas.height = Math.max(1, Math.floor(rect.height * ratio));
            drawStrokes(canvas, strokes);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [ref, strokes]);
};

const drawStrokes = (canvas: HTMLCanvasElement | null, strokes: Stroke[]) => {
    if (!canvas) {
        return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => {
        if (stroke.points.length < 1) {
            return;
        }
        context.save();
        context.globalCompositeOperation =
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.size * (window.devicePixelRatio || 1);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.stroke();
        context.restore();
    });
};
