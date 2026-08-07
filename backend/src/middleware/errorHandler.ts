import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
}

const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;

  logger.error(
    { err, method: req.method, path: req.path },
    'Unhandled request error'
  );

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      type: err.name || 'internal_error',
    },
  });
};

export default errorHandler;
