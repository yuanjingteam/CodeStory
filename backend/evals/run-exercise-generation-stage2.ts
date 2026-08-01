import '../src/config/env';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exerciseGenerationStage2Dataset } from './datasets/exercise-generation-stage2';
import { generateExerciseCandidateForEvaluation } from '../src/services/ai/exercise-gen';

const concurrencyArg = process.argv.find((item) => item.startsWith('--concurrency='));
const concurrency = Math.max(1, Math.min(8, Number(concurrencyArg?.split('=')[1] || 5)));
const outputArg = process.argv.find((item) => item.startsWith('--output='));
const limitArg = process.argv.find((item) => item.startsWith('--limit='));
const limit = Math.max(1, Math.min(100, Number(limitArg?.split('=')[1] || 100)));
const outputPath = path.resolve(
  outputArg?.slice('--output='.length)
    || 'evals/datasets/exercise-generation-results.json'
);

async function main() {
  let existing: Array<Record<string, unknown>> = [];
  try {
    existing = JSON.parse(await readFile(outputPath, 'utf8'));
  } catch {
    existing = [];
  }
  const byId = new Map(existing.map((item) => [String(item.id), item]));

  async function runItem(item: typeof exerciseGenerationStage2Dataset[number]) {
    try {
      const generated = await generateExerciseCandidateForEvaluation(item);
      return {
          id: item.id,
          ...generated.metrics,
          finalSuccess: true,
          validCandidateCount: generated.candidates.length,
          candidate: generated.candidates[0],
          evidence: item.evidence,
          agentAnswerCorrect: null,
          machineDuplicate: null,
          agentConfirmedDuplicate: null,
          labelProvenance: 'pending-agent-audit',
      };
    } catch (error) {
      return {
          id: item.id,
          firstPassStructured: false,
          repaired: false,
          finalSuccess: false,
          modelCallCount: 2,
          validCandidateCount: 0,
          error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
          errorDetail: error && typeof error === 'object' && 'originalCause' in error
            ? error.originalCause
            : undefined,
          agentAnswerCorrect: null,
          machineDuplicate: null,
          agentConfirmedDuplicate: null,
          labelProvenance: 'pending-agent-audit',
      };
    }
  }

  const selectedDataset = exerciseGenerationStage2Dataset.slice(0, limit);
  const pending = selectedDataset.filter((item) => !byId.has(item.id));
  for (let offset = 0; offset < pending.length; offset += concurrency) {
    const batch = pending.slice(offset, offset + concurrency);
    const completed = await Promise.all(batch.map(runItem));
    completed.forEach((item) => byId.set(String(item.id), item));
    const checkpoint = selectedDataset
      .map((item) => byId.get(item.id))
      .filter((item): item is Record<string, unknown> => Boolean(item));
    await writeFile(outputPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
    process.stdout.write(`checkpoint ${checkpoint.length}/${selectedDataset.length}\n`);
  }
  const results = selectedDataset.map((item) => byId.get(item.id)!);
  process.stdout.write(`${JSON.stringify({
    outputPath,
    attempts: results.length,
    successes: results.filter((item) => item.finalSuccess).length,
    concurrency,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
