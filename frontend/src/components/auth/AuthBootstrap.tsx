'use client';

import { useEffect } from 'react';
import {
  getSafeRedirectPath,
  handleAuthenticationFailure,
  initializeAuthSession,
  isRefreshSessionExpired,
  refreshAccessToken,
  subscribeToAuthSessionChanges,
  synchronizeAuthSession,
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
    const redirectFromAuthPage = () => {
      if (!window.location.pathname.startsWith('/auth/')) return;

      const redirect = getSafeRedirectPath(
        new URLSearchParams(window.location.search).get('redirect')
      );
      window.location.replace(redirect);
    };

    const synchronizeAndRedirect = async () => {
      await synchronizeAuthSession();
      if (useUserStore.getState().isLoggedIn) {
        redirectFromAuthPage();
      }
    };

    const unsubscribe = subscribeToAuthSessionChanges((change) => {
      if (change.type === 'signed-out') {
        useUserStore.getState().clearUser();
        return;
      }

      if (change.type === 'access-token-updated') {
        useUserStore
          .getState()
          .setAccessToken(change.accessToken, change.accessExpiresAt);
        return;
      }

      if (change.session) {
        useUserStore.getState().addUser(change.session);
        redirectFromAuthPage();
        return;
      }

      void synchronizeAndRedirect();
    });

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !useUserStore.getState().isLoggedIn
      ) {
        void synchronizeAndRedirect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
