import type { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import type { AiCodeReviewResult } from '../ai/code-review.service';

const SCORE_DEDUCTION = [0, 10, 20, 30];

interface CodeTestCase {
  input?: unknown;
  output?: unknown;
  expectedOutput?: unknown;
  name?: string;
}

interface CodeExerciseMetadata {
  language?: string;
  lang?: string;
  acceptedAnswers?: string[];
  testCases?: CodeTestCase[];
}

interface GradeCodeExerciseParams {
  userCode: string;
  correctAnswer: string;
  metadata: unknown;
  hintLevelUsed: number;
}

interface CodeGradeCheck {
  name: string;
  passed: boolean;
  strategy: string;
}

export interface CodeGradeResult {
  correct: boolean;
  score: number;
  feedback: string;
  language: string;
  compileSuccess: boolean | null;
  passedCount: number;
  totalCount: number;
  functionalScore: number;
  hintDeduction: number;
  errorType: string | null;
  testResult: Prisma.InputJsonValue;
}

function toMetadata(value: unknown): CodeExerciseMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as CodeExerciseMetadata;
}

function stripComments(code: string): string {
  return code
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'''[\s\S]*?'''/g, '')
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/#.*$/gm, '')
    .replace(/\/\/.*$/gm, '');
}

function normalizeCode(code: string): string {
  return stripComments(code)
    .replace(/;+$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSql(sql: string): string {
  const compact = stripComments(sql)
    .replace(/;+$/gm, '')
    .replace(/[`"]/g, '')
    .toLowerCase()
    .replace(/\s*([(),=<>])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return normalizeWhereAndParts(compact);
}

function normalizeWhereAndParts(sql: string): string {
  const whereMatch = sql.match(/^(.*\bwhere\b)(.+?)(\b(group by|order by|limit|having)\b.*)?$/i);
  if (!whereMatch) return sql;

  const prefix = whereMatch[1].trim();
  const whereBody = whereMatch[2].trim();
  const suffix = (whereMatch[3] || '').trim();
  const andParts = whereBody
    .split(/\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (andParts.length < 2) return sql;

  const normalizedWhere = andParts.sort().join(' and ');
  return [prefix, normalizedWhere, suffix].filter(Boolean).join(' ');
}

function detectLanguage(metadata: CodeExerciseMetadata, correctAnswer: string, userCode: string): string {
  const configured = metadata.language || metadata.lang;
  if (configured && configured.trim()) return configured.trim().toLowerCase();

  const sample = `${correctAnswer}\n${userCode}`.toLowerCase();
  if (/\b(select|insert|update|delete|create|alter|drop)\b/.test(sample)) return 'sql';

  return 'text';
}

function isSqlLanguage(language: string): boolean {
  return ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite'].includes(language);
}

function uniqueAnswers(correctAnswer: string, metadata: CodeExerciseMetadata): string[] {
  const acceptedAnswers = Array.isArray(metadata.acceptedAnswers) ? metadata.acceptedAnswers : [];
  return [correctAnswer, ...acceptedAnswers].filter((item): item is string => typeof item === 'string');
}

function gradeByStaticEquivalence(
  userCode: string,
  correctAnswer: string,
  metadata: CodeExerciseMetadata
): { correct: boolean; language: string; checks: CodeGradeCheck[]; strategy: string } {
  const language = detectLanguage(metadata, correctAnswer, userCode);
  const answers = uniqueAnswers(correctAnswer, metadata);
  const normalizedUserCode = normalizeCode(userCode);

  const normalizedMatch = answers.some((answer) => normalizedUserCode === normalizeCode(answer));
  if (normalizedMatch) {
    return {
      correct: true,
      language,
      strategy: 'normalized_code_match',
      checks: [{ name: '标准答案规范化匹配', passed: true, strategy: 'normalized_code_match' }],
    };
  }

  if (isSqlLanguage(language)) {
    const normalizedUserSql = normalizeSql(userCode);
    const sqlMatch = answers.some((answer) => normalizedUserSql === normalizeSql(answer));

    return {
      correct: sqlMatch,
      language,
      strategy: 'sql_static_equivalence',
      checks: [{ name: 'SQL 静态等价检查', passed: sqlMatch, strategy: 'sql_static_equivalence' }],
    };
  }

  return {
    correct: false,
    language,
    strategy: 'normalized_code_match',
    checks: [{ name: '标准答案规范化匹配', passed: false, strategy: 'normalized_code_match' }],
  };
}

export function gradeCodeExercise(params: GradeCodeExerciseParams): CodeGradeResult {
  const metadata = toMetadata(params.metadata);
  const { correct, language, checks, strategy } = gradeByStaticEquivalence(
    params.userCode,
    params.correctAnswer,
    metadata
  );

  const hintDeduction = SCORE_DEDUCTION[params.hintLevelUsed] || 0;
  const functionalScore = correct ? 100 : 0;
  const score = correct ? Math.max(0, functionalScore - hintDeduction) : 0;
  const passedCount = checks.filter((check) => check.passed).length;
  const totalCount = checks.length;
  const configuredTestCaseCount = Array.isArray(metadata.testCases) ? metadata.testCases.length : 0;

  const feedback = correct
    ? params.hintLevelUsed > 0
      ? `判题通过。使用了 ${params.hintLevelUsed} 级提示，扣 ${hintDeduction} 分，得分：${score} 分`
      : '判题通过'
    : isSqlLanguage(language)
      ? '答案还不正确。当前已支持 SQL 空格、大小写、末尾分号、部分 AND 条件顺序的差异；如果逻辑一致仍被判错，可以补充测试用例或可接受答案。'
      : '答案还不正确。当前后端先做静态等价判定，后续可以接入语言执行沙箱后按测试用例判定。';

  return {
    correct,
    score,
    feedback,
    language,
    compileSuccess: null,
    passedCount,
    totalCount,
    functionalScore,
    hintDeduction,
    errorType: correct ? null : 'wrong_answer',
    testResult: {
      rubricVersion: 'static-v1',
      strategy,
      checks: checks.map((check) => ({
        name: check.name,
        passed: check.passed,
        strategy: check.strategy,
      })),
      configuredTestCaseCount,
      note: configuredTestCaseCount > 0
        ? '题目已配置测试用例；当前版本尚未接入代码执行沙箱，因此本次仍使用静态等价判定。'
        : '当前版本使用静态等价判定，后续可接入代码执行沙箱升级为真实测试用例判题。',
    },
  };
}

export async function recordCodeSubmission(params: {
  userId: string;
  exerciseId: string;
  code: string;
  grade: CodeGradeResult;
}) {
  const latestSubmission = await prisma.code_submissions.aggregate({
    where: {
      user_id: params.userId,
      exercise_id: params.exerciseId,
      is_delete: 0,
    },
    _max: {
      submission_no: true,
    },
  });

  const submissionNo = (latestSubmission._max.submission_no || 0) + 1;

  return prisma.code_submissions.create({
    data: {
      user_id: params.userId,
      exercise_id: params.exerciseId,
      code: params.code,
      language: params.grade.language,
      status: params.grade.correct ? 'passed' : 'failed',
      submission_no: submissionNo,
      compile_success: params.grade.compileSuccess,
      passed_count: params.grade.passedCount,
      total_count: params.grade.totalCount,
      error_type: params.grade.errorType,
      test_result: params.grade.testResult,
      functional_score: params.grade.functionalScore,
      quality_score: 0,
      hint_deduction: params.grade.hintDeduction,
      final_score: params.grade.score,
      rubric_version: 'static-v1',
    },
  });
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function calculateAiReviewedFinalScore(
  review: AiCodeReviewResult,
  hintDeduction: number
): number {
  return clampScore(review.review.functionalScore + review.review.qualityScore - hintDeduction);
}

export async function applyAiCodeReviewToSubmission(params: {
  submissionId: string;
  review: AiCodeReviewResult;
  hintDeduction: number;
}) {
  const finalScore = calculateAiReviewedFinalScore(params.review, params.hintDeduction);

  return prisma.code_submissions.update({
    where: { id: params.submissionId },
    data: {
      status: params.review.review.isLikelyCorrect ? 'passed' : 'failed',
      error_type: params.review.review.isLikelyCorrect ? null : 'wrong_answer',
      functional_score: params.review.review.functionalScore,
      quality_score: params.review.review.qualityScore,
      final_score: finalScore,
      ai_review_status: 'completed',
      ai_review: {
        ...params.review.review,
        rawContent: params.review.rawContent,
      },
      model: params.review.model,
      rubric_version: params.review.rubricVersion,
    },
  });
}

export async function markCodeReviewFailed(params: {
  submissionId: string;
  error: unknown;
}) {
  const message = params.error instanceof Error ? params.error.message : 'AI_CODE_REVIEW_FAILED';

  return prisma.code_submissions.update({
    where: { id: params.submissionId },
    data: {
      ai_review_status: 'failed',
      ai_review: {
        error: message,
        fallback: 'static_grade',
        failedAt: new Date().toISOString(),
      },
    },
  });
}
