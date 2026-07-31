import '../src/config/env';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { evalDatasetSchema } from './types';
import { v1SmokeDataset } from './datasets/v1-smoke';

async function main(): Promise<void> {
  const dataset = evalDatasetSchema.parse(v1SmokeDataset);
  const outputArgument = process.argv.find((argument) =>
    argument.startsWith('--output=')
  );
  const outputPath = outputArgument
    ? path.resolve(outputArgument.slice('--output='.length))
    : undefined;
  const startedAt = new Date().toISOString();
  const results = dataset.cases.map((item) => ({
    id: item.id,
    scenario: item.scenario,
    status: 'fixture_ready',
    metrics: {},
  }));
  const totals = results.reduce<Record<string, number>>(
    (counts, result) => {
      counts[result.scenario] = (counts[result.scenario] || 0) + 1;
      return counts;
    },
    {}
  );
  const report = {
    datasetVersion: dataset.datasetVersion,
    promptVersion: dataset.promptVersion,
    model: process.env.AI_MODEL || dataset.defaultModel,
    startedAt,
    completedAt: new Date().toISOString(),
    mode: 'fixture_validation',
    note:
      '阶段 0B 只建立固定评测格式与执行链路；真实模型/RAG 指标在对应业务阶段补跑。',
    totals,
    results,
  };

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    await writeFile(outputPath, serialized, 'utf8');
  } else {
    process.stdout.write(serialized);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
