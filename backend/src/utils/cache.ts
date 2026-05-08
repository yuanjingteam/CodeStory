type CacheValue = {
  value: string;
  expire: number;
};
const cache = new Map<string, CacheValue>();
/**
 * 设置缓存
 */
export function setCache(key: string, value: string, ttl: number) {
  cache.set(key, {
    value,
    expire: Date.now() + ttl * 1000,
  });
}
/**
 * 获取缓存
 */
export function getCache(key: string) {
  const data = cache.get(key);
  if (!data) {
    return null;
  }
  // 判断是否过期
  if (Date.now() > data.expire) {
    cache.delete(key);
    return null;
  }

  return data.value;
}
/**
 * 删除缓存
 */
export function deleteCache(key: string) {
  cache.delete(key);
}