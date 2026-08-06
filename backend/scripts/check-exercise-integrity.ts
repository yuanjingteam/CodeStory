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
      answer: true,
      metadata: true,
    },
  });

  let usable = 0;
  let blocked = 0;
  let warned = 0;
  let failed = 0;
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
      failed,
      blockedBy,
      warnedBy,
      blockedIds,
      warnedIds,
    })}\n`
  );

  // 只有警告时退 0：干扰项重复是内容质量问题，不该让检查永久红着。
  if (blocked > 0 || failed > 0) {
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
