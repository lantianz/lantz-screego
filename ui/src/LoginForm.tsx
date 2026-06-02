import React from 'react';
import {Button, FieldError, Form, Input, Label, TextField} from '@heroui/react';
import {ArrowLeft, ArrowRightToSquare} from '@gravity-ui/icons';
import {UseConfig} from './useConfig';
import {useI18n} from './i18n';

export const LoginForm = ({config: {login}, hide}: {config: UseConfig; hide?: () => void}) => {
    const {t} = useI18n();
    const [user, setUser] = React.useState('');
    const [pass, setPass] = React.useState('');
    const [userError, setUserError] = React.useState('');
    const [passError, setPassError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const username = user.trim();
        const nextUserError = username ? '' : t('fieldRequired', {label: t('username')});
        const nextPassError = pass ? '' : t('fieldRequired', {label: t('password')});
        setUserError(nextUserError);
        setPassError(nextPassError);
        if (nextUserError || nextPassError) {
            return;
        }
        setLoading(true);
        try {
            await login(username, pass);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form onSubmit={submit} className="grid gap-4">
            <TextField
                isInvalid={!!userError}
                value={user}
                onChange={(value) => {
                    setUser(value);
                    if (userError && value.trim()) {
                        setUserError('');
                    }
                }}
            >
                <Label>{t('username')}</Label>
                <Input autoComplete="username" />
                {userError ? <FieldError>{userError}</FieldError> : null}
            </TextField>
            <TextField
                isInvalid={!!passError}
                value={pass}
                onChange={(value) => {
                    setPass(value);
                    if (passError && value) {
                        setPassError('');
                    }
                }}
            >
                <Label>{t('password')}</Label>
                <Input autoComplete="current-password" type="password" />
                {passError ? <FieldError>{passError}</FieldError> : null}
            </TextField>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button fullWidth isPending={loading} type="submit">
                    <ArrowRightToSquare />
                    {t('login')}
                </Button>
                {hide ? (
                    <Button fullWidth type="button" variant="secondary" onPress={hide}>
                        <ArrowLeft />
                        {t('goBack')}
                    </Button>
                ) : undefined}
            </div>
        </Form>
    );
};
