import React from 'react';
import {TranslationKey} from './i18n';
export const CodecBestQuality: PreferredCodec = {mimeType: 'BEST_QUALITY'};
export const CodecDefault: PreferredCodec = {mimeType: 'DEFAULT'};

export const preferCodecEquals = (a: PreferredCodec, b: PreferredCodec): boolean => {
    return a.mimeType === b.mimeType && a.sdpFmtpLine === b.sdpFmtpLine;
};

export const codecNameKey = (mimeType: string): TranslationKey | undefined => {
    switch (mimeType) {
        case CodecBestQuality.mimeType:
            return 'bestQuality';
        case CodecDefault.mimeType:
            return 'browserDefault';
        default:
            return undefined;
    }
};

export const codecName = (mimeType: string): string => codecNameKey(mimeType) ?? mimeType;

export const videoDisplayModeKey = (mode: VideoDisplayMode): TranslationKey => {
    switch (mode) {
        case VideoDisplayMode.FitToWindow:
            return 'modeFitToWindow';
        case VideoDisplayMode.FitWidth:
            return 'modeFitWidth';
        case VideoDisplayMode.FitHeight:
            return 'modeFitHeight';
        case VideoDisplayMode.OriginalSize:
            return 'modeOriginalSize';
    }
};

export const resolveCodecPlaceholder = (
    codec: PreferredCodec | undefined
): PreferredCodec | undefined => {
    switch (codec?.mimeType) {
        case CodecBestQuality.mimeType:
            return {
                mimeType: 'video/VP9',
                sdpFmtpLine: 'profile-id=2',
            };
        case CodecDefault.mimeType:
            return undefined;
        default:
            return codec;
    }
};

export interface Settings {
    name?: string;
    displayMode: VideoDisplayMode;
    preferCodec?: PreferredCodec;
    framerate: number;
    shareQuality: ShareQualityMode;
}
export interface PreferredCodec {
    mimeType: string;
    sdpFmtpLine?: string;
}

export enum VideoDisplayMode {
    FitToWindow = 'FitToWindow',
    FitWidth = 'FitWidth',
    FitHeight = 'FitHeight',
    OriginalSize = 'OriginalSize',
}

export enum ShareQualityMode {
    Smooth = 'Smooth',
    Balanced = 'Balanced',
    Sharp = 'Sharp',
}

export interface ShareQualityProfile {
    key: TranslationKey;
    contentHint: 'motion' | 'detail';
    degradationPreference: RTCDegradationPreference;
    maxBitrate: number;
    maxHeight: number;
    maxWidth: number;
}

export const shareQualityProfiles: Record<ShareQualityMode, ShareQualityProfile> = {
    [ShareQualityMode.Smooth]: {
        key: 'qualitySmooth',
        contentHint: 'motion',
        degradationPreference: 'maintain-framerate',
        maxBitrate: 2_000_000,
        maxHeight: 720,
        maxWidth: 1280,
    },
    [ShareQualityMode.Balanced]: {
        key: 'qualityBalanced',
        contentHint: 'detail',
        degradationPreference: 'balanced',
        maxBitrate: 5_000_000,
        maxHeight: 1080,
        maxWidth: 1920,
    },
    [ShareQualityMode.Sharp]: {
        key: 'qualitySharp',
        contentHint: 'detail',
        degradationPreference: 'maintain-resolution',
        maxBitrate: 9_000_000,
        maxHeight: 1440,
        maxWidth: 2560,
    },
};

export const shareQualityModeKey = (mode: ShareQualityMode): TranslationKey =>
    shareQualityProfiles[mode].key;

const SettingsKey = 'screegoSettings';
const minFrameRate = 1;
const maxFrameRate = 60;
const defaultFrameRate = 20;

export const normalizeFrameRate = (value: unknown): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return defaultFrameRate;
    }
    return Math.min(Math.max(Math.round(value), minFrameRate), maxFrameRate);
};

export const loadSettings = (): Settings => {
    const settings: Partial<Settings> = JSON.parse(localStorage.getItem(SettingsKey) ?? '{}') ?? {};

    const defaults: Settings = {
        displayMode: VideoDisplayMode.FitToWindow,
        framerate: defaultFrameRate,
        shareQuality: ShareQualityMode.Balanced,
    };

    if (settings && typeof settings === 'object') {
        return {
            name: settings.name?.toString(),
            framerate: normalizeFrameRate(settings.framerate ?? defaults.framerate),
            displayMode:
                Object.values(VideoDisplayMode).find((mode) => mode === settings.displayMode) ??
                defaults.displayMode,
            preferCodec: settings.preferCodec ?? CodecDefault,
            shareQuality:
                Object.values(ShareQualityMode).find((mode) => mode === settings.shareQuality) ??
                defaults.shareQuality,
        };
    }
    return defaults;
};

export const saveSettings = (settings: Settings): void => {
    localStorage.setItem(SettingsKey, JSON.stringify(settings));
};

export const useSettings = (): [Settings, (s: Settings) => void] => {
    const [settings, setSettings] = React.useState(loadSettings);

    return [
        settings,
        (newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
        },
    ];
};
