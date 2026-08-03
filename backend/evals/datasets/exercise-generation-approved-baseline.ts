import type { ApprovedLessonEmbedding } from '../exercise-generation-duplicate';

/**
 * Small, committed fixture for the deterministic stage-2 duplicate pre-screen.
 * These vectors intentionally stand in for embeddings exported from approved
 * exercises; production runs use the same lesson-scoped query and threshold.
 */
export const exerciseGenerationApprovedBaseline: ApprovedLessonEmbedding[] = [
  { lessonId: 'lesson-sql-where', exerciseId: 'approved-sql-001', embedding: [1, 0, 0] },
  { lessonId: 'lesson-python-branch', exerciseId: 'approved-python-001', embedding: [0, 1, 0] },
];

