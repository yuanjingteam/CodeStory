// UUID 转短 ID 工具
import prisma from '../config/prisma'

// 将 UUID 转换为短 ID（前 2 位 + 后 3 位）
export function uuidToShortId(uuid: string): string {
  if (!uuid) return '';
  const clean = uuid.replace(/-/g, '');
  return clean.slice(0, 2) + clean.slice(-3);
}

// 判断是否是短 ID
export function isShortId(id: string): boolean {
  return /^[0-9a-f]{5}$/i.test(id);
}

// 短 ID 反查完整 UUID（通过 SQL 匹配前 2 位和后 3 位）
export async function resolveShortId(
  table: 'courses' | 'chapters' | 'lessons' | 'exercises',
  shortId: string
): Promise<string | null> {
  if (!isShortId(shortId)) {
    console.log('[DEBUG resolveShortId] 不是合法的短 ID 格式:', shortId);
    return shortId;
  }

  const prefix = shortId.slice(0, 2).toLowerCase();
  const suffix = shortId.slice(-3).toLowerCase();
  
  const sql = `SELECT id FROM ${table} WHERE REPLACE(id, '-', '') LIKE $1 || '%' || $2`;
  console.log('[DEBUG resolveShortId] SQL:', sql, '参数:', prefix, suffix);
  
  const results = await prisma.$queryRawUnsafe(sql, prefix, suffix);
  console.log('[DEBUG resolveShortId] 查询结果:', results);

  if (Array.isArray(results) && results.length > 0) {
    return (results[0] as any).id;
  }
  return null;
}

// 批量转换对象中的 id 字段
export function transformIds<T extends Record<string, any>>(
  obj: T,
  idFields: string[] = ['id']
): T {
  const result: Record<string, any> = { ...obj };
  
  for (const field of idFields) {
    if (field in result && result[field] && typeof result[field] === 'string') {
      result[field] = uuidToShortId(result[field]);
    }
  }
  return result as T;
}
