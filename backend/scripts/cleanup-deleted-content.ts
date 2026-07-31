import '../src/config/env';
import prisma from '../src/config/prisma';
import {
  cleanupExpiredContent,
  CONTENT_RETENTION_DAYS,
} from '../src/services/course-manage/content-retention.service';

async function main(): Promise<void> {
  if (!process.argv.includes('--execute')) {
    const cutoff = new Date(
      Date.now() -
        CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000
    );
    const [courses, chapters, lessons, exercises] =
      await Promise.all([
        prisma.courses.count({
          where: { is_delete: 1, deleted_at: { lte: cutoff } },
        }),
        prisma.chapters.count({
          where: { is_delete: 1, deleted_at: { lte: cutoff } },
        }),
        prisma.lessons.count({
          where: { is_delete: 1, deleted_at: { lte: cutoff } },
        }),
        prisma.exercises.count({
          where: { is_delete: 1, deleted_at: { lte: cutoff } },
        }),
      ]);
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          retentionDays: CONTENT_RETENTION_DAYS,
          expiredCandidates: {
            courses,
            chapters,
            lessons,
            exercises,
          },
          note: '实际执行仍会跳过存在学习记录的内容',
        },
        null,
        2
      )
    );
    return;
  }

  const result = await cleanupExpiredContent();
  console.log(JSON.stringify({ dryRun: false, result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
