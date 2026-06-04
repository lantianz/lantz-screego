import React from 'react';
import {I18nProvider as AriaI18nProvider} from '@heroui/react';

export type Language = 'zh' | 'en';

const LanguageKey = 'lantzScreegoLanguage';

const translations = {
    zh: {
        appName: '屏幕分享',
        appSubtitle: '创建房间，分享屏幕。',
        dismiss: '关闭',
        language: '语言',
        chinese: '中文',
        english: 'English',
        statusViewing: '观看中',
        roomNumber: '房间号',
        roomLink: '房间链接',
        onlineUsers: '{count} 人在线',
        viewers: '{count} 人观看',
        copy: '复制',
        close: '关闭',
        linkCopied: '链接已复制',
        roomCopied: '房间号已复制',
        copyFailed: '复制失败：{error}',
        fullScreen: '全屏',
        annotation: '批注',
        leaveRoom: '离开房间',
        exitAnnotation: '退出批注',
        pen: '画笔',
        eraser: '橡皮',
        undo: '撤销',
        clear: '清除',
        color: '颜色',
        volume: '音量',
        shareScreen: '开始共享',
        stopSharing: '停止共享',
        settings: '设置',
        noStream: '等待用户共享',
        noStreamHint: '等待房主开始屏幕共享',
        sharingScreen: '屏幕共享中',
        sharingScreenHint: '正在分享整个屏幕',
        you: '我',
        owner: '房主',
        streaming: '共享中',
        unknownUser: '未知用户',
        displaySettings: '显示设置',
        currentSettings: '当前屏幕显示偏好',
        welcomeTitle: '屏幕共享房间',
        roomIdLabel: '房间号',
        roomIdTooShort: '房间号至少需要 {min} 位',
        refreshRoomId: '刷新房间号',
        closeRoomWhenOwnerLeaves: '房主离开后关闭房间',
        createOrJoinRoom: '创建或加入房间',
        createRoom: '创建房间',
        joinRoom: '加入房间',
        roomExistsPrompt: '这个房间已经存在，要加入该房间吗？',
        roomMissingPrompt: '这个房间不存在，要创建该房间吗？',
        joinExistingRoom: '加入该房间',
        createMissingRoom: '创建该房间',
        newRoomId: '换新房间号',
        login: '登录',
        logout: '退出登录',
        loggedInAs: '你好，{user}',
        guest: '访客',
        loginTitle: '登录到屏幕分享',
        goBack: '返回',
        username: '用户名',
        password: '密码',
        fieldRequired: '请输入{label}',
        loginFailed: '登录失败',
        loggedIn: '已登录',
        logoutFailed: '退出失败',
        loggedOut: '已退出登录',
        roomLeft: '已离开房间',
        roomDisconnected: '房间连接已断开',
        roomNotFound: '房间不存在或已关闭',
        roomUnauthorized: '没有权限加入该房间',
        roomAlreadyExists: '房间已存在',
        roomAlreadyJoined: '你已经在房间中',
        unknownEvent: '收到未知事件',
        startShareErrorHttps: '无法开始共享。请确认正在使用 HTTPS。',
        startShareErrorUnsupported: '无法开始共享。当前浏览器不支持屏幕共享。',
        startShareError: '无法开始共享',
        save: '保存',
        cancel: '取消',
        preferredCodec: '首选编码',
        displayMode: '显示模式',
        frameRate: '帧率',
        targetFrameRate: '目标帧率',
        frameRateValue: '{value} 帧/秒',
        invalidNumber: '请输入有效数字',
        minNumber: '数字不能小于 {min}',
        maxNumber: '数字不能大于 {max}',
        decrease: '减少',
        increase: '增加',
        shareQuality: '共享质量',
        qualitySmooth: '流畅优先',
        qualityBalanced: '平衡',
        qualitySharp: '清晰优先',
        bestQuality: '预设：最佳质量',
        browserDefault: '预设：浏览器默认',
        modeFitToWindow: '适应窗口',
        modeFitWidth: '适应宽度',
        modeFitHeight: '适应高度',
        modeOriginalSize: '原始尺寸',
        openGithub: 'GitHub',
        version: '版本 {version}',
        member: '成员',
        sharingNow: '正在共享',
        waitingForScreen: '等待屏幕共享',
        viewerPanel: '成员列表',
        expandMembers: '展开成员列表',
        collapseMembers: '收起成员列表',
        tabsCount: '{count} 个标签页',
        roomActions: '房间操作',
        copyInvite: '复制邀请链接',
        startAnnotation: '开始批注',
        annotationLayer: '批注层',
        screenStage: '共享画面',
        brushSize: '笔触大小',
        colorBlue: '蓝色',
        colorGreen: '绿色',
        colorOrange: '橙色',
        colorRed: '红色',
        noPreview: '暂无其他画面',
        localPreview: '我的共享画面',
        currentUser: '当前用户',
        appearance: '显示偏好',
    },
    en: {
        appName: 'Screen Share',
        appSubtitle: 'Create a room and share your screen.',
        dismiss: 'Dismiss',
        language: 'Language',
        chinese: '中文',
        english: 'English',
        statusViewing: 'Viewing',
        roomNumber: 'Room ID',
        roomLink: 'Room Link',
        onlineUsers: '{count} online',
        viewers: '{count} viewers',
        copy: 'Copy',
        close: 'Close',
        linkCopied: 'Link copied',
        roomCopied: 'Room ID copied',
        copyFailed: 'Copy failed: {error}',
        fullScreen: 'Fullscreen',
        annotation: 'Annotate',
        leaveRoom: 'Leave Room',
        exitAnnotation: 'Exit Annotation',
        pen: 'Pen',
        eraser: 'Eraser',
        undo: 'Undo',
        clear: 'Clear',
        color: 'Color',
        volume: 'Volume',
        shareScreen: 'Start Sharing',
        stopSharing: 'Stop Sharing',
        settings: 'Settings',
        noStream: 'Waiting for someone to share',
        noStreamHint: 'Waiting for the owner to share a screen',
        sharingScreen: 'Screen sharing',
        sharingScreenHint: 'Sharing the entire screen',
        you: 'You',
        owner: 'Owner',
        streaming: 'Streaming',
        unknownUser: 'Unknown',
        displaySettings: 'Display settings',
        currentSettings: 'Current display preferences',
        welcomeTitle: 'Screen sharing room',
        roomIdLabel: 'Room ID',
        roomIdTooShort: 'Room ID must be at least {min} characters',
        refreshRoomId: 'Refresh room ID',
        closeRoomWhenOwnerLeaves: 'Close room after owner leaves',
        createOrJoinRoom: 'Create or Join Room',
        createRoom: 'Create Room',
        joinRoom: 'Join Room',
        roomExistsPrompt: 'This room already exists. Join it instead?',
        roomMissingPrompt: 'This room does not exist. Create it instead?',
        joinExistingRoom: 'Join this room',
        createMissingRoom: 'Create this room',
        newRoomId: 'New room ID',
        login: 'Login',
        logout: 'Logout',
        loggedInAs: 'Hello, {user}',
        guest: 'Guest',
        loginTitle: 'Login to Screen Share',
        goBack: 'Back',
        username: 'Username',
        password: 'Password',
        fieldRequired: 'Enter {label}',
        loginFailed: 'Login failed',
        loggedIn: 'Logged in',
        logoutFailed: 'Logout failed',
        loggedOut: 'Logged out',
        roomLeft: 'Left room',
        roomDisconnected: 'Room connection closed',
        roomNotFound: 'Room does not exist or has been closed',
        roomUnauthorized: 'You are not allowed to join this room',
        roomAlreadyExists: 'Room already exists',
        roomAlreadyJoined: 'You are already in a room',
        unknownEvent: 'Unknown event received',
        startShareErrorHttps: 'Could not start sharing. Please make sure HTTPS is enabled.',
        startShareErrorUnsupported:
            'Could not start sharing. This browser does not support screen sharing.',
        startShareError: 'Could not start sharing',
        save: 'Save',
        cancel: 'Cancel',
        preferredCodec: 'Preferred Codec',
        displayMode: 'Display Mode',
        frameRate: 'Frame Rate',
        targetFrameRate: 'Target frame rate',
        frameRateValue: '{value} fps',
        invalidNumber: 'Invalid number',
        minNumber: 'Number must be at least {min}',
        maxNumber: 'Number must be at most {max}',
        decrease: 'Decrease',
        increase: 'Increase',
        shareQuality: 'Share quality',
        qualitySmooth: 'Smooth',
        qualityBalanced: 'Balanced',
        qualitySharp: 'Sharp',
        bestQuality: 'Preset: Best Quality',
        browserDefault: 'Preset: Browser Default',
        modeFitToWindow: 'Fit to Window',
        modeFitWidth: 'Fit Width',
        modeFitHeight: 'Fit Height',
        modeOriginalSize: 'Original Size',
        openGithub: 'GitHub',
        version: 'Version {version}',
        member: 'Member',
        sharingNow: 'Sharing',
        waitingForScreen: 'Waiting for screen share',
        viewerPanel: 'Members',
        expandMembers: 'Expand members',
        collapseMembers: 'Collapse members',
        tabsCount: '{count} tabs',
        roomActions: 'Room actions',
        copyInvite: 'Copy invite link',
        startAnnotation: 'Start annotation',
        annotationLayer: 'Annotation layer',
        screenStage: 'Shared screen',
        brushSize: 'Brush size',
        colorBlue: 'Blue',
        colorGreen: 'Green',
        colorOrange: 'Orange',
        colorRed: 'Red',
        noPreview: 'No other preview',
        localPreview: 'My shared screen',
        currentUser: 'Current user',
        appearance: 'Appearance',
    },
} as const;

export type TranslationKey = keyof typeof translations.zh;

interface I18nContextValue {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

const loadLanguage = (): Language => {
    const stored = localStorage.getItem(LanguageKey);
    return stored === 'en' ? 'en' : 'zh';
};

export const I18nProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    const [language, setLanguageState] = React.useState<Language>(loadLanguage);
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';

    React.useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLanguage = React.useCallback((nextLanguage: Language) => {
        localStorage.setItem(LanguageKey, nextLanguage);
        setLanguageState(nextLanguage);
    }, []);

    const t = React.useCallback(
        (key: TranslationKey, params: Record<string, string | number> = {}) => {
            const template: string = translations[language][key] ?? translations.zh[key];
            return Object.entries(params).reduce<string>(
                (text, [param, value]) =>
                    text.replace(new RegExp(`\\{${param}\\}`, 'g'), value.toString()),
                template
            );
        },
        [language]
    );

    return (
        <AriaI18nProvider locale={locale}>
            <I18nContext.Provider value={{language, setLanguage, t}}>
                {children}
            </I18nContext.Provider>
        </AriaI18nProvider>
    );
};

export const useI18n = (): I18nContextValue => {
    const context = React.useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used inside I18nProvider');
    }
    return context;
};
