'use client';

import { usePathname } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoading = useUserStore((state) => state.isLoading);
  const isAuthPage = pathname.startsWith('/auth/');

  if (isLoading && !isAuthPage) {
    return (
      <div
        className="flex min-h-[calc(100dvh-1.5rem)] items-center justify-center p-6"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-5xl border-2 border-black bg-yellow-50 p-6 shadow-[4px_4px_0_0_#18181b]">
          <div className="h-6 w-32 animate-pulse bg-yellow-300 motion-reduce:animate-none" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="h-36 animate-pulse bg-zinc-100 motion-reduce:animate-none" />
            <div className="h-36 animate-pulse bg-zinc-100 motion-reduce:animate-none" />
          </div>
          <span className="sr-only">正在恢复登录状态...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
