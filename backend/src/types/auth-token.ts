export interface AccessTokenClaims {
  userId: string;
  email: string;
  role: number;
  sessionId: string;
}

export interface RefreshTokenClaims {
  userId: string;
  sessionId: string;
  tokenId: string;
}

export interface VerifiedAccessToken {
  sub: string;
  email: string;
  role: number;
  sessionId: string;
  type: 'access';
  iat: number;
  exp: number;
}

export interface VerifiedRefreshToken {
  sub: string;
  sessionId: string;
  tokenId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface IssuedToken {
  token: string;
  expiresAt: string;
}
