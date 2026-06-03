import OSS from 'ali-oss';

let _client: OSS | null = null;

export const OSS_BUCKET = process.env.OSS_BUCKET || '';
export const OSS_REGION = process.env.OSS_REGION || 'oss-cn-beijing';
export const OSS_DOMAIN = process.env.OSS_DOMAIN || '';

export function getOSSClient(): OSS {
  if (_client) return _client;

  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('OSS 未配置：缺少 OSS_ACCESS_KEY_ID 或 OSS_ACCESS_KEY_SECRET');
  }

  _client = new OSS({
    region: OSS_REGION,
    accessKeyId,
    accessKeySecret,
    bucket: OSS_BUCKET,
    endpoint: process.env.OSS_ENDPOINT || undefined,
    secure: true,
  });

  return _client;
}

export function isOSSConfigured(): boolean {
  return !!(process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET && OSS_BUCKET);
}
