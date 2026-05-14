import { Response } from 'express';

// 统一成功返回
export function success(res: Response, data: any, message = 'success') {
  return res.json({ code: 200, message, data });
}

// 统一失败返回
export function fail(
  res: Response,
  message = '服务器错误',
  code = 500,
  data = null
) {
  return res.status(code).json({ code, message, data });
}

// 404
export function notFound(res: Response, message = '资源不存在') {
  return fail(res, message, 404);
}