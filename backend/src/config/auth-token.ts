import 'dotenv/config';
import type { Algorithm } from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_SLIDING_TTL_SECONDS,
} from '@/config/auth-session';

export interface AuthTokenConfig {
  accessSecret: string;
  refreshSecret: string;
  algorithm: Algorithm;
  issuer: string;
  audience: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

function getSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const secret = process.env[name]?.trim() || process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(`${name} 未配置`);
  }

  return secret;
}

export function getAuthTokenConfig(): AuthTokenConfig {
  return {
    accessSecret: getSecret('JWT_ACCESS_SECRET'),
    refreshSecret: getSecret('JWT_REFRESH_SECRET'),
    algorithm: 'HS256',
    issuer: 'codestory-api',
    audience: 'codestory-web',
    accessTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTtlSeconds: REFRESH_SLIDING_TTL_SECONDS,
  };
}
