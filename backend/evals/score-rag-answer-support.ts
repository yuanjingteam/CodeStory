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
    reviewMethod?: string;
    results: Array<{
      id: string;
      claims?: Array<{
        text: string;
        supportReview: 'pending' | 'supported' | 'unsupported';
        reviewerNote?: string;
      }>;
    }>;
  };
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
      ...claim,
    }))
  );
  const supportedClaims = reviewedClaims.filter(
    (item) => item.supportReview === 'supported'
  ).length;
  const report = {
    datasetVersion: input.datasetVersion,
    model: input.model || input.answerModel || 'unknown',
    reviewerModel: input.reviewerModel,
    rubricVersion: input.rubricVersion,
    reviewMethod: input.reviewMethod,
    reviewedAnswers: input.results.length,
    reviewedClaims: reviewedClaims.length,
    supportedClaims,
    supportAccuracy: supportedClaims / reviewedClaims.length,
    passed: supportedClaims / reviewedClaims.length >= 0.9,
    unsupportedClaims: reviewedClaims
      .filter((item) => item.supportReview === 'unsupported')
      .map((item) => ({
        answerId: item.answerId,
        claim: item.text,
        reviewerNote: item.reviewerNote || '',
      })),
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
