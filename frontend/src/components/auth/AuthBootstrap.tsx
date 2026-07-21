'use client';

import { useEffect } from 'react';
import {
  handleAuthenticationFailure,
  initializeAuthSession,
  isRefreshSessionExpired,
  refreshAccessToken,
} from '@/utils/auth-session';
import { useUserStore } from '@/store/useUserStore';

const REFRESH_EARLY_MS = 60 * 1000;

export default function AuthBootstrap() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const accessExpiresAt = useUserStore((state) => state.accessExpiresAt);

  useEffect(() => {
    void initializeAuthSession();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !accessExpiresAt) return;

    const expiresAtMs = Date.parse(accessExpiresAt);
    if (Number.isNaN(expiresAtMs)) return;

    const delay = Math.max(expiresAtMs - Date.now() - REFRESH_EARLY_MS, 0);
    const timer = window.setTimeout(async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        if (isRefreshSessionExpired(error)) {
          handleAuthenticationFailure();
        }
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [accessExpiresAt, isLoggedIn]);

  return null;
}
