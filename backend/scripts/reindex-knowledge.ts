import '../src/config/env';
import prisma from '../src/config/prisma';
import {
  completeKnowledgeIndex,
  loadKnowledgeSourceAssessment,
  queueKnowledgeSource,
  type KnowledgeSourceType,
} from '../src/services/rag';

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}

function parseSourceType(): KnowledgeSourceType | undefined {
  const value = getArgument('source');
  if (!value) return undefined;
  if (value !== 'lesson' && value !== 'exercise') {
    throw new Error('--source 只支持 lesson 或 exercise');
  }
  return value;
}

async function main(): Promise<void> {
  const courseId = getArgument('course');
  const sourceType = parseSourceType();
  const candidates: Array<{
    sourceType: KnowledgeSourceType;
    sourceId: string;
  }> = [];

  if (!sourceType || sourceType === 'lesson') {
    const lessons = await prisma.lessons.findMany({
      where: {
        is_delete: 0,
        chapters: {
          is_delete: 0,
          ...(courseId ? { course_id: courseId } : {}),
          courses: { is_delete: 0 },
        },
      },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });
    candidates.push(
      ...lessons.map((lesson) => ({
        sourceType: 'lesson' as const,
        sourceId: lesson.id,
      }))
    );
  }

  if (!sourceType || sourceType === 'exercise') {
    const exercises = await prisma.exercises.findMany({
      where: {
        is_delete: 0,
        NOT: { source: 'ai' },
        lessons: {
          is_delete: 0,
          chapters: {
            is_delete: 0,
            ...(courseId ? { course_id: courseId } : {}),
            courses: { is_delete: 0 },
          },
        },
      },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });
    candidates.push(
      ...exercises.map((exercise) => ({
        sourceType: 'exercise' as const,
        sourceId: exercise.id,
      }))
    );
  }

  const totals = {
    candidates: candidates.length,
    ready: 0,
    failed: 0,
    stale: 0,
    invalid: 0,
    needs_content: 0,
    needs_review: 0,
    excluded: 0,
  };

  for (const candidate of candidates) {
    const assessment = await loadKnowledgeSourceAssessment(
      candidate.sourceType,
      candidate.sourceId
    );
    const source = assessment.source;
    if (!source) {
      totals.invalid += 1;
      continue;
    }
    const ticket = await prisma.$transaction((tx) =>
      queueKnowledgeSource(
        tx,
        source.sourceType,
        source.sourceId,
        source.sourceVersion
      )
    );
    const result = await completeKnowledgeIndex(ticket);
    totals[result.status] += 1;
    process.stdout.write(
      `${JSON.stringify({
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        status: result.status,
        chunkCount: result.chunkCount,
      })}\n`
    );
  }

  process.stdout.write(`${JSON.stringify({ totals })}\n`);
  if (totals.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
