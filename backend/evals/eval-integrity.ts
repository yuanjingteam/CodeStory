import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

export function stableHash(value: unknown): string {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(serialized).digest('hex');
}

export function hashFile(filePath: string): string {
  return stableHash(fs.readFileSync(filePath));
}

export function createRunIdentity(): { runId: string; createdAt: string } {
  return { runId: randomUUID(), createdAt: new Date().toISOString() };
}

export function getCodeStatus(cwd: string): string {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
    }).trim();
    const relevantDiff = execFileSync('git', [
      'diff',
      '--no-ext-diff',
      'HEAD',
      '--',
      'backend/src',
      ':(glob)backend/evals/*.ts',
      ':(glob)backend/evals/datasets/*.ts',
    ], {
      cwd,
      encoding: 'utf8',
    });
    return relevantDiff
      ? `${commit}-modified-${stableHash(relevantDiff).slice(0, 12)}`
      : commit;
  } catch {
    return 'git-unavailable';
  }
}

export function assertUniqueExpectedIds(
  records: Array<Record<string, unknown>>,
  expectedIds: ReadonlySet<string>,
  label: string
): void {
  const seen = new Set<string>();
  for (const record of records) {
    const id = record.id;
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error(`${label} 包含无效 id。`);
    }
    if (!expectedIds.has(id)) {
      throw new Error(`${label} 包含不属于当前数据集的 id：${id}`);
    }
    if (seen.has(id)) throw new Error(`${label} 包含重复 id：${id}`);
    seen.add(id);
  }
}
