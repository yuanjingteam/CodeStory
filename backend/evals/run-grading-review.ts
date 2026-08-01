import '../src/config/env';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gradingStage3Dataset } from './datasets/grading-stage3';
import { reviewCodeWithAI } from '../src/services/ai/evaluate/code-grading-chain';
import {
  calculateAiReviewedFinalScore,
  gradeCodeExercise,
} from '../src/services/courses/code-grading.service';

async function main() {
  const outputArg = process.argv.find((argument) => argument.startsWith('--output='));
  const outputPath = outputArg
    ? path.resolve(outputArg.slice('--output='.length))
    : path.resolve('evals/reports/grading-stage3.json');
  const results = [];

  for (const item of gradingStage3Dataset) {
    const staticGrade = gradeCodeExercise({
      userCode: item.userCode,
      correctAnswer: item.correctAnswer,
      metadata: { language: 'sql' },
      hintLevelUsed: 0,
    });
    try {
      const ai = await reviewCodeWithAI({
        exerciseContent: item.exerciseContent,
        knowledge: 'SQL 查询',
        correctAnswer: item.correctAnswer,
        analysis: item.rationale,
        userCode: item.userCode,
        language: 'sql',
        hintLevelUsed: 0,
        staticGrade,
      });
      const aiScore = calculateAiReviewedFinalScore(ai, 0);
      const agreement = ai.review.isLikelyCorrect === item.expectedPass;
      results.push({
        ...item,
        labelProvenance: 'agent-audited',
        staticPass: staticGrade.correct,
        aiPass: ai.review.isLikelyCorrect,
        aiScore,
        confidence: ai.review.confidence,
        needsManualReview: ai.review.needsManualReview,
        ruleConflict: staticGrade.correct !== ai.review.isLikelyCorrect,
        agreement,
        absoluteError: Math.abs(aiScore - item.agentScore),
        status: 'completed',
      });
    } catch (error) {
      results.push({
        ...item,
        labelProvenance: 'agent-audited',
        status: 'failed',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    }
  }

  const completed = results.filter((item) => item.status === 'completed');
  const agreementRate = completed.length
    ? completed.filter((item) => item.agreement).length / completed.length
    : 0;
  const meanAbsoluteError = completed.length
    ? completed.reduce((sum, item) => sum + (item.absoluteError || 0), 0) / completed.length
    : null;
  const report = {
    mode: 'real-model',
    auditMode: 'agent-audited',
    humanReviewed: false,
    datasetVersion: 'grading-stage3-2026-08-01',
    sampleCount: gradingStage3Dataset.length,
    strata: { correct: 10, wrong: 10, boundary: 10 },
    completedCount: completed.length,
    failedCount: results.length - completed.length,
    agreementRate,
    meanAbsoluteError,
    thresholds: { agreementRate: 0.9, meanAbsoluteError: 10 },
    results,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    outputPath,
    sampleCount: report.sampleCount,
    completedCount: report.completedCount,
    agreementRate,
    meanAbsoluteError,
  }, null, 2)}\n`);
  if (completed.length !== gradingStage3Dataset.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
