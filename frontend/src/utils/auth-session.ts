import axios from 'axios';
import type {
  ApiResponse,
  LoginUserInfo,
  LoginResponse,
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
let synchronizationPromise: Promise<void> | null = null;
let hasShownExpiredMessage = false;

const AUTH_SYNC_CHANNEL_NAME = 'codestory-auth';
const AUTH_SYNC_STORAGE_KEY = 'codestory-auth-event';
const AUTH_REFRESH_LOCK_NAME = 'codestory-auth-refresh';

export type AuthSessionChange =
  | { type: 'signed-in'; session?: LoginResponse }
  | {
      type: 'access-token-updated';
      accessToken: string;
      accessExpiresAt: string;
    }
  | { type: 'signed-out' };

function isAuthSessionChange(value: unknown): value is AuthSessionChange {
  if (!value || typeof value !== 'object') return false;

  const change = value as { type?: unknown; session?: unknown };
  if (change.type === 'signed-out') return true;
  if (change.type === 'access-token-updated') {
    const tokenChange = change as {
      accessToken?: unknown;
      accessExpiresAt?: unknown;
    };
    return (
      typeof tokenChange.accessToken === 'string' &&
      typeof tokenChange.accessExpiresAt === 'string'
    );
  }
  if (change.type !== 'signed-in') return false;
  if (change.session === undefined) return true;
  if (!change.session || typeof change.session !== 'object') return false;

  const session = change.session as Partial<LoginResponse>;
  return (
    typeof session.accessToken === 'string' &&
    typeof session.accessExpiresAt === 'string' &&
    Boolean(session.user) &&
    typeof session.user === 'object'
  );
}

export function publishAuthSessionChange(change: AuthSessionChange): void {
  if (typeof window === 'undefined') return;

  if ('BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
      channel.postMessage(change);
      channel.close();
      return;
    } catch {
      // BroadcastChannel 不可用时回退到不包含 Token 的 storage 事件。
    }
  }

  try {
    localStorage.setItem(
      AUTH_SYNC_STORAGE_KEY,
      JSON.stringify({
        type: change.type,
        nonce: `${Date.now()}-${Math.random()}`,
      })
    );
    localStorage.removeItem(AUTH_SYNC_STORAGE_KEY);
  } catch {
    // 浏览器禁用本地存储时，保留当前标签页内的正常登录流程。
  }
}

export function subscribeToAuthSessionChanges(
  listener: (change: AuthSessionChange) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  if ('BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (isAuthSessionChange(event.data)) {
          listener(event.data);
        }
      };
      return () => channel.close();
    } catch {
      // BroadcastChannel 初始化失败时使用 storage 事件。
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return;

    try {
      const value: unknown = JSON.parse(event.newValue);
      if (isAuthSessionChange(value)) {
        if (value.type === 'signed-in') {
          listener({ type: 'signed-in' });
        } else if (value.type === 'signed-out') {
          listener({ type: 'signed-out' });
        }
      }
    } catch {
      // 忽略其他页面写入的无效事件。
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

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
  publishAuthSessionChange({
    type: 'access-token-updated',
    accessToken: result.accessToken,
    accessExpiresAt: result.accessExpiresAt,
  });
  return result;
}

async function requestCoordinatedAccessToken(): Promise<RefreshResponse> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return requestNewAccessToken();
  }

  const tokenBeforeLock = useUserStore.getState().token;
  return navigator.locks.request(AUTH_REFRESH_LOCK_NAME, async () => {
    const store = useUserStore.getState();
    if (
      store.token &&
      store.accessExpiresAt &&
      store.token !== tokenBeforeLock
    ) {
      return {
        accessToken: store.token,
        accessExpiresAt: store.accessExpiresAt,
      };
    }

    return requestNewAccessToken();
  });
}

export function refreshAccessToken(): Promise<RefreshResponse> {
  if (!refreshPromise) {
    refreshPromise = requestCoordinatedAccessToken().finally(() => {
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
    const store = useUserStore.getState();
    if (!store.isLoggedIn) {
      store.clearUser();
    }
  }
}

export function initializeAuthSession(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = synchronizeAuthSession();
  }

  return initializationPromise;
}

export function synchronizeAuthSession(): Promise<void> {
  if (!synchronizationPromise) {
    synchronizationPromise = restoreSessionFromRefreshToken().finally(() => {
      synchronizationPromise = null;
    });
  }

  return synchronizationPromise;
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
  publishAuthSessionChange({ type: 'signed-out' });

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
