import OSS from 'ali-oss';

let _client: OSS | null = null;

export function getOSSClient(): OSS {
  if (_client) return _client;

  const region = process.env.OSS_REGION || 'oss-cn-beijing';
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;

  if (!accessKeyId || !accessKeySecret || !bucket) {
    throw new Error(
      'OSS 未配置：缺少 OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET 或 OSS_BUCKET'
    );
  }

  _client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    endpoint: process.env.OSS_ENDPOINT || undefined,
    secure: true,
  });

  return _client;
}

export function isOSSConfigured(): boolean {
  return !!(
    process.env.OSS_ACCESS_KEY_ID &&
    process.env.OSS_ACCESS_KEY_SECRET &&
    process.env.OSS_BUCKET
  );
}
