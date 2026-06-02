import React from 'react';
import {Description, Label, NumberField as HeroNumberField} from '@heroui/react';
import {useI18n} from './i18n';

export interface NumberFieldProps {
    value: number;
    min: number;
    label: string;
    onChange: (value: number) => void;
}

export const NumberField = ({value, min, label, onChange}: NumberFieldProps) => {
    const {t} = useI18n();
    const [error, setError] = React.useState('');

    return (
        <HeroNumberField
            minValue={min}
            value={value}
            onChange={(nextValue) => {
                if (typeof nextValue !== 'number' || Number.isNaN(nextValue)) {
                    setError(t('invalidNumber'));
                    return;
                }
                if (nextValue < min) {
                    setError(t('minNumber', {min}));
                    return;
                }
                setError('');
                onChange(nextValue);
            }}
        >
            <Label>{label}</Label>
            <HeroNumberField.Group>
                <HeroNumberField.DecrementButton aria-label={`${t('decrease')} ${label}`} />
                <HeroNumberField.Input />
                <HeroNumberField.IncrementButton aria-label={`${t('increase')} ${label}`} />
            </HeroNumberField.Group>
            {error ? (
                <Description className="text-danger-soft-foreground">{error}</Description>
            ) : null}
        </HeroNumberField>
    );
};
