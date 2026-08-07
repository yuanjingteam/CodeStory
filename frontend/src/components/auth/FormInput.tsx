'use client';

import { useId } from 'react';
import { LuEye, LuEyeClosed } from 'react-icons/lu';
import { IoCheckmark, IoClose } from 'react-icons/io5';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

interface FormInputProps {
  label: string;
  type?: string;
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
}: FormInputProps) {
  const inputId = useId();
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
            className="absolute right-9 top-1/2 size-8 min-h-0 -translate-y-1/2 border-0"
          >
            {showPassword ? (
              <LuEye className="size-5" aria-hidden="true" />
            ) : (
              <LuEyeClosed className="size-5" aria-hidden="true" />
            )}
          </Button>
        ) : null}

        {touched && (success || error) ? (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${
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
