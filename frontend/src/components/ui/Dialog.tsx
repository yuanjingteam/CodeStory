'use client';

import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import Button from './Button';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  closeLabel?: string;
  closeDisabled?: boolean;
  closeOnOverlay?: boolean;
  bodyClassName?: string;
  contentClassName?: string;
}

const sizeStyles: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel = '关闭弹窗',
  closeDisabled = false,
  closeOnOverlay = true,
  bodyClassName = '',
  contentClassName = '',
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-zinc-950/55 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 motion-reduce:transition-none" />
        <DialogPrimitive.Content
          onPointerDownOutside={(event) => {
            if (!closeOnOverlay) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (closeDisabled) {
              event.preventDefault();
            }
          }}
          className={[
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)]',
            '-translate-x-1/2 -translate-y-1/2 flex-col border-2 border-zinc-950 bg-white',
            'shadow-[6px_6px_0_0_#18181b] focus:outline-none',
            sizeStyles[size],
            contentClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-zinc-950 p-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-xl font-black text-zinc-950">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                className={
                  description
                    ? 'mt-1 text-sm leading-6 text-zinc-600'
                    : 'sr-only'
                }
              >
                {description ?? '请完成当前弹窗中的操作。'}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="secondary"
                size="icon"
                disabled={closeDisabled}
                aria-label={closeLabel}
                className="shrink-0"
              >
                <FiX className="size-5" aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </header>

          <div
            className={`min-h-0 flex-1 overflow-y-auto p-6 ${bodyClassName}`}
          >
            {children}
          </div>

          {footer ? (
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t-2 border-zinc-950 p-4">
              {footer}
            </footer>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
