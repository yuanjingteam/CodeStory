

/**
 * 获取本地存储值
 * @param key 存储键名
 * @returns 存储的值，如果不存在返回 null
 */
export const getStorage = <T = string>(key: string): T | null => {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return null;

    // 尝试解析为 JSON，如果失败则返回原始字符串
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch (error) {
    console.error('Failed to get storage:', error);
    return null;
  }
};

/**
 * 设置本地存储值
 * @param key 存储键名
 * @param value 存储的值（支持任意可序列化类型）
 */
export const setStorage = <T>(key: string, value: T): void => {
  try {
    const serializedValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error('Failed to set storage:', error);
  }
};

/**
 * 移除本地存储值
 * @param key 存储键名
 */
export const removeStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove storage:', error);
  }
};

/**
 * 清除所有本地存储
 */
export const clearStorage = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
};

/**
 * 检查键是否存在
 * @param key 存储键名
 * @returns 是否存在
 */
export const hasStorage = (key: string): boolean => {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error('Failed to check storage:', error);
    return false;
  }
};
