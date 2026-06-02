import React from 'react';
import {Button, Label, ListBox, Modal, Select} from '@heroui/react';
import {
    CodecBestQuality,
    CodecDefault,
    codecName,
    codecNameKey,
    loadSettings,
    PreferredCodec,
    Settings,
    VideoDisplayMode,
    videoDisplayModeKey,
} from './settings';
import {NumberField} from './NumberField';
import {useI18n} from './i18n';

export interface SettingDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    updateName: (s: string) => void;
    saveSettings: (s: Settings) => void;
}

const getAvailableCodecs = (): PreferredCodec[] => {
    if ('getCapabilities' in RTCRtpSender) {
        return RTCRtpSender.getCapabilities('video')?.codecs ?? [];
    }
    return [];
};

const NativeCodecs = getAvailableCodecs();

const codecKey = ({mimeType, sdpFmtpLine}: PreferredCodec) =>
    `${mimeType}${sdpFmtpLine ? `::${sdpFmtpLine}` : ''}`;

const parseCodecKey = (key: string, options: PreferredCodec[]) =>
    options.find((codec) => codecKey(codec) === key);

export const SettingDialog = ({open, setOpen, updateName, saveSettings}: SettingDialogProps) => {
    const {t} = useI18n();
    const [settingsInput, setSettingsInput] = React.useState(loadSettings);
    const codecOptions = React.useMemo(() => [CodecBestQuality, CodecDefault, ...NativeCodecs], []);

    React.useEffect(() => {
        if (open) {
            setSettingsInput(loadSettings());
        }
    }, [open]);

    const doSubmit = () => {
        saveSettings(settingsInput);
        updateName('');
        setOpen(false);
    };

    const {preferCodec, displayMode, framerate} = settingsInput;

    return (
        <Modal isOpen={open} onOpenChange={setOpen}>
            <Modal.Backdrop isDismissable={false}>
                <Modal.Container size="lg" placement="center">
                    <Modal.Dialog>
                        <Modal.Header>
                            <div className="min-w-0">
                                <Modal.Heading>{t('settings')}</Modal.Heading>
                                <p className="mt-1 text-sm text-muted">{t('appearance')}</p>
                            </div>
                            <Modal.CloseTrigger aria-label={t('close')} />
                        </Modal.Header>
                        <Modal.Body className="grid gap-4">
                            {NativeCodecs.length > 0 ? (
                                <Select
                                    selectedKey={codecKey(preferCodec ?? CodecDefault)}
                                    onSelectionChange={(key) =>
                                        setSettingsInput((current) => ({
                                            ...current,
                                            preferCodec:
                                                typeof key === 'string'
                                                    ? parseCodecKey(key, codecOptions)
                                                    : undefined,
                                        }))
                                    }
                                >
                                    <Label>{t('preferredCodec')}</Label>
                                    <Select.Trigger>
                                        <Select.Value />
                                        <Select.Indicator />
                                    </Select.Trigger>
                                    <Select.Popover>
                                        <ListBox>
                                            {codecOptions.map((codec) => {
                                                const key = codecNameKey(codec.mimeType);
                                                const label = key
                                                    ? t(key)
                                                    : codecName(codec.mimeType);
                                                return (
                                                    <ListBox.Item
                                                        key={codecKey(codec)}
                                                        id={codecKey(codec)}
                                                    >
                                                        {label}
                                                        {codec.sdpFmtpLine
                                                            ? ` (${codec.sdpFmtpLine})`
                                                            : ''}
                                                    </ListBox.Item>
                                                );
                                            })}
                                        </ListBox>
                                    </Select.Popover>
                                </Select>
                            ) : undefined}
                            <Select
                                selectedKey={displayMode}
                                onSelectionChange={(key) =>
                                    setSettingsInput((current) => ({
                                        ...current,
                                        displayMode:
                                            typeof key === 'string'
                                                ? (key as VideoDisplayMode)
                                                : VideoDisplayMode.FitToWindow,
                                    }))
                                }
                            >
                                <Label>{t('displayMode')}</Label>
                                <Select.Trigger>
                                    <Select.Value />
                                    <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                    <ListBox>
                                        {Object.values(VideoDisplayMode).map((mode) => (
                                            <ListBox.Item key={mode} id={mode}>
                                                {t(videoDisplayModeKey(mode))}
                                            </ListBox.Item>
                                        ))}
                                    </ListBox>
                                </Select.Popover>
                            </Select>
                            <NumberField
                                label={t('frameRate')}
                                min={1}
                                onChange={(nextFramerate) =>
                                    setSettingsInput((current) => ({
                                        ...current,
                                        framerate: nextFramerate,
                                    }))
                                }
                                value={framerate}
                            />
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="tertiary" onPress={() => setOpen(false)}>
                                {t('cancel')}
                            </Button>
                            <Button onPress={doSubmit}>{t('save')}</Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};
