import {toast} from '@heroui/react';

export type NotifyVariant = 'success' | 'error' | 'info' | 'warning';

export const notify = (
    message: string,
    options: {variant?: NotifyVariant; persist?: boolean; description?: string} = {}
) => {
    const timeout = options.persist ? 0 : undefined;
    switch (options.variant) {
        case 'success':
            toast.success(message, {description: options.description, timeout});
            return;
        case 'error':
            toast.danger(message, {description: options.description, timeout});
            return;
        case 'warning':
            toast.warning(message, {description: options.description, timeout});
            return;
        case 'info':
            toast.info(message, {description: options.description, timeout});
            return;
        default:
            toast(message, {description: options.description, timeout});
    }
};
