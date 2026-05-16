'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export function useAuth() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useUserStore();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/auth/login');
    }
  }, [router, isLoggedIn, isLoading]);
}
