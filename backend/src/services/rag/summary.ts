import prisma from '../../config/prisma';
import type {
  KnowledgeIndexSummary,
  PersistentKnowledgeIndexStatus,
} from './types';

interface ExpectedKnowledgeSource {
  sourceType: 'lesson' | 'exercise';
  sourceId: string;
}

interface KnowledgeStateSnapshot {
  source_type: string;
  source_id: string;
  status: string;
  updated_at: Date;
}

function resolveSummaryStatus(counts: {
  total: number;
  ready: number;
  pending: number;
  failed: number;
  needsContent: number;
  needsReview: number;
  excluded: number;
  notIndexed: number;
}): PersistentKnowledgeIndexStatus {
  if (counts.total === 0 || counts.notIndexed === counts.total) {
    return 'not_indexed';
  }
  const actionableTotal = counts.total - counts.excluded;
  if (actionableTotal === 0) return 'excluded';
  if (counts.needsContent > 0) return 'needs_content';
  if (counts.needsReview > 0) return 'needs_review';
  if (counts.ready === actionableTotal) return 'ready';
  if (counts.pending === actionableTotal) return 'pending';
  if (counts.failed === actionableTotal) return 'failed';
  return 'partial';
}

export function summarizeKnowledgeStates(
  expectedSources: ExpectedKnowledgeSource[],
  states: KnowledgeStateSnapshot[]
): KnowledgeIndexSummary {
  const stateBySource = new Map(
    states.map((state) => [
      `${state.source_type}:${state.source_id}`,
      state,
    ])
  );
  let readySources = 0;
  let pendingSources = 0;
  let failedSources = 0;
  let needsContentSources = 0;
  let needsReviewSources = 0;
  let excludedSources = 0;
  let notIndexedSources = 0;
  let updatedAt: Date | null = null;

  for (const source of expectedSources) {
    const state = stateBySource.get(
      `${source.sourceType}:${source.sourceId}`
    );
    if (!state) {
      notIndexedSources += 1;
      continue;
    }
    if (!updatedAt || state.updated_at > updatedAt) {
      updatedAt = state.updated_at;
    }
    if (state.status === 'ready') {
      readySources += 1;
    } else if (state.status === 'pending') {
      pendingSources += 1;
    } else if (state.status === 'needs_content') {
      needsContentSources += 1;
    } else if (state.status === 'needs_review') {
      needsReviewSources += 1;
    } else if (state.status === 'excluded') {
      excludedSources += 1;
    } else {
      failedSources += 1;
    }
  }

  const totalSources = expectedSources.length;
  return {
    status: resolveSummaryStatus({
      total: totalSources,
      ready: readySources,
      pending: pendingSources,
      failed: failedSources,
      needsContent: needsContentSources,
      needsReview: needsReviewSources,
      excluded: excludedSources,
      notIndexed: notIndexedSources,
    }),
    totalSources,
    readySources,
    pendingSources,
    failedSources,
    needsContentSources,
    needsReviewSources,
    excludedSources,
    notIndexedSources,
    updatedAt,
  };
}

export function aggregateKnowledgeIndexSummaries(
  summaries: KnowledgeIndexSummary[]
): KnowledgeIndexSummary {
  const totals = summaries.reduce(
    (result, summary) => ({
      totalSources: result.totalSources + summary.totalSources,
      readySources: result.readySources + summary.readySources,
      pendingSources:
        result.pendingSources + summary.pendingSources,
      failedSources:
        result.failedSources + summary.failedSources,
      needsContentSources:
        result.needsContentSources + summary.needsContentSources,
      needsReviewSources:
        result.needsReviewSources + summary.needsReviewSources,
      excludedSources:
        result.excludedSources + summary.excludedSources,
      notIndexedSources:
        result.notIndexedSources + summary.notIndexedSources,
      updatedAt:
        !result.updatedAt ||
        (summary.updatedAt && summary.updatedAt > result.updatedAt)
          ? summary.updatedAt
          : result.updatedAt,
    }),
    {
      totalSources: 0,
      readySources: 0,
      pendingSources: 0,
      failedSources: 0,
      needsContentSources: 0,
      needsReviewSources: 0,
      excludedSources: 0,
      notIndexedSources: 0,
      updatedAt: null as Date | null,
    }
  );

  return {
    ...totals,
    status: resolveSummaryStatus({
      total: totals.totalSources,
      ready: totals.readySources,
      pending: totals.pendingSources,
      failed: totals.failedSources,
      needsContent: totals.needsContentSources,
      needsReview: totals.needsReviewSources,
      excluded: totals.excludedSources,
      notIndexed: totals.notIndexedSources,
    }),
  };
}

export async function getLessonIndexSummaries(
  lessons: Array<{
    id: string;
    exercises: Array<{
      id: string;
      source: string | null;
      is_delete?: number;
    }>;
  }>
): Promise<Map<string, KnowledgeIndexSummary>> {
  const sourcesByLesson = new Map<
    string,
    ExpectedKnowledgeSource[]
  >();
  const sourceIds: string[] = [];

  for (const lesson of lessons) {
    const sources: ExpectedKnowledgeSource[] = [
      { sourceType: 'lesson', sourceId: lesson.id },
      ...lesson.exercises
        .filter(
          (exercise) =>
            exercise.is_delete !== 1 && exercise.source !== 'ai'
        )
        .map((exercise) => ({
          sourceType: 'exercise' as const,
          sourceId: exercise.id,
        })),
    ];
    sourcesByLesson.set(lesson.id, sources);
    sourceIds.push(...sources.map((source) => source.sourceId));
  }

  const states =
    sourceIds.length === 0
      ? []
      : await prisma.knowledge_index_state.findMany({
          where: { source_id: { in: sourceIds } },
          select: {
            source_type: true,
            source_id: true,
            status: true,
            updated_at: true,
          },
        });

  return new Map(
    lessons.map((lesson) => [
      lesson.id,
      summarizeKnowledgeStates(
        sourcesByLesson.get(lesson.id) || [],
        states
      ),
    ])
  );
}

export async function getLessonIndexSummary(
  lessonId: string
): Promise<KnowledgeIndexSummary> {
  const lesson = await prisma.lessons.findFirst({
    where: { id: lessonId, is_delete: 0 },
    select: {
      id: true,
      exercises: {
        where: { is_delete: 0 },
        select: { id: true, source: true, is_delete: true },
      },
    },
  });
  if (!lesson) {
    return summarizeKnowledgeStates([], []);
  }
  const summaries = await getLessonIndexSummaries([lesson]);
  return summaries.get(lesson.id)!;
}
