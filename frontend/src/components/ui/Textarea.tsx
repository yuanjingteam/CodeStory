import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid = false, className = '', ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={[
          'w-full resize-y border-2 border-zinc-950 bg-white px-3 py-2 font-medium text-zinc-950 outline-none',
          'transition-[box-shadow,border-color,background-color] duration-150',
          'placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500',
          'aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-200',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    );
  }
);

export default Textarea;
