'use client';

import {
  useId,
  type HTMLInputTypeAttribute,
  type InputHTMLAttributes,
} from 'react';
import { LuEye, LuEyeClosed } from 'react-icons/lu';
import { IoCheckmark, IoClose } from 'react-icons/io5';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

interface FormInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'onBlur'
  > {
  label: string;
  type?: HTMLInputTypeAttribute;
  value: string;
  placeholder?: string;
  error?: string;
  success?: boolean;
  touched?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export default function FormInput({
  label,
  type = 'text',
  value,
  placeholder,
  error,
  success,
  touched,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  onChange,
  onBlur,
  id,
  ...inputProps
}: FormInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const visibleError = touched ? error : undefined;

  return (
    <Field
      label={label}
      htmlFor={inputId}
      error={visibleError}
    >
      <div className="relative">
        <Input
          id={inputId}
          {...inputProps}
          type={
            showPasswordToggle ? (showPassword ? 'text' : 'password') : type
          }
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          invalid={Boolean(visibleError)}
          aria-describedby={visibleError ? `${inputId}-error` : undefined}
          className={showPasswordToggle ? 'pr-20' : 'pr-11'}
        />

        {showPasswordToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onTogglePassword}
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 size-9 min-h-0 -translate-y-1/2 border-0 active:translate-x-0 active:-translate-y-1/2"
          >
            {showPassword ? (
              <LuEyeClosed className="size-5" aria-hidden="true" />
            ) : (
              <LuEye className="size-5" aria-hidden="true" />
            )}
          </Button>
        ) : null}

        {touched && (success || error) ? (
          <span
            className={`absolute top-1/2 -translate-y-1/2 ${
              showPasswordToggle ? 'right-12' : 'right-3'
            } ${
              error ? 'text-red-600' : 'text-green-600'
            }`}
            aria-hidden="true"
          >
            {error ? (
              <IoClose className="size-5" />
            ) : (
              <IoCheckmark className="size-5" />
            )}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
