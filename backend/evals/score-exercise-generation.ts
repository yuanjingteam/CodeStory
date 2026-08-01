import fs from 'node:fs';
import path from 'node:path';

interface GenerationAttempt {
  id: string;
  firstPassStructured: boolean;
  repaired: boolean;
  finalSuccess: boolean;
  modelCallCount: number;
  validCandidateCount: number;
  answerCorrect?: boolean | null;
  agentAnswerCorrect?: boolean | null;
  machineDuplicate?: boolean | null;
  humanConfirmedDuplicate?: boolean | null;
  agentConfirmedDuplicate?: boolean | null;
  accepted?: boolean | null;
}

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function round(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(4));
}

const inputPath = path.resolve(
  process.cwd(),
  getArgument('input') ||
    'evals/datasets/exercise-generation-results.json'
);
const outputValue = getArgument('output');
const outputPath = outputValue
  ? path.resolve(process.cwd(), outputValue)
  : null;

if (!fs.existsSync(inputPath)) {
  throw new Error(
    `出题评测输入不存在：${inputPath}。请传入 --input=<JSON 路径>。`
  );
}

const attempts = JSON.parse(
  fs.readFileSync(inputPath, 'utf8')
) as GenerationAttempt[];
if (!Array.isArray(attempts) || attempts.length === 0) {
  throw new Error('出题评测输入必须是非空数组。');
}

for (const attempt of attempts) {
  if (
    !attempt.id ||
    !Number.isInteger(attempt.modelCallCount) ||
    attempt.modelCallCount < 1 ||
    !Number.isInteger(attempt.validCandidateCount) ||
    attempt.validCandidateCount < 0
  ) {
    throw new Error(`评测记录 ${attempt.id || '<unknown>'} 字段无效。`);
  }
}

const totalAttempts = attempts.length;
const finalSuccesses = attempts.filter(
  (attempt) => attempt.finalSuccess
).length;
const firstPassSuccesses = attempts.filter(
  (attempt) => attempt.firstPassStructured
).length;
const repairedSuccesses = attempts.filter(
  (attempt) => attempt.finalSuccess && attempt.repaired
).length;
const validCandidates = attempts.reduce(
  (sum, attempt) => sum + attempt.validCandidateCount,
  0
);
const modelCalls = attempts.reduce(
  (sum, attempt) => sum + attempt.modelCallCount,
  0
);
const answerReviews = attempts.filter(
  (attempt) => typeof attempt.answerCorrect === 'boolean'
);
const duplicateReviews = attempts.filter(
  (attempt) =>
    typeof attempt.humanConfirmedDuplicate === 'boolean'
);
const agentAnswerReviews = attempts.filter(
  (attempt) => typeof attempt.agentAnswerCorrect === 'boolean'
);
const agentDuplicateReviews = attempts.filter(
  (attempt) => typeof attempt.agentConfirmedDuplicate === 'boolean'
);
const adoptionSamples = attempts.filter(
  (attempt) => typeof attempt.accepted === 'boolean'
);

const report = {
  generatedAt: new Date().toISOString(),
  input: path.relative(process.cwd(), inputPath),
  sampleSize: totalAttempts,
  metrics: {
    firstPassStructuredRate: round(
      ratio(firstPassSuccesses, totalAttempts)
    ),
    repairedSuccessRate: round(
      ratio(firstPassSuccesses + repairedSuccesses, totalAttempts)
    ),
    finalFailureRate: round(
      ratio(totalAttempts - finalSuccesses, totalAttempts)
    ),
    modelCallsPerValidCandidate: round(
      ratio(modelCalls, validCandidates)
    ),
    answerAccuracy: round(
      ratio(
        answerReviews.filter((attempt) => attempt.answerCorrect).length,
        answerReviews.length
      )
    ),
    agentAuditedAnswerAccuracy: round(
      ratio(
        agentAnswerReviews.filter((attempt) => attempt.agentAnswerCorrect).length,
        agentAnswerReviews.length
      )
    ),
    humanConfirmedDuplicateRate: round(
      ratio(
        duplicateReviews.filter(
          (attempt) => attempt.humanConfirmedDuplicate
        ).length,
        duplicateReviews.length
      )
    ),
    agentAuditedDuplicateRate: round(
      ratio(
        agentDuplicateReviews.filter((attempt) => attempt.agentConfirmedDuplicate).length,
        agentDuplicateReviews.length
      )
    ),
    machineDuplicateCount: attempts.filter(
      (attempt) => attempt.machineDuplicate
    ).length,
    administratorAdoptionRate: round(
      ratio(
        adoptionSamples.filter((attempt) => attempt.accepted).length,
        adoptionSamples.length
      )
    ),
  },
  denominators: {
    generationAttempts: totalAttempts,
    validCandidates,
    answerReviews: answerReviews.length,
    agentAnswerReviews: agentAnswerReviews.length,
    duplicateReviews: duplicateReviews.length,
    agentDuplicateReviews: agentDuplicateReviews.length,
    adoptionSamples: adoptionSamples.length,
  },
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized, 'utf8');
}
process.stdout.write(serialized);
