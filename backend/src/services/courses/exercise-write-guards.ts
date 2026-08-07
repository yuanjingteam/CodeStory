import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma';

export function createExerciseContentFingerprint(content: string): string {
  const normalized = content
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}

export async function lockLessonExerciseWrites(
  tx: Prisma.TransactionClient,
  lessonId: string
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${lessonId}, 0))::text
  `;
}
