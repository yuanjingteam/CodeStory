export interface AiMetricRow {
  scene: string;
  calls: number;
  successes: number;
  failures: number;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  retries: number;
  fallbacks: number;
  tokenSamples: number;
  costSamples: number;
}

export interface AiAlertThresholds {
  minimumCalls: number;
  minimumSuccessRate: number;
  dailyBudgetUsd: number;
  budgetWarningRatio: number;
}

export type OperationalStatus =
  | 'OK'
  | 'WARN'
  | 'ALERT'
  | 'INSUFFICIENT_DATA';

export interface AiAlert {
  type: 'success_rate' | 'latency' | 'budget';
  severity: 'warning' | 'critical';
  scene?: string;
  actual: number;
  threshold: number;
}

export interface DailyCostCoverage {
  calls: number;
  costSamples: number;
}

export function assessMetricCoverage(
  rows: AiMetricRow[],
  daily: DailyCostCoverage,
  sceneBaselines: Record<string, number>
) {
  const missingData = {
    tokenUsageScenes: rows
      .filter((row) => row.tokenSamples < row.calls)
      .map((row) => ({
        scene: row.scene,
        covered: row.tokenSamples,
        calls: row.calls,
      })),
    costScenes: rows
      .filter((row) => row.costSamples < row.calls)
      .map((row) => ({
        scene: row.scene,
        covered: row.costSamples,
        calls: row.calls,
      })),
    dailyCostCoverage: {
      covered: daily.costSamples,
      calls: daily.calls,
    },
    sceneBaselines: rows
      .filter((row) => sceneBaselines[row.scene] === undefined)
      .map((row) => row.scene),
  };
  return {
    missingData,
    complete:
      rows.length > 0 &&
      missingData.tokenUsageScenes.length === 0 &&
      missingData.costScenes.length === 0 &&
      daily.costSamples === daily.calls &&
      daily.calls > 0 &&
      missingData.sceneBaselines.length === 0,
  };
}

export function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

export function parsePositiveNumber(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function evaluateAiAlerts(
  rows: AiMetricRow[],
  thresholds: AiAlertThresholds,
  sceneBaselines: Record<string, number> = {},
  dailyCostUsd?: number
): AiAlert[] {
  const alerts: AiAlert[] = [];
  for (const row of rows) {
    if (row.calls >= thresholds.minimumCalls) {
      const successRate = row.calls === 0 ? 1 : row.successes / row.calls;
      if (successRate < thresholds.minimumSuccessRate) {
        alerts.push({
          type: 'success_rate',
          severity: 'critical',
          scene: row.scene,
          actual: successRate,
          threshold: thresholds.minimumSuccessRate,
        });
      }
    }
    const baseline = sceneBaselines[row.scene];
    if (
      baseline !== undefined &&
      row.p95DurationMs !== null &&
      row.p95DurationMs > baseline * 2
    ) {
      alerts.push({
        type: 'latency',
        severity: 'warning',
        scene: row.scene,
        actual: row.p95DurationMs,
        threshold: baseline * 2,
      });
    }
  }

  const dailyCost = dailyCostUsd ?? rows.reduce(
    (total, row) => total + row.estimatedCostUsd, 0
  );
  const warningThreshold = thresholds.dailyBudgetUsd * thresholds.budgetWarningRatio;
  if (dailyCostUsd !== undefined && dailyCost >= thresholds.dailyBudgetUsd) {
    alerts.push({
      type: 'budget',
      severity: 'critical',
      actual: dailyCost,
      threshold: thresholds.dailyBudgetUsd,
    });
  } else if (dailyCostUsd !== undefined && dailyCost >= warningThreshold) {
    alerts.push({
      type: 'budget',
      severity: 'warning',
      actual: dailyCost,
      threshold: warningThreshold,
    });
  }
  return alerts;
}

export function operationalStatus(
  calls: number,
  minimumCalls: number,
  alerts: AiAlert[],
  dataComplete = true
): OperationalStatus {
  if (alerts.some((alert) => alert.severity === 'critical')) return 'ALERT';
  if (calls < minimumCalls || !dataComplete) return 'INSUFFICIENT_DATA';
  if (alerts.length > 0) return 'WARN';
  return 'OK';
}

export const TERMINAL_GUIDED_STATE_CODES = [6, 7, 8, 9] as const;
