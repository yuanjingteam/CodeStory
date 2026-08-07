import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('evals/human-review');

function csv(value: unknown): string {
  const text = value === null || value === undefined
    ? ''
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.resolve(file), 'utf8')) as T;
}

async function writeCsv(
  name: string,
  headers: string[],
  rows: unknown[][]
): Promise<void> {
  const content = [headers, ...rows]
    .map((row) => row.map(csv).join(','))
    .join('\n');
  await writeFile(path.join(outputDirectory, name), `${content}\n`, 'utf8');
}

async function main(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const rag = await json<{ results: Array<Record<string, unknown>> }>(
    'evals/reports/rag-answer-review.qwen3-30b.grounded-v3.json'
  );
  const exercises = await json<Array<Record<string, unknown>>>(
    'evals/reports/stage2-formal-qwen30b-rerun-20260803.json'
  );
  const grading = await json<{ results: Array<Record<string, unknown>> }>(
    'evals/reports/grading-stage3.qwen3-30b.v2.json'
  );

  await writeCsv('stage1-rag-human-review.csv', [
    'id', 'question', 'answer', 'evidence', 'human_supported',
    'human_reviewer', 'reviewed_at', 'human_note',
  ], rag.results.map((row) => [
    row.id, row.question, row.answer, row.evidence, '', '', '', '',
  ]));
  await writeCsv('stage2-exercise-human-review.csv', [
    'id', 'candidate', 'human_answer_correct', 'human_confirmed_duplicate',
    'human_reviewer', 'reviewed_at', 'human_note',
  ], exercises.map((row) => [row.id, row.candidate, '', '', '', '', '']));
  await writeCsv('stage3-grading-human-review.csv', [
    'id', 'answer_class', 'exercise_content', 'correct_answer', 'user_code',
    'ai_pass', 'ai_score', 'human_expected_pass', 'human_expected_score',
    'human_reviewer', 'reviewed_at', 'human_note',
  ], grading.results.map((row) => [
    row.id, row.answerClass, row.exerciseContent, row.correctAnswer, row.userCode,
    row.aiPass, row.aiScore, '', '', '', '', '',
  ]));
  process.stdout.write(`${JSON.stringify({
    event: 'human_review_worksheets_prepared',
    outputDirectory,
    counts: {
      stage1: rag.results.length,
      stage2: exercises.length,
      stage3: grading.results.length,
    },
    labelProvenance: 'blank-human-review-template',
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    event: 'human_review_worksheets_failed',
    error: error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exitCode = 1;
});
