'use client';

import type { ReactNode } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { FiAlertTriangle, FiInfo } from 'react-icons/fi';
import Button from './Button';

type AlertDialogVariant = 'danger' | 'warning' | 'info';

interface AlertDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

const iconStyles: Record<AlertDialogVariant, string> = {
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-200 text-zinc-950',
  info: 'bg-sky-100 text-sky-700',
};

export default function AlertDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  loading = false,
  onConfirm,
  onOpenChange,
}: AlertDialogProps) {
  const Icon = variant === 'info' ? FiInfo : FiAlertTriangle;

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-zinc-950/55" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 border-2 border-zinc-950 bg-white p-5 shadow-[6px_6px_0_0_#18181b] focus:outline-none">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center border-2 border-zinc-950 ${iconStyles[variant]}`}
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <AlertDialogPrimitive.Title className="text-xl font-black text-zinc-950">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-2 leading-7 text-zinc-700">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary" disabled={loading}>
                {cancelText}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                loading={loading}
                loadingText="处理中..."
                onClick={onConfirm}
              >
                {confirmText}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
