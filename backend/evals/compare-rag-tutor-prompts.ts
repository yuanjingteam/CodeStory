import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[
    Math.min(
      Math.ceil(sorted.length * ratio) - 1,
      sorted.length - 1
    )
  ];
}

function summarize(values: number[]) {
  return {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    average:
      values.reduce((sum, value) => sum + value, 0) /
      values.length,
  };
}

interface AnswerResult {
  id: string;
  timeToFirstTokenMs: number;
  totalDurationMs: number;
  outputCharacters: number;
}

interface AnswerReport {
  datasetVersion: string;
  model: string;
  promptVersion: 'grounded-v2' | 'grounded-v3';
  promptRevision: string;
  status: 'partial' | 'complete';
  results: AnswerResult[];
}

interface SupportReport {
  supportAccuracy: number;
  supplementAccuracy: number;
  citationValidity: number;
  extensionLabelAccuracy: number;
  passed: boolean;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function main(): Promise<void> {
  const v2AnswersPath = path.resolve(
    getArgument('v2-answers') ||
      'evals/reports/rag-answer-review.grounded-v2-40.json'
  );
  const v3AnswersPath = path.resolve(
    getArgument('v3-answers') ||
      'evals/reports/rag-answer-review.grounded-v3.json'
  );
  const v2SupportPath = path.resolve(
    getArgument('v2-support') ||
      'evals/reports/rag-answer-support.grounded-v2-40.json'
  );
  const v3SupportPath = path.resolve(
    getArgument('v3-support') ||
      'evals/reports/rag-answer-support.grounded-v3.json'
  );
  const v3StructurePath = path.resolve(
    getArgument('v3-structure') ||
      'evals/reports/rag-tutor-v3-structure.json'
  );
  const outputPath = path.resolve(
    getArgument('output') ||
      'evals/reports/rag-tutor-prompt-comparison.json'
  );

  const [v2, v3, v2Support, v3Support, v3Structure] =
    await Promise.all([
      readJson<AnswerReport>(v2AnswersPath),
      readJson<AnswerReport>(v3AnswersPath),
      readJson<SupportReport>(v2SupportPath),
      readJson<SupportReport>(v3SupportPath),
      readJson<{ passed: boolean }>(v3StructurePath),
    ]);

  if (
    v2.status !== 'complete' ||
    v3.status !== 'complete' ||
    v2.results.length !== 40 ||
    v3.results.length !== 40
  ) {
    throw new Error('RAG_PROMPT_COMPARISON_INCOMPLETE');
  }
  if (
    v2.datasetVersion !== v3.datasetVersion ||
    v2.model !== v3.model ||
    v2.promptRevision !== 'grounded-v2.0' ||
    v3.promptRevision !== 'grounded-v3.1-boundary'
  ) {
    throw new Error('RAG_PROMPT_COMPARISON_IDENTITY_MISMATCH');
  }

  const v3ById = new Map(
    v3.results.map((result) => [result.id, result])
  );
  const pairedCases = v2.results.map((v2Result) => {
    const v3Result = v3ById.get(v2Result.id);
    if (!v3Result) {
      throw new Error(
        `RAG_PROMPT_COMPARISON_CASE_MISSING:${v2Result.id}`
      );
    }
    return {
      id: v2Result.id,
      v2: {
        timeToFirstTokenMs: v2Result.timeToFirstTokenMs,
        totalDurationMs: v2Result.totalDurationMs,
        outputCharacters: v2Result.outputCharacters,
      },
      v3: {
        timeToFirstTokenMs: v3Result.timeToFirstTokenMs,
        totalDurationMs: v3Result.totalDurationMs,
        outputCharacters: v3Result.outputCharacters,
      },
    };
  });

  const latency = {
    v2: {
      timeToFirstToken: summarize(
        pairedCases.map((item) => item.v2.timeToFirstTokenMs)
      ),
      total: summarize(
        pairedCases.map((item) => item.v2.totalDurationMs)
      ),
      outputCharacters: summarize(
        pairedCases.map((item) => item.v2.outputCharacters)
      ),
    },
    v3: {
      timeToFirstToken: summarize(
        pairedCases.map((item) => item.v3.timeToFirstTokenMs)
      ),
      total: summarize(
        pairedCases.map((item) => item.v3.totalDurationMs)
      ),
      outputCharacters: summarize(
        pairedCases.map((item) => item.v3.outputCharacters)
      ),
    },
  };
  const ratios = {
    p95TimeToFirstToken:
      latency.v3.timeToFirstToken.p95 /
      latency.v2.timeToFirstToken.p95,
    p95Total:
      latency.v3.total.p95 / latency.v2.total.p95,
  };
  const gates = {
    v3Structure: v3Structure.passed,
    v3CourseSupport: v3Support.supportAccuracy >= 0.9,
    v3SupplementCorrectness:
      v3Support.supplementAccuracy >= 0.9,
    v3CitationValidity: v3Support.citationValidity === 1,
    v3ExtensionLabels:
      v3Support.extensionLabelAccuracy === 1,
    p95TimeToFirstToken: ratios.p95TimeToFirstToken <= 1.1,
    p95Total: ratios.p95Total <= 1.1,
  };
  const passed = Object.values(gates).every(Boolean);
  const report = {
    datasetVersion: v2.datasetVersion,
    model: v2.model,
    evaluatedAt: new Date().toISOString(),
    pairedAnswers: pairedCases.length,
    revisions: {
      v2: v2.promptRevision,
      v3: v3.promptRevision,
    },
    quality: {
      v2: v2Support,
      v3: v3Support,
    },
    latency,
    ratios,
    gates,
    passed,
    decision: passed
      ? 'switch-to-grounded-v3'
      : 'keep-grounded-v2',
    pairedCases,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
  process.stdout.write(
    `${JSON.stringify({ outputPath, ...ratios, gates, passed, decision: report.decision })}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
