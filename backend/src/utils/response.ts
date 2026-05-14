export function success(res: any, data: any) {
  return res.json({
    code: 200,
    message: 'success',
    data,
  });
}

export function fail(res: any, message: string = '服务器错误') {
  return res.json({
    code: 500,
    message,
    data: null,
  });
}

export function notFound(res: any, message: string = '资源不存在') {
  return res.json({
    code: 404,
    message,
    data: null,
  });
}

// 辅助函数：处理错误响应
export function badRequest(res: any, message: string = '请求参数错误') {
  return res.json({
    code: 400,
    message,
    data: null,
  });
}

// 辅助函数：处理服务器错误
export function serverError(res: any, error: any) {
  console.error('服务器错误:', error);
  return res.json({
    code: 500,
    message: '服务器错误',
    data: null,
  });
}
