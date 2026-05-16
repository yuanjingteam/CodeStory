import { toast } from 'sonner';

const baseClassName = '!bg-green-400 !text-black !border-2 !border-black !rounded-none !font-black !shadow-[6px_6px_0_0_rgba(0,0,0,1)]';

export const showToast = {
  success: (msg: string) =>
    toast.success(msg, {
      className: baseClassName,
    }),

  error: (msg: string) =>
    toast.error(msg, {
      className: '!bg-red-400 !text-black !border-2 !border-black !rounded-none !font-black !shadow-[6px_6px_0_0_rgba(0,0,0,1)]',
    }),

  warning: (msg: string) =>
    toast.warning(msg, {
      className: '!bg-yellow-400 !text-black !border-2 !border-black !rounded-none !font-black !shadow-[6px_6px_0_0_rgba(0,0,0,1)]',
    }),

  info: (msg: string) =>
    toast.info(msg, {
      className: '!bg-blue-400 !text-black !border-2 !border-black !rounded-none !font-black !shadow-[6px_6px_0_0_rgba(0,0,0,1)]',
    }),
};
