'use client';

import { usePathname } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoading = useUserStore((state) => state.isLoading);
  const isAuthPage = pathname.startsWith('/auth/');

  if (isLoading && !isAuthPage) {
    return (
      <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center text-sm font-bold text-gray-500">
        加载中...
      </div>
    );
  }

  return <>{children}</>;
}
