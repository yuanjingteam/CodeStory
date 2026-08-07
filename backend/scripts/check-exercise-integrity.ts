import '../src/config/env';
import prisma from '../src/config/prisma';
import {
  inspectChoiceExercise,
  type ChoiceExerciseIssue,
} from '../src/services/courses/choice-exercise-integrity';

type IssueTally = Partial<Record<ChoiceExerciseIssue, number>>;

function tally(counter: IssueTally, issue: ChoiceExerciseIssue): void {
  counter[issue] = (counter[issue] || 0) + 1;
}

// 结构不变量查不出内容被编码毁掉：乱码是自洽的，answer ∈ options 照样成立。
// 用非 UTF-8 字节写库时解码器留下的 U+FFFD 是这类损坏的确凿痕迹，题目文本里
// 不存在任何正当用途。它与 blocked 分开计数——读取侧不拦（题还答得了），
// 但必须让检查变红，因为学生看到的是一堆问号。
function isGarbled(row: {
  content: string;
  answer: string | null;
  analysis: string | null;
  knowledge: string | null;
  metadata: unknown;
}): boolean {
  return [
    row.content,
    row.answer || '',
    row.analysis || '',
    row.knowledge || '',
    JSON.stringify(row.metadata ?? null),
  ].some((text) => text.includes('�'));
}

async function main() {
  // 含 draft：坏草稿要在审核人点「直接采用」之前就被看见。
  // 软删行不扫——学生不可达，且 content:cleanup 会按保留期清理。
  const exercises = await prisma.exercises.findMany({
    where: {
      type: 'single_choice',
      is_delete: 0,
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
    select: {
      id: true,
      lesson_id: true,
      review_status: true,
      content: true,
      answer: true,
      analysis: true,
      knowledge: true,
      metadata: true,
    },
  });

  let usable = 0;
  let blocked = 0;
  let warned = 0;
  let garbled = 0;
  let failed = 0;
  const garbledIds: string[] = [];
  const blockedBy: IssueTally = {};
  const warnedBy: IssueTally = {};
  const blockedIds: string[] = [];
  const warnedIds: string[] = [];

  for (const exercise of exercises) {
    try {
      const inspection = inspectChoiceExercise(exercise);
      if (inspection.usable) {
        usable += 1;
      } else {
        blocked += 1;
        blockedIds.push(exercise.id);
        tally(blockedBy, inspection.blockedBy);
        console.error(
          `[exercise-integrity] id=${exercise.id} lesson=${exercise.lesson_id} status=${exercise.review_status} blocked=${inspection.blockedBy}`
        );
      }
      if (isGarbled(exercise)) {
        garbled += 1;
        garbledIds.push(exercise.id);
        console.error(
          `[exercise-integrity] id=${exercise.id} lesson=${exercise.lesson_id} status=${exercise.review_status} garbled=U+FFFD`
        );
      }
      if (inspection.warnings.length > 0) {
        warned += 1;
        warnedIds.push(exercise.id);
        inspection.warnings.forEach((issue) => tally(warnedBy, issue));
        console.error(
          `[exercise-integrity] id=${exercise.id} lesson=${exercise.lesson_id} status=${exercise.review_status} warn=${inspection.warnings.join(',')}`
        );
      }
    } catch (error) {
      failed += 1;
      console.error(
        `[exercise-integrity] id=${exercise.id}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      scanned: exercises.length,
      usable,
      blocked,
      warned,
      garbled,
      failed,
      blockedBy,
      warnedBy,
      blockedIds,
      warnedIds,
      garbledIds,
    })}\n`
  );

  // 只有警告时退 0：干扰项重复是内容质量问题，不该让检查永久红着。
  // 乱码则必须红——学生看到的是一堆问号，没有任何正当情形。
  if (blocked > 0 || garbled > 0 || failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
