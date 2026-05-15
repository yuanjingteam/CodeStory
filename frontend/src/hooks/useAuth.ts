'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('code-story-token');
    if (!token) {
      router.replace('/auth/login');
    }
  }, [router]);
}
