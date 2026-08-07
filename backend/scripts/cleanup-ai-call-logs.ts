import '../src/config/env';
import { Prisma } from '../src/generated/prisma';
import prisma from '../src/config/prisma';
import { parsePositiveInteger } from './lib/operations';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const retentionDays = parsePositiveInteger(
    argument('retention-days') ?? process.env.AI_CALL_LOG_RETENTION_DAYS,
    90,
    3_650
  );
  const limit = parsePositiveInteger(argument('limit'), 1_000, 10_000);
  const candidates = await prisma.$queryRaw<Array<{
    id: string;
    trace_id: string;
    created_at: Date;
  }>>(Prisma.sql`
    SELECT "id", "trace_id", "created_at"
    FROM "ai_call_logs"
    WHERE "created_at" <= CURRENT_TIMESTAMP -
      (${retentionDays} * INTERVAL '1 day')
    ORDER BY "created_at" ASC
    LIMIT ${limit}
  `);
  let deleted = 0;
  if (execute && candidates.length > 0) {
    deleted = await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "ai_call_logs"
      WHERE "id" IN (${Prisma.join(candidates.map((item) => item.id))})
        AND "created_at" <= CURRENT_TIMESTAMP -
          (${retentionDays} * INTERVAL '1 day')
    `);
  }
  process.stdout.write(`${JSON.stringify({
    event: 'ai_call_log_cleanup',
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    retentionDays,
    limit,
    candidates: candidates.length,
    deleted,
    audit: candidates,
  })}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: 'ai_call_log_cleanup_failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

