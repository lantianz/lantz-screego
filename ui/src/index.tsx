import React from 'react';
import ReactDOM from 'react-dom/client';
import {Toast} from '@heroui/react';
import './global.css';
import {Router} from './Router';
import {I18nProvider} from './i18n';

ReactDOM.createRoot(document.getElementById('root')!!).render(
    <React.StrictMode>
        <I18nProvider>
            <Toast.Provider placement="bottom end" />
            <Router />
        </I18nProvider>
    </React.StrictMode>
);
