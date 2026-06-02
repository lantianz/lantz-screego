import React from 'react';
import {Button, Card, Checkbox, FieldError, Form, Input, Label, TextField} from '@heroui/react';
import {
    ArrowRightFromSquare,
    ArrowRightToSquare,
    ArrowRotateRight,
    CirclePlus,
    Copy,
    Globe,
    Key,
} from '@gravity-ui/icons';
import {FCreateRoom, UseRoom} from './useRoom';
import {UIConfig} from './message';
import {getRoomFromURL} from './useRoomID';
import {authModeToRoomMode, UseConfig} from './useConfig';
import {LoginForm} from './LoginForm';
import {useI18n} from './i18n';
import {notify} from './notify';

const minRoomIdLength = 4;
const roomIdByteLength = 16;

const createRoomId = (): string => {
    const browserCrypto = globalThis.crypto;
    if (typeof browserCrypto?.randomUUID === 'function') {
        return browserCrypto.randomUUID();
    }

    const bytes = new Uint8Array(roomIdByteLength);
    if (typeof browserCrypto?.getRandomValues === 'function') {
        browserCrypto.getRandomValues(bytes);
    } else {
        bytes.forEach((_, index) => {
            bytes[index] = Math.floor(Math.random() * 256);
        });
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
    return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10).join(''),
    ].join('-');
};

const CreateRoom = ({room, config}: Pick<UseRoom, 'room'> & {config: UIConfig}) => {
    const {t} = useI18n();
    const [id, setId] = React.useState(() => {
        const idFromURL = getRoomFromURL();
        if (idFromURL) {
            return idFromURL;
        }
        return config.roomName === 'unknown' ? createRoomId() : config.roomName;
    });
    const mode = authModeToRoomMode(config.authMode, config.loggedIn);
    const [ownerLeave, setOwnerLeave] = React.useState(config.closeRoomWhenOwnerLeaves);
    const [idError, setIdError] = React.useState('');
    const [conflict, setConflict] = React.useState<'exists' | 'missing'>();
    const [pendingAction, setPendingAction] = React.useState<'create' | 'join'>();

    const validateRoomId = (): string | undefined => {
        const trimmedId = id.trim();
        if (!trimmedId) {
            setIdError(t('fieldRequired', {label: t('roomIdLabel')}));
            setConflict(undefined);
            return undefined;
        }
        if (trimmedId.length < minRoomIdLength) {
            setIdError(t('roomIdTooShort', {min: minRoomIdLength}));
            setConflict(undefined);
            return undefined;
        }
        setIdError('');
        setConflict(undefined);
        setId(trimmedId);
        return trimmedId;
    };

    const create = async () => {
        const trimmedId = validateRoomId();
        if (!trimmedId) {
            return;
        }
        setPendingAction('create');
        const result = await room(
            {
                type: 'create',
                payload: {
                    mode,
                    closeOnOwnerLeave: ownerLeave,
                    joinIfExist: false,
                    id: trimmedId,
                },
            },
            {notifyInitialError: false}
        );
        if (result.ok) {
            return;
        }
        setPendingAction(undefined);
        if (result.kind === 'alreadyExists') {
            setConflict('exists');
            return;
        }
        setIdError(result.message);
    };

    const join = async () => {
        const trimmedId = validateRoomId();
        if (!trimmedId) {
            return;
        }
        setPendingAction('join');
        const result = await room(
            {
                type: 'join',
                payload: {id: trimmedId},
            },
            {notifyInitialError: false}
        );
        if (result.ok) {
            return;
        }
        setPendingAction(undefined);
        if (result.kind === 'notFound') {
            setConflict('missing');
            return;
        }
        setIdError(result.message);
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        create();
    };

    const newRoom = () => {
        setId(createRoomId());
        setIdError('');
        setConflict(undefined);
    };

    const createMissing = () => {
        setConflict(undefined);
        create();
    };

    const joinExisting = () => {
        setConflict(undefined);
        join();
    };

    const copyRoom = () => {
        navigator?.clipboard?.writeText(id);
        notify(t('roomCopied'), {variant: 'success'});
    };

    const refreshRoom = () => {
        newRoom();
    };

    const isBusy = !!pendingAction;

    return (
        <Form onSubmit={submit} className="grid gap-4">
            <div className="room-id-row">
                <TextField
                    isInvalid={!!idError}
                    value={id}
                    onChange={(value) => {
                        setId(value);
                        setConflict(undefined);
                        if (idError && value.trim().length >= minRoomIdLength) {
                            setIdError('');
                        }
                    }}
                >
                    <Label>{t('roomIdLabel')}</Label>
                    <Input />
                    {idError ? <FieldError>{idError}</FieldError> : null}
                </TextField>
                <div className="room-id-copy">
                    <Button
                        isIconOnly
                        size="sm"
                        type="button"
                        variant="tertiary"
                        aria-label={t('refreshRoomId')}
                        onPress={refreshRoom}
                    >
                        <ArrowRotateRight />
                    </Button>
                    <Button
                        isIconOnly
                        size="sm"
                        type="button"
                        variant="tertiary"
                        aria-label={t('copy')}
                        onPress={copyRoom}
                    >
                        <Copy />
                    </Button>
                </div>
            </div>
            <Checkbox isSelected={ownerLeave} onChange={setOwnerLeave} variant="secondary">
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                    <span className="text-sm">{t('closeRoomWhenOwnerLeaves')}</span>
                </Checkbox.Content>
            </Checkbox>
            {conflict ? (
                <div className="room-conflict-panel">
                    <p className="room-conflict-text">
                        {conflict === 'exists' ? t('roomExistsPrompt') : t('roomMissingPrompt')}
                    </p>
                    <div className="room-conflict-actions">
                        <Button
                            fullWidth
                            type="button"
                            size="sm"
                            onPress={conflict === 'exists' ? joinExisting : createMissing}
                            isDisabled={isBusy}
                        >
                            {conflict === 'exists' ? <ArrowRightToSquare /> : <CirclePlus />}
                            {conflict === 'exists' ? t('joinExistingRoom') : t('createMissingRoom')}
                        </Button>
                        <Button
                            fullWidth
                            type="button"
                            size="sm"
                            variant="secondary"
                            onPress={newRoom}
                            isDisabled={isBusy}
                        >
                            <ArrowRotateRight />
                            {t('newRoomId')}
                        </Button>
                    </div>
                </div>
            ) : undefined}
            <div className="room-submit-row">
                <Button
                    fullWidth
                    size="lg"
                    type="submit"
                    isPending={pendingAction === 'create'}
                    isDisabled={pendingAction === 'join'}
                >
                    <CirclePlus />
                    {t('createRoom')}
                </Button>
                <Button
                    fullWidth
                    size="lg"
                    type="button"
                    variant="secondary"
                    onPress={join}
                    isPending={pendingAction === 'join'}
                    isDisabled={pendingAction === 'create'}
                >
                    <ArrowRightToSquare />
                    {t('joinRoom')}
                </Button>
            </div>
        </Form>
    );
};

export const RoomManage = ({room, config}: {room: FCreateRoom; config: UseConfig}) => {
    const {t, language, setLanguage} = useI18n();
    const [showLogin, setShowLogin] = React.useState(false);

    const canCreateRoom = config.authMode !== 'all';
    const loginVisible = !config.loggedIn && (showLogin || !canCreateRoom);

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="room-header-left">
                    <div className="brand-mark">
                        <img className="brand-logo" src="./logo.svg" alt="" aria-hidden="true" />
                    </div>
                    <div className="room-header-info">
                        <h1 className="app-title">{t('appName')}</h1>
                        <p className="app-subtitle">{t('appSubtitle')}</p>
                    </div>
                </div>
                <div className="room-header-actions">
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
                    {config.loggedIn ? (
                        <Button
                            size="sm"
                            variant="tertiary"
                            aria-label={t('logout')}
                            onPress={config.logout}
                        >
                            <ArrowRightFromSquare />
                            <span className="header-button-label">{t('logout')}</span>
                        </Button>
                    ) : undefined}
                </div>
            </header>

            <main className="landing-main">
                <Card className="w-full" variant="default">
                    <Card.Header className="gap-2">
                        <Card.Title>
                            {loginVisible ? t('loginTitle') : t('welcomeTitle')}
                        </Card.Title>
                    </Card.Header>
                    <Card.Content className="grid gap-5">
                        {loginVisible ? (
                            <LoginForm
                                config={config}
                                hide={canCreateRoom ? () => setShowLogin(false) : undefined}
                            />
                        ) : (
                            <>
                                <CreateRoom room={room} config={config} />
                                {!config.loggedIn ? (
                                    <Button
                                        fullWidth
                                        type="button"
                                        variant="secondary"
                                        onPress={() => setShowLogin(true)}
                                    >
                                        <Key />
                                        {t('login')}
                                    </Button>
                                ) : undefined}
                            </>
                        )}
                    </Card.Content>
                </Card>
            </main>
        </div>
    );
};
