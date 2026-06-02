import {RoomMode, UIConfig} from './message';
import React from 'react';
import {urlWithSlash} from './url';
import {useI18n} from './i18n';
import {notify} from './notify';

export interface UseConfig extends UIConfig {
    login: (username: string, password: string) => Promise<void>;
    refetch: () => void;
    logout: () => Promise<void>;
    loading: boolean;
}

export const useConfig = (): UseConfig => {
    const {t} = useI18n();
    const [{loading, ...config}, setConfig] = React.useState<UIConfig & {loading: boolean}>({
        authMode: 'all',
        user: 'guest',
        loggedIn: false,
        loading: true,
        version: 'unknown',
        roomName: 'unknown',
        closeRoomWhenOwnerLeaves: true,
    });

    const refetch = React.useCallback(async () => {
        return fetch(`${urlWithSlash}config`)
            .then((data) => data.json())
            .then(setConfig);
    }, [setConfig]);

    const login = async (username: string, password: string) => {
        const body = new FormData();
        body.set('user', username);
        body.set('pass', password);
        const result = await fetch(`${urlWithSlash}login`, {method: 'POST', body});
        const json = await result.json();
        if (result.status !== 200) {
            console.log('Login failed', json.message);
            notify(t('loginFailed'), {variant: 'error'});
        } else {
            await refetch();
            notify(t('loggedIn'), {variant: 'success'});
        }
    };

    const logout = async () => {
        const result = await fetch(`${urlWithSlash}logout`, {method: 'POST'});
        if (result.status !== 200) {
            console.log('Logout failed', await result.text());
            notify(t('logoutFailed'), {variant: 'error'});
        } else {
            await refetch();
            notify(t('loggedOut'), {variant: 'success'});
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => void refetch(), []);

    return {...config, refetch, loading, login, logout};
};

export const authModeToRoomMode = (authMode: UIConfig['authMode'], loggedIn: boolean): RoomMode => {
    if (loggedIn) {
        return RoomMode.Turn;
    }
    switch (authMode) {
        case 'all':
            return RoomMode.Turn;
        case 'turn':
            return RoomMode.Stun;
        case 'none':
        default:
            return RoomMode.Turn;
    }
};
