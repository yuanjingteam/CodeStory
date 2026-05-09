import redisClient from '@/config/redis';

/**
 * 设置缓存
 */
export async function setCache(key: string, value: string, ttl: number) {
  await redisClient.setEx(key, ttl, value);
}

/**
 * 获取缓存
 */
export async function getCache(key: string) {
  const data = await redisClient.get(key);
  return data || null;
}

/**
 * 删除缓存
 */
export async function deleteCache(key: string) {
  await redisClient.del(key);
}
