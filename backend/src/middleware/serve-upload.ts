import type { NextFunction, Request, Response } from 'express';
import { getOSSClient, isOSSConfigured } from '../config/oss';

function isMissingObject(error: unknown): boolean {
  const ossError = error as { status?: number; code?: string };
  return ossError.status === 404 || ossError.code === 'NoSuchKey';
}

export async function serveUploadFromOSS(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isOSSConfigured()) {
    next();
    return;
  }

  const objectKey = `uploads${req.path}`;
  if (!/^uploads\/(?:avatars|courses)\/[A-Za-z0-9._-]+$/.test(objectKey)) {
    res.sendStatus(404);
    return;
  }

  try {
    const result = await getOSSClient().get(objectKey);
    const contentType = result.res.headers['content-type'];
    const etag = result.res.headers.etag;

    if (contentType) res.setHeader('Content-Type', contentType);
    if (etag) res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.send(result.content);
  } catch (error) {
    if (isMissingObject(error)) {
      next();
      return;
    }
    next(error);
  }
}
