import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  traceId: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();
const TRACE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function resolveTraceId(req: Request): string {
  const supplied = req.header('x-request-id')?.trim();
  return supplied && TRACE_ID_PATTERN.test(supplied)
    ? supplied
    : randomUUID();
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const traceId = resolveTraceId(req);
  res.setHeader('x-trace-id', traceId);
  requestContextStorage.run({ traceId }, next);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getTraceId(): string | undefined {
  return getRequestContext()?.traceId;
}

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T
): T {
  return requestContextStorage.run(context, callback);
}
