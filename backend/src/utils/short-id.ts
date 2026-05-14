import prisma from '../config/prisma';

export function uuidToShortId(uuid: string): string {
  if (!uuid) return '';
  const clean = uuid.replace(/-/g, '');
  return clean.slice(0, 2) + clean.slice(-3);
}

export function isShortId(id: string): boolean {
  return /^[0-9a-f]{5}$/i.test(id);
}

export async function resolveShortId(
  table: 'courses' | 'chapters' | 'lessons' | 'exercises',
  shortId: string
): Promise<string | null> {
  if (!isShortId(shortId)) return shortId;

  const prefix = shortId.slice(0, 2).toLowerCase();
  const suffix = shortId.slice(-3).toLowerCase();
  
  const results = await prisma.$queryRawUnsafe(
    `SELECT id FROM ${table} WHERE REPLACE(id, '-', '') LIKE $1 || '%' || $2`,
    prefix,
    suffix
  );

  if (Array.isArray(results) && results.length > 0) {
    return (results[0] as any).id;
  }
  return null;
}
