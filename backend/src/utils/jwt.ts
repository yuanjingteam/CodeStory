import jwt, { type SignOptions } from 'jsonwebtoken';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REMEMBER_EXPIRES_IN,
} from '@/config/jwt';

export interface TokenPayload {
  id: string; // 统一为 id
  email: string;
  role: number; // 添加 role
  iat?: number;
  exp?: number;
}

export const generateToken = (
  payload: TokenPayload,
  rememberMe?: boolean
): string => {
  const expiresIn: SignOptions['expiresIn'] = rememberMe
    ? JWT_REMEMBER_EXPIRES_IN
    : JWT_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
