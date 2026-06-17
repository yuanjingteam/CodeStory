export interface AuthSession {
  sessionId: string;
  userId: string;
  currentTokenId: string;
  refreshTokenHash: string;
  rememberMe: boolean;
  createdAt: string;
  lastRefreshedAt: string;
  refreshExpiresAt: string;
  sessionExpiresAt: string;
  revokedAt: string | null;
}

export interface AuthSessionTimes {
  createdAt: string;
  refreshExpiresAt: string;
  sessionExpiresAt: string;
}
