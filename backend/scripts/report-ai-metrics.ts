import '../src/config/env';
import { Prisma } from '../src/generated/prisma';
import prisma from '../src/config/prisma';
import {
  evaluateAiAlerts,
  assessMetricCoverage,
  operationalStatus,
  parsePositiveInteger,
  parsePositiveNumber,
  type AiMetricRow,
} from './lib/operations';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function parseBaselines(value: string | undefined): Record<string, number> {
  if (!value) return {};
  return Object.fromEntries(
    value.split(',').flatMap((entry) => {
      const [scene, raw] = entry.split(':');
      const baseline = Number(raw);
      return scene && Number.isFinite(baseline) && baseline > 0
        ? [[scene, baseline]]
        : [];
    })
  );
}

async function main(): Promise<void> {
  const windowMinutes = parsePositiveInteger(
    argument('window-minutes'),
    5,
    10_080
  );
  const minimumCalls = parsePositiveInteger(argument('minimum-calls'), 5);
  const minimumSuccessRate = parsePositiveNumber(
    process.env.AI_ALERT_MIN_SUCCESS_RATE,
    0.95
  );
  const dailyBudgetUsd = parsePositiveNumber(
    process.env.AI_DAILY_BUDGET_USD,
    10
  );
  const budgetWarningRatio = parsePositiveNumber(
    process.env.AI_BUDGET_WARNING_RATIO,
    0.8
  );

  // Keep the ai_call_logs column contract localized here. The report deliberately
  // uses raw SQL so it can run immediately after migrations without generated
  // client coupling.
  const rows = await prisma.$queryRaw<AiMetricRow[]>(Prisma.sql`
    SELECT
      "scene",
      COUNT(*)::int AS "calls",
      COUNT(*) FILTER (WHERE "status" = 'success')::int AS "successes",
      COUNT(*) FILTER (WHERE "status" <> 'success')::int AS "failures",
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "duration_ms")::float8
        AS "p50DurationMs",
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "duration_ms")::float8
        AS "p95DurationMs",
      COALESCE(SUM("input_tokens"), 0)::int AS "inputTokens",
      COALESCE(SUM("output_tokens"), 0)::int AS "outputTokens",
      COALESCE(SUM("estimated_cost_usd"), 0)::float8 AS "estimatedCostUsd",
      COALESCE(SUM("retry_count"), 0)::int AS "retries",
      COUNT(*) FILTER (WHERE "fallback_used")::int AS "fallbacks"
      ,COUNT(*) FILTER (
        WHERE "input_tokens" IS NOT NULL AND "output_tokens" IS NOT NULL
      )::int AS "tokenSamples"
      ,COUNT(*) FILTER (WHERE "estimated_cost_usd" IS NOT NULL)::int
        AS "costSamples"
    FROM "ai_call_logs"
    WHERE "created_at" >=
      CURRENT_TIMESTAMP - (${windowMinutes} * INTERVAL '1 minute')
    GROUP BY "scene"
    ORDER BY "scene"
  `);
  const [daily] = await prisma.$queryRaw<Array<{
    calls: number;
    costUsd: number;
    costSamples: number;
  }>>(Prisma.sql`
    SELECT COUNT(*)::int AS "calls",
      COALESCE(SUM("estimated_cost_usd"), 0)::float8 AS "costUsd",
      COUNT("estimated_cost_usd")::int AS "costSamples"
    FROM "ai_call_logs"
    WHERE "created_at" >= DATE_TRUNC('day', CURRENT_TIMESTAMP)
  `);
  const alerts = evaluateAiAlerts(rows, {
    minimumCalls,
    minimumSuccessRate,
    dailyBudgetUsd,
    budgetWarningRatio,
  }, parseBaselines(process.env.AI_ALERT_SCENE_P95_BASELINES_MS),
  daily.calls > 0 && daily.costSamples === daily.calls
    ? daily.costUsd
    : undefined);
  const calls = rows.reduce((total, row) => total + row.calls, 0);
  const baselines = parseBaselines(process.env.AI_ALERT_SCENE_P95_BASELINES_MS);
  const coverage = assessMetricCoverage(rows, daily, baselines);
  const status = operationalStatus(calls, minimumCalls, alerts, coverage.complete);
  const output = {
    event: 'ai_metrics_report',
    status,
    generatedAt: new Date().toISOString(),
    windowMinutes,
    rows,
    dailyCostUsd: daily.costUsd,
    missingData: coverage.missingData,
    alerts,
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
  if (status === 'WARN' || status === 'ALERT') process.exitCode = 2;
  if (status === 'INSUFFICIENT_DATA') process.exitCode = 3;
}

main()
  .catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: 'ai_metrics_report_failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
