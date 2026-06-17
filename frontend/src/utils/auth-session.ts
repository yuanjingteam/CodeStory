import axios from 'axios';
import type {
  ApiResponse,
  LoginUserInfo,
  RefreshResponse,
} from '@/types/auth';
import { useUserStore } from '@/store/useUserStore';
import { showToast } from './toast';

const authClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`,
  timeout: 5000,
  withCredentials: true,
});

let refreshPromise: Promise<RefreshResponse> | null = null;
let initializationPromise: Promise<void> | null = null;
let hasShownExpiredMessage = false;

async function requestNewAccessToken(): Promise<RefreshResponse> {
  const response = await authClient.post<ApiResponse<RefreshResponse>>(
    '/auth/refresh'
  );
  const result = response.data.data;

  if (!result?.accessToken || !result.accessExpiresAt) {
    throw new Error('刷新接口没有返回有效的 Access Token');
  }

  useUserStore
    .getState()
    .setAccessToken(result.accessToken, result.accessExpiresAt);
  return result;
}

export function refreshAccessToken(): Promise<RefreshResponse> {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function isRefreshSessionExpired(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

async function restoreSessionFromRefreshToken(): Promise<void> {
  try {
    localStorage.removeItem('user-storage');
    localStorage.removeItem('code-story-token');

    const refreshed = await refreshAccessToken();
    const response = await authClient.get<ApiResponse<LoginUserInfo>>(
      '/auth/me',
      {
        headers: {
          Authorization: `Bearer ${refreshed.accessToken}`,
        },
      }
    );

    useUserStore.getState().restoreSession(
      refreshed.accessToken,
      refreshed.accessExpiresAt,
      response.data.data
    );
  } catch {
    useUserStore.getState().clearUser();
  }
}

export function initializeAuthSession(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = restoreSessionFromRefreshToken();
  }

  return initializationPromise;
}

export function getSafeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

export function handleAuthenticationFailure(): void {
  const { isLoggedIn, clearUser } = useUserStore.getState();
  clearUser();

  if (typeof window === 'undefined') return;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const isAuthPage = window.location.pathname.startsWith('/auth/');

  if (isLoggedIn && !hasShownExpiredMessage) {
    hasShownExpiredMessage = true;
    showToast.warning('登录已过期，请重新登录');
  }

  if (!isAuthPage) {
    const redirect = encodeURIComponent(currentPath);
    window.location.assign(`/auth/login?redirect=${redirect}`);
  }
}
