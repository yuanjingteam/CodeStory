'use client';

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'ghost';

type ButtonSize = 'sm' | 'md' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border-zinc-950 bg-yellow-400 text-zinc-950 shadow-[3px_3px_0_0_#18181b] hover:bg-yellow-300',
  secondary:
    'border-zinc-950 bg-white text-zinc-950 shadow-[3px_3px_0_0_#18181b] hover:bg-zinc-100',
  danger:
    'border-zinc-950 bg-red-500 text-white shadow-[3px_3px_0_0_#18181b] hover:bg-red-600',
  success:
    'border-zinc-950 bg-green-500 text-white shadow-[3px_3px_0_0_#18181b] hover:bg-green-600',
  ghost:
    'border-transparent bg-transparent text-zinc-700 shadow-none hover:bg-zinc-100 hover:text-zinc-950',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-10 px-5 py-2',
  icon: 'size-9 p-0',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 border-2 font-bold',
        'transition-[transform,box-shadow,background-color,color,opacity] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2',
        'enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      {loading && loadingText ? loadingText : children}
      {!loading ? rightIcon : null}
    </button>
  );
});

export default Button;
