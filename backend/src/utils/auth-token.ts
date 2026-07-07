import { createHash, timingSafeEqual } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { getAuthTokenConfig } from '@/config/auth-token';
import type {
  AccessTokenClaims,
  IssuedToken,
  RefreshTokenClaims,
  VerifiedAccessToken,
  VerifiedRefreshToken,
} from '@/types/auth-token';

type VerifiedBasePayload = JwtPayload & {
  sub: string;
  iat: number;
  exp: number;
};

function isBasePayload(
  payload: string | JwtPayload
): payload is VerifiedBasePayload {
  return (
    typeof payload !== 'string' &&
    typeof payload.sub === 'string' &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number'
  );
}

function getExpiresAt(token: string): string {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
    throw new Error('签发的 Token 缺少过期时间');
  }

  return new Date(decoded.exp * 1_000).toISOString();
}

export function issueAccessToken(claims: AccessTokenClaims): IssuedToken {
  const config = getAuthTokenConfig();
  const token = jwt.sign(
    {
      email: claims.email,
      role: claims.role,
      sessionId: claims.sessionId,
      type: 'access',
    },
    config.accessSecret,
    {
      algorithm: config.algorithm,
      audience: config.audience,
      issuer: config.issuer,
      subject: claims.userId,
      expiresIn: config.accessTtlSeconds,
    }
  );

  return {
    token,
    expiresAt: getExpiresAt(token),
  };
}

export function issueRefreshToken(
  claims: RefreshTokenClaims,
  expiresInSeconds?: number
): IssuedToken {
  const config = getAuthTokenConfig();
  const token = jwt.sign(
    {
      sessionId: claims.sessionId,
      tokenId: claims.tokenId,
      type: 'refresh',
    },
    config.refreshSecret,
    {
      algorithm: config.algorithm,
      audience: config.audience,
      issuer: config.issuer,
      subject: claims.userId,
      jwtid: claims.tokenId,
      expiresIn: expiresInSeconds ?? config.refreshTtlSeconds,
    }
  );

  return {
    token,
    expiresAt: getExpiresAt(token),
  };
}

export function verifyAccessToken(token: string): VerifiedAccessToken {
  const config = getAuthTokenConfig();
  const payload = jwt.verify(token, config.accessSecret, {
    algorithms: [config.algorithm],
    audience: config.audience,
    issuer: config.issuer,
  });

  if (
    !isBasePayload(payload) ||
    payload.type !== 'access' ||
    typeof payload.email !== 'string' ||
    typeof payload.role !== 'number' ||
    typeof payload.sessionId !== 'string'
  ) {
    throw new jwt.JsonWebTokenError('Access Token 内容无效');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
    type: 'access',
    iat: payload.iat,
    exp: payload.exp,
  };
}

export function verifyRefreshToken(token: string): VerifiedRefreshToken {
  return verifyRefreshTokenWithOptions(token, false);
}

export function verifyRefreshTokenIgnoringExpiration(
  token: string
): VerifiedRefreshToken {
  return verifyRefreshTokenWithOptions(token, true);
}

function verifyRefreshTokenWithOptions(
  token: string,
  ignoreExpiration: boolean
): VerifiedRefreshToken {
  const config = getAuthTokenConfig();
  const payload = jwt.verify(token, config.refreshSecret, {
    algorithms: [config.algorithm],
    audience: config.audience,
    issuer: config.issuer,
    ignoreExpiration,
  });

  if (
    !isBasePayload(payload) ||
    payload.type !== 'refresh' ||
    typeof payload.sessionId !== 'string' ||
    typeof payload.tokenId !== 'string' ||
    payload.jti !== payload.tokenId
  ) {
    throw new jwt.JsonWebTokenError('Refresh Token 内容无效');
  }

  return {
    sub: payload.sub,
    sessionId: payload.sessionId,
    tokenId: payload.tokenId,
    type: 'refresh',
    iat: payload.iat,
    exp: payload.exp,
  };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function matchesRefreshTokenHash(
  token: string,
  expectedHash: string
): boolean {
  const actualHashBuffer = Buffer.from(hashRefreshToken(token), 'hex');
  const expectedHashBuffer = Buffer.from(expectedHash, 'hex');

  if (actualHashBuffer.length !== expectedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualHashBuffer, expectedHashBuffer);
}
