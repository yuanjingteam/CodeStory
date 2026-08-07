import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveAnswerScope } from '../src/services/ai/lesson-chat.service';
import { ragEvalDatasetSchema } from './rag-types';

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
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

async function main(): Promise<void> {
  const inputPath = path.resolve(
    getArgument('input') ||
      'evals/reports/rag-answer-review.grounded-v3.json'
  );
  const datasetPath = path.resolve(
    getArgument('dataset') ||
      'evals/datasets/rag-candidates.generated.json'
  );
  const outputPath = path.resolve(
    getArgument('output') ||
      'evals/reports/rag-tutor-v3-structure.json'
  );
  const report = JSON.parse(
    await readFile(inputPath, 'utf8')
  ) as {
    datasetVersion: string;
    model: string;
    promptVersion?: string;
    promptRevision?: string;
    status?: 'partial' | 'complete';
    results: Array<{
      id: string;
      question: string;
      answer: string;
      answerScope: 'course' | 'extended';
      generationDurationMs: number;
      contextDurationMs: number;
      modelTimeToFirstTokenMs: number;
      timeToFirstTokenMs: number;
      totalDurationMs: number;
      outputCharacters: number;
      evidence: Array<{
        sourceType: string;
        sourceId: string;
        contentHash: string;
      }>;
    }>;
  };
  const dataset = ragEvalDatasetSchema.parse(
    JSON.parse(await readFile(datasetPath, 'utf8'))
  );
  if (report.results.length < 40) {
    throw new Error(
      `RAG_TUTOR_V3_REVIEW_REQUIRED: 只有 ${report.results.length} 条回答`
    );
  }
  if (report.status !== 'complete') {
    throw new Error('RAG_TUTOR_V3_REPORT_INCOMPLETE');
  }
  if (report.promptVersion !== 'grounded-v3') {
    throw new Error(
      `RAG_TUTOR_V3_PROMPT_MISMATCH:${report.promptVersion || 'unknown'}`
    );
  }
  if (report.promptRevision !== 'grounded-v3.1-boundary') {
    throw new Error(
      `RAG_TUTOR_V3_REVISION_MISMATCH:${report.promptRevision || 'unknown'}`
    );
  }

  const casesById = new Map(
    dataset.cases.map((item) => [item.id, item])
  );
  let validCitations = 0;
  let citations = 0;
  let answersWithCitations = 0;
  let scopeMatches = 0;
  let expectedSourceAnswers = 0;
  let irrelevantSources = 0;
  let labeledExtendedAnswers = 0;
  let extendedAnswers = 0;

  for (const result of report.results) {
    const expectedCase = casesById.get(result.id);
    if (!expectedCase) {
      throw new Error(`RAG_TUTOR_V3_CASE_MISSING:${result.id}`);
    }
    if (
      result.answerScope ===
      resolveAnswerScope(result.question)
    ) {
      scopeMatches += 1;
    }
    const expectedKeys = new Set(
      expectedCase.expectedSources.map(
        (source) =>
          `${source.sourceType}:${source.sourceId}:${source.contentHash}`
      )
    );
    const evidenceKeys = result.evidence.map(
      (source) =>
        `${source.sourceType}:${source.sourceId}:${source.contentHash}`
    );
    if (evidenceKeys.some((key) => expectedKeys.has(key))) {
      expectedSourceAnswers += 1;
    }
    irrelevantSources += evidenceKeys.filter(
      (key) => !expectedKeys.has(key)
    ).length;

    const sourceCount = result.evidence.length;
    const answerCitations = [
      ...result.answer.matchAll(/\[(\d+)\]/g),
    ];
    if (answerCitations.length > 0) {
      answersWithCitations += 1;
    }
    for (const match of answerCitations) {
      citations += 1;
      const index = Number(match[1]);
      if (index >= 1 && index <= sourceCount) {
        validCitations += 1;
      }
    }
    if (result.answerScope === 'extended') {
      extendedAnswers += 1;
      if (
        result.answer.includes('课程内结论') &&
        result.answer.includes('通用补充（非课程原文）')
      ) {
        labeledExtendedAnswers += 1;
      }
    }
  }

  const metrics = {
    answers: report.results.length,
    scopeRoutingAccuracy:
      scopeMatches / report.results.length,
    expectedSourceInclusion:
      expectedSourceAnswers / report.results.length,
    irrelevantSources,
    citations,
    citationCoverage:
      answersWithCitations / report.results.length,
    citationValidity:
      citations > 0 ? validCitations / citations : 1,
    extendedAnswers,
    extensionLabelAccuracy:
      extendedAnswers > 0
        ? labeledExtendedAnswers / extendedAnswers
        : 1,
    latencyMs: {
      context: summarize(
        report.results.map((result) => result.contextDurationMs)
      ),
      modelTimeToFirstToken: summarize(
        report.results.map(
          (result) => result.modelTimeToFirstTokenMs
        )
      ),
      timeToFirstToken: summarize(
        report.results.map((result) => result.timeToFirstTokenMs)
      ),
      generation: summarize(
        report.results.map(
          (result) => result.generationDurationMs
        )
      ),
      total: summarize(
        report.results.map((result) => result.totalDurationMs)
      ),
    },
    outputCharacters: summarize(
      report.results.map((result) => result.outputCharacters)
    ),
  };
  const passed =
    metrics.scopeRoutingAccuracy === 1 &&
    metrics.expectedSourceInclusion === 1 &&
    metrics.irrelevantSources === 0 &&
    metrics.citationCoverage === 1 &&
    metrics.citationValidity === 1 &&
    metrics.extensionLabelAccuracy === 1;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        datasetVersion: report.datasetVersion,
        model: report.model,
        promptVersion: report.promptVersion,
        promptRevision: report.promptRevision,
        evaluatedAt: new Date().toISOString(),
        metrics,
        passed,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  process.stdout.write(
    `${JSON.stringify({ outputPath, ...metrics, passed })}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
