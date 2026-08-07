import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const backendRoot = path.resolve(__dirname, '../..');
const tsNodeCli = path.join(
  backendRoot,
  'node_modules',
  'ts-node',
  'dist',
  'bin.js'
);

function runOperation(script: string) {
  return spawnSync(
    process.execPath,
    [
      tsNodeCli,
      '--files',
      '-r',
      'tsconfig-paths/register',
      path.join(backendRoot, 'scripts', script),
    ],
    {
      cwd: backendRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        // 防止子进程重新加载 .env.local 覆盖 Vitest 的临时数据库 URL。
        NODE_ENV: 'production',
      },
    }
  );
}

function parseOutput(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  return JSON.parse(lines.at(-1) || '{}') as Record<string, unknown>;
}

describe('阶段 6 运维命令数据库 dry-run', () => {
  it.each([
    ['cleanup-ai-call-logs.ts', 'ai_call_log_cleanup'],
    ['maintain-rag-index.ts', 'rag_index_maintenance'],
    ['cleanup-checkpoints.ts', 'checkpoint_cleanup'],
  ])('%s 默认只读且可连接完整迁移库', (script, event) => {
    const result = runOperation(script);

    expect(result.status, result.stderr).toBe(0);
    expect(parseOutput(result.stdout)).toMatchObject({
      event,
      dryRun: true,
    });
  }, 30_000);

  it('无调用样本时指标报告明确返回数据不足', () => {
    const result = runOperation('report-ai-metrics.ts');

    expect(result.status, result.stderr).toBe(3);
    expect(parseOutput(result.stdout)).toMatchObject({
      event: 'ai_metrics_report',
      status: 'INSUFFICIENT_DATA',
    });
  });
});
