import { useUserStore } from '@/store/useUserStore';


export interface JwtPayload {
  id?: string;
  sub?: string;
  email: string;
  role: number; 
  iat?: number;
  exp?: number;
}


export function getToken(): string | null {
  return useUserStore.getState().token;
}
export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

export function isTokenValid(token: string): boolean {
  if (!token) {
    return false;
  }

  if (isTokenExpired(token)) {
    return false;
  }
  return true;
}

export function getTokenPayload(): JwtPayload | null {
  const token = getToken();
  if (!token) {
    return null;
  }

  return parseJwt(token);
}

export function isUserLoggedIn(): boolean {
  const token = getToken();
  return isTokenValid(token || '');
}
