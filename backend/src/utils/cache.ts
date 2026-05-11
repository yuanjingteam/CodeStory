import redisClient from '@/config/redis';

export async function setCache(key: string, value: string, ttl: number) {
  await redisClient.setEx(key, ttl, value);
}

export async function getCache(key: string) {
  const data = await redisClient.get(key);
  return data || null;
}

export async function deleteCache(key: string) {
  await redisClient.del(key);
}
