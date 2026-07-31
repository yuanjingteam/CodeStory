import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

async function main(): Promise<void> {
  const inputPath = path.resolve(
    getArgument('input') ||
      'evals/reports/rag-answer-review.generated.json'
  );
  const outputPath = getArgument('output')
    ? path.resolve(getArgument('output')!)
    : undefined;
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as {
    datasetVersion: string;
    model?: string;
    answerModel?: string;
    reviewerModel?: string;
    rubricVersion?: string;
    promptVersion?: string;
    promptRevision?: string;
    reviewMethod?: string;
    expectedAnswers?: number;
    completedAnswers?: number;
    status?: 'partial' | 'complete';
    results: Array<{
      id: string;
      answer?: string;
      answerScope?: 'course' | 'extended';
      evidenceCount?: number;
      evidence?: unknown[];
      claims?: Array<{
        text: string;
        claimScope?: 'course' | 'supplement';
        supportReview: 'pending' | 'supported' | 'unsupported';
        correctnessReview?:
          | 'correct'
          | 'incorrect'
          | 'uncertain'
          | 'not_applicable';
        evidenceIndexes?: number[];
        reviewerNote?: string;
      }>;
    }>;
  };
  if (
    input.rubricVersion === 'rag-claim-support-v3' &&
    (input.results.length < 40 || input.status !== 'complete')
  ) {
    throw new Error(
      `RAG_SUPPORT_REVIEW_REQUIRED: grounded-v3 仅完成 ${input.results.length}/40 条 claim 审核`
    );
  }
  if (input.results.length < 20) {
    throw new Error(
      `RAG_SUPPORT_REVIEW_REQUIRED: 只有 ${input.results.length} 条回答，至少需要 20 条`
    );
  }
  const missingClaimAnswers = input.results.filter(
    (item) => !item.claims || item.claims.length === 0
  );
  const pendingClaims = input.results.flatMap((item) =>
    (item.claims || [])
      .filter((claim) => claim.supportReview === 'pending')
      .map((claim) => ({ answerId: item.id, claim: claim.text }))
  );
  if (missingClaimAnswers.length > 0 || pendingClaims.length > 0) {
    throw new Error(
      `RAG_SUPPORT_REVIEW_REQUIRED: ${missingClaimAnswers.length} 条回答缺少事实陈述标注，${pendingClaims.length} 条事实陈述仍待审核`
    );
  }
  const reviewedClaims = input.results.flatMap((item) =>
    item.claims!.map((claim) => ({
      answerId: item.id,
      evidenceCount:
        item.evidenceCount ?? item.evidence?.length ?? 0,
      ...claim,
    }))
  );
  const courseClaims = reviewedClaims.filter(
    (item) => item.claimScope !== 'supplement'
  );
  const supplementClaims = reviewedClaims.filter(
    (item) => item.claimScope === 'supplement'
  );
  const supportedClaims = courseClaims.filter(
    (item) => item.supportReview === 'supported'
  ).length;
  const correctSupplementClaims = supplementClaims.filter(
    (item) => item.correctnessReview === 'correct'
  ).length;
  const courseSupportAccuracy =
    courseClaims.length > 0
      ? supportedClaims / courseClaims.length
      : 1;
  const supplementAccuracy =
    supplementClaims.length > 0
      ? correctSupplementClaims / supplementClaims.length
      : 1;
  const citations = courseClaims.flatMap((item) =>
    (item.evidenceIndexes || []).map((index) => ({
      answerId: item.answerId,
      index,
      valid: index >= 1 && index <= item.evidenceCount,
    }))
  );
  const validCitations = citations.filter(
    (citation) => citation.valid
  ).length;
  const citationValidity =
    citations.length > 0 ? validCitations / citations.length : 1;
  const extendedAnswers = input.results.filter(
    (item) => item.answerScope === 'extended'
  );
  const correctlyLabeledExtendedAnswers = extendedAnswers.filter(
    (item) =>
      item.answer?.includes('课程内结论') &&
      item.answer?.includes('通用补充（非课程原文）')
  ).length;
  const extensionLabelAccuracy =
    extendedAnswers.length > 0
      ? correctlyLabeledExtendedAnswers / extendedAnswers.length
      : 1;
  const isV3 = input.rubricVersion === 'rag-claim-support-v3';
  const report = {
    datasetVersion: input.datasetVersion,
    model: input.model || input.answerModel || 'unknown',
    reviewerModel: input.reviewerModel,
    rubricVersion: input.rubricVersion,
    promptVersion: input.promptVersion,
    promptRevision: input.promptRevision,
    reviewMethod: input.reviewMethod,
    reviewedAnswers: input.results.length,
    reviewedClaims: reviewedClaims.length,
    reviewedCourseClaims: courseClaims.length,
    reviewedSupplementClaims: supplementClaims.length,
    supportedClaims,
    correctSupplementClaims,
    supportAccuracy: courseSupportAccuracy,
    supplementAccuracy,
    citationValidity,
    extensionLabelAccuracy,
    passed:
      courseSupportAccuracy >= 0.9 &&
      (!isV3 ||
        (supplementAccuracy >= 0.9 &&
          citationValidity === 1 &&
          extensionLabelAccuracy === 1)),
    unsupportedClaims: courseClaims
      .filter((item) => item.supportReview === 'unsupported')
      .map((item) => ({
        answerId: item.answerId,
        claim: item.text,
        reviewerNote: item.reviewerNote || '',
      })),
    incorrectSupplementClaims: supplementClaims
      .filter((item) => item.correctnessReview !== 'correct')
      .map((item) => ({
        answerId: item.answerId,
        claim: item.text,
        correctnessReview:
          item.correctnessReview || 'uncertain',
        reviewerNote: item.reviewerNote || '',
      })),
    invalidCitations: citations.filter(
      (citation) => !citation.valid
    ),
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, 'utf8');
  } else {
    process.stdout.write(serialized);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
