// 选择题可用性判定：写入校验与读取拦截共用同一套规则。
//
// 读写两侧刻意不对称，改动前先读这段：
// - 写入侧（exercise-manage.ts）拿到的是未归一化的入参，先 trim 再存，
//   规则严格——warning 也当错误，不放松既有闸门。
// - 读取侧拿到的是已落库的行，不能 trim：判分比的是原值
//   （exercise.service.ts 的 options[i] === exercise.answer）。规则宽松，
//   只拒真正不可能答对的题，免得把在线可答的题拦下线。
export type ChoiceExerciseIssue =
  | 'OPTIONS_MISSING'
  | 'OPTIONS_TOO_FEW'
  | 'OPTION_BLANK'
  | 'ANSWER_BLANK'
  | 'ANSWER_NOT_IN_OPTIONS'
  | 'ANSWER_AMBIGUOUS'
  | 'DUPLICATE_DISTRACTOR';

export type ChoiceExerciseInspection =
  | { usable: true; options: string[]; warnings: ChoiceExerciseIssue[] }
  | {
      usable: false;
      blockedBy: ChoiceExerciseIssue;
      warnings: ChoiceExerciseIssue[];
    };

export interface ChoiceExerciseRow {
  answer: string | null;
  metadata: unknown;
}

export class ChoiceExerciseUnusableError extends Error {
  constructor(readonly issue: ChoiceExerciseIssue) {
    super(`选择题不可作答：${issue}`);
    this.name = 'ChoiceExerciseUnusableError';
  }
}

function readOptions(metadata: unknown): string[] | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const options = (metadata as { options?: unknown }).options;
  if (!Array.isArray(options)) return null;
  return options.map((option) => String(option));
}

export function inspectChoiceExercise(
  row: ChoiceExerciseRow
): ChoiceExerciseInspection {
  const warnings: ChoiceExerciseIssue[] = [];
  const blocked = (blockedBy: ChoiceExerciseIssue): ChoiceExerciseInspection => ({
    usable: false,
    blockedBy,
    warnings,
  });

  const options = readOptions(row.metadata);
  if (!options) return blocked('OPTIONS_MISSING');
  if (options.length < 2) return blocked('OPTIONS_TOO_FEW');
  if (options.some((option) => !option.trim())) return blocked('OPTION_BLANK');

  const answer = row.answer || '';
  if (!answer.trim()) return blocked('ANSWER_BLANK');

  const matched = options.filter((option) => option === answer);
  if (matched.length === 0) return blocked('ANSWER_NOT_IN_OPTIONS');
  if (matched.length > 1) return blocked('ANSWER_AMBIGUOUS');

  // 答案唯一，重复只发生在干扰项之间：题目仍可答且判分正确，只是选项长得一样。
  if (new Set(options).size !== options.length) {
    warnings.push('DUPLICATE_DISTRACTOR');
  }

  return { usable: true, options, warnings };
}

/** 写入侧用：warning 一并视为错误。 */
export function findChoiceExerciseWriteIssue(
  row: ChoiceExerciseRow
): ChoiceExerciseIssue | null {
  const inspection = inspectChoiceExercise(row);
  if (!inspection.usable) return inspection.blockedBy;
  return inspection.warnings[0] ?? null;
}
