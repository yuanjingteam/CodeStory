import pino from 'pino';
import pinoHttp from 'pino-http';
import { getTraceId } from '../middleware/request-context';

export const logger = pino({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'test'
      ? 'silent'
      : process.env.NODE_ENV === 'production'
        ? 'info'
        : 'debug'),
  base: undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'token',
      '*.token',
      'apiKey',
      '*.apiKey',
      'prompt',
      '*.prompt',
    ],
    censor: '[REDACTED]',
  },
  mixin() {
    const traceId = getTraceId();
    return traceId ? { trace_id: traceId } : {};
  },
});

export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
  },
});
