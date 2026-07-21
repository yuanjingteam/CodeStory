import 'dotenv/config';
import type { CorsOptions } from 'cors';

function getAllowedOrigins(): Set<string> {
  const configuredOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(configuredOrigins || []);
}

const allowedOrigins = getAllowedOrigins();

export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }

    callback(null, allowedOrigins.has(origin));
  },
};
