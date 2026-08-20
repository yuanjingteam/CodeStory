// components/common/ErrorDataCard.tsx

import { ReactNode } from 'react';

interface ErrorDataCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: 'empty' | 'error' | 'auth' | 'loading';
  className?: string;
}

export default function ErrorDataCard({
  title = '暂无数据',
  description = '当前没有可展示的信息',
  icon,
  action,
  variant = 'empty',
  className = '',
}: ErrorDataCardProps) {
  const variantStyles = {
    empty: 'border-zinc-300 bg-white',
    error: 'border-red-600 bg-red-50',
    auth: 'border-yellow-500 bg-yellow-50',
    loading: 'border-zinc-300 bg-zinc-50',
  }[variant];

  return (
    <div
      className={`m-4 flex-1 border-2 border-dashed p-5 ${variantStyles} ${className}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-busy={variant === 'loading' || undefined}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {icon}
        <h3 className={`${icon ? 'mt-4' : ''} text-lg font-black text-zinc-800`}>
          {title}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-6 text-zinc-600">
          {description}
        </p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
