import '../src/config/env';
import { Prisma } from '../src/generated/prisma';
import prisma from '../src/config/prisma';
import {
  parsePositiveInteger,
  TERMINAL_GUIDED_STATE_CODES,
} from './lib/operations';

interface Candidate {
  session_id: string;
  run_id: string;
  state: number;
  updated_at: Date;
}

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const retentionDays = parsePositiveInteger(
    argument('retention-days') ?? process.env.AI_CHECKPOINT_RETENTION_DAYS,
    30,
    3_650
  );
  const limit = parsePositiveInteger(argument('limit'), 100, 1_000);
  const terminalStates = [...TERMINAL_GUIDED_STATE_CODES];
  const candidates = await prisma.$queryRaw<Candidate[]>(Prisma.sql`
    SELECT runs."session_id", runs."run_id", runs."state",
      runs."completed_at" AS "updated_at"
    FROM "guided_learning_runs" runs
    INNER JOIN "ai_chat_sessions" sessions ON sessions."id" = runs."session_id"
    WHERE runs."status" = 'terminal'
      AND runs."state" IN (${Prisma.join(terminalStates)})
      AND runs."completed_at" IS NOT NULL
      AND runs."checkpoint_deleted_at" IS NULL
      AND runs."completed_at" <= CURRENT_TIMESTAMP -
        (${retentionDays} * INTERVAL '1 day')
      AND (sessions."current_run_id" IS NULL OR
        sessions."current_run_id" <> runs."run_id")
    ORDER BY runs."completed_at" ASC
    LIMIT ${limit}
  `);
  const audited: Array<Record<string, unknown>> = [];
  for (const candidate of candidates) {
    if (!execute) {
      audited.push({ ...candidate, action: 'would_delete' });
      continue;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Recheck the business projection in the same transaction immediately before
        // deletion. A resumed/restarted run is therefore protected even after dry-run.
        const locked = await tx.$queryRaw<Candidate[]>(Prisma.sql`
          SELECT runs."session_id", runs."run_id", runs."state",
            runs."completed_at" AS "updated_at"
          FROM "guided_learning_runs" runs
          INNER JOIN "ai_chat_sessions" sessions
            ON sessions."id" = runs."session_id"
          WHERE runs."run_id" = ${candidate.run_id}
            AND runs."status" = 'terminal'
            AND runs."state" IN (${Prisma.join(terminalStates)})
            AND runs."checkpoint_deleted_at" IS NULL
            AND runs."completed_at" <= CURRENT_TIMESTAMP -
              (${retentionDays} * INTERVAL '1 day')
            AND (sessions."current_run_id" IS NULL OR
              sessions."current_run_id" <> runs."run_id")
          FOR UPDATE
        `);
        if (locked.length !== 1) return { action: 'skipped_state_changed' };
        const writes = await tx.$executeRaw(Prisma.sql`
          DELETE FROM "checkpoint_writes" WHERE "thread_id" = ${candidate.run_id}
        `);
        const blobs = await tx.$executeRaw(Prisma.sql`
          DELETE FROM "checkpoint_blobs" WHERE "thread_id" = ${candidate.run_id}
        `);
        const checkpoints = await tx.$executeRaw(Prisma.sql`
          DELETE FROM "checkpoints" WHERE "thread_id" = ${candidate.run_id}
        `);
        await tx.guided_learning_runs.update({
          where: { run_id: candidate.run_id },
          data: { checkpoint_deleted_at: new Date() },
        });
        const retainedEffects = await tx.learning_run_effects.count({
          where: { run_id: candidate.run_id },
        });
        return {
          action: 'deleted',
          writes,
          blobs,
          checkpoints,
          retainedEffects,
        };
      });
      audited.push({ ...candidate, ...result });
    } catch (error) {
      audited.push({
        ...candidate,
        action: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const deleted = audited.filter((item) => item.action === 'deleted').length;
  const failed = audited.filter((item) => item.action === 'failed').length;
  process.stdout.write(`${JSON.stringify({
    event: 'checkpoint_cleanup',
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    retentionDays,
    limit,
    candidates: candidates.length,
    deleted,
    failed,
    audit: audited,
  })}\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: 'checkpoint_cleanup_failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
