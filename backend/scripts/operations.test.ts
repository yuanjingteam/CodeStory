import { describe, expect, it } from 'vitest';
import {
  evaluateAiAlerts,
  operationalStatus,
  parsePositiveInteger,
  TERMINAL_GUIDED_STATE_CODES,
  type AiMetricRow,
} from './lib/operations';

const baseRow: AiMetricRow = {
  scene: 'chat',
  calls: 20,
  successes: 20,
  failures: 0,
  p50DurationMs: 500,
  p95DurationMs: 1_000,
  inputTokens: 100,
  outputTokens: 50,
  estimatedCostUsd: 1,
  retries: 0,
  fallbacks: 0,
  tokenSamples: 20,
  costSamples: 20,
};

describe('阶段 6 运维脚本纯逻辑', () => {
  it('限制正整数参数并拒绝非法值', () => {
    expect(parsePositiveInteger('1200', 100, 1000)).toBe(1000);
    expect(parsePositiveInteger('0', 100)).toBe(100);
    expect(parsePositiveInteger('oops', 100)).toBe(100);
  });

  it('分别触发成功率、延迟和预算告警', () => {
    const alerts = evaluateAiAlerts([{
      ...baseRow,
      successes: 18,
      failures: 2,
      p95DurationMs: 2_001,
      estimatedCostUsd: 8,
    }], {
      minimumCalls: 5,
      minimumSuccessRate: 0.95,
      dailyBudgetUsd: 10,
      budgetWarningRatio: 0.8,
    }, { chat: 1_000 }, 8);
    expect(alerts.map((alert) => alert.type)).toEqual([
      'success_rate', 'latency', 'budget',
    ]);
    expect(operationalStatus(20, 5, alerts)).toBe('ALERT');
  });

  it('低样本量不触发成功率告警且终态集合不含进行中状态', () => {
    const alerts = evaluateAiAlerts([{ ...baseRow, calls: 2, successes: 0 }], {
      minimumCalls: 5,
      minimumSuccessRate: 0.95,
      dailyBudgetUsd: 10,
      budgetWarningRatio: 0.8,
    });
    expect(alerts).toEqual([]);
    expect(operationalStatus(2, 5, alerts)).toBe('INSUFFICIENT_DATA');
    expect(operationalStatus(20, 5, [], false)).toBe('INSUFFICIENT_DATA');
    expect(TERMINAL_GUIDED_STATE_CODES).toEqual([6, 7, 8, 9]);
    expect(TERMINAL_GUIDED_STATE_CODES).not.toContain(3);
  });
});

