'use client';
import { FiX, FiAlertTriangle } from 'react-icons/fi';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    bg: 'bg-red-500',
    text: 'text-white',
    icon: 'text-red-500',
  },
  warning: {
    bg: 'bg-yellow-400',
    text: 'text-black',
    icon: 'text-yellow-500',
  },
  info: {
    bg: 'bg-blue-400',
    text: 'text-white',
    icon: 'text-blue-400',
  },
};

export default function ConfirmDialog({
  open,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b-2 border-black">
          <FiAlertTriangle className={`w-6 h-6 ${style.icon}`} />
          <h2 className="text-xl font-bold flex-1">{title}</h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-gray-100 font-bold"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 p-4 border-t-2 border-black justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 border-2 border-black font-bold hover:bg-gray-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 ${style.bg} ${style.text} font-bold border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
