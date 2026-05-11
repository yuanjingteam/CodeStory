import type { SignOptions } from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'codestory_secret';

export const JWT_EXPIRES_IN: SignOptions['expiresIn'] = '7d';

export const JWT_REMEMBER_EXPIRES_IN: SignOptions['expiresIn'] = '30d';
