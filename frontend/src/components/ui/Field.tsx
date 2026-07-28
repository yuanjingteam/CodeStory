import type { ReactNode } from 'react';

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  helperText?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Field({
  label,
  htmlFor,
  required = false,
  helperText,
  error,
  children,
  className = '',
}: FieldProps) {
  const descriptionId = htmlFor
    ? `${htmlFor}-${error ? 'error' : 'description'}`
    : undefined;

  return (
    <div className={`grid gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-bold text-zinc-800">
        {label}
        {required ? (
          <>
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
            <span className="sr-only">（必填）</span>
          </>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={descriptionId} className="text-sm font-bold text-red-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={descriptionId} className="text-sm text-zinc-600">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
