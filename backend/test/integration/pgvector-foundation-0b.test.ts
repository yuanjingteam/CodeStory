import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import prisma from '../../src/config/prisma';

function toVector(values: number[]): string {
  return `[${values.join(',')}]`;
}

describe('阶段 0B · pgvector 基础设施', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('测试文本可写入 vector(1024) 并通过 $1::vector 查回 top-k', async () => {
    const sourceId = randomUUID();
    const closeVector = toVector([
      1,
      ...Array.from({ length: 1023 }, () => 0),
    ]);
    const farVector = toVector([
      0,
      1,
      ...Array.from({ length: 1022 }, () => 0),
    ]);

    await prisma.$executeRaw`
      INSERT INTO "knowledge_chunks" (
        "id", "source_type", "source_id", "source_version",
        "chunk_index", "content", "content_hash", "embedding",
        "updated_at"
      ) VALUES
        (
          ${randomUUID()}, 'doc', ${sourceId}, NOW(),
          0, '最接近查询的文本', ${'a'.repeat(64)}, ${closeVector}::vector,
          NOW()
        ),
        (
          ${randomUUID()}, 'doc', ${sourceId}, NOW(),
          1, '距离查询较远的文本', ${'b'.repeat(64)}, ${farVector}::vector,
          NOW()
        )
    `;

    const result = await prisma.$queryRaw<
      Array<{ content: string; score: number }>
    >`
      SELECT
        "content",
        1 - ("embedding" <=> ${closeVector}::vector) AS "score"
      FROM "knowledge_chunks"
      WHERE "source_type" = 'doc' AND "source_id" = ${sourceId}
      ORDER BY "embedding" <=> ${closeVector}::vector
      LIMIT 1
    `;

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('最接近查询的文本');
    expect(Number(result[0].score)).toBeCloseTo(1);
  });
});
