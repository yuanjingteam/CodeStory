import { randomUUID } from 'node:crypto';
import prisma from '../../config/prisma';
import { resolveShortId } from '../../utils/idTransform';
import { generateExerciseHint } from '../ai/exercise-hint.service';
import { logAiError } from '../ai/ai-chat-error.service';

const DEFAULT_AI_HINT_MAX_LEVEL = 3;

export async function recordHintLevel(
  exerciseId: string,
  userId: string,
  hintLevel: number
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "answer" (
      "id", "user_id", "exercise_id", "answer", "submission_count",
      "feedback", "score", "hint_level_used", "is_delete", "created_at", "updated_at"
    ) VALUES (
      ${randomUUID()}, ${userId}, ${exerciseId}, '', 0, '', 0, ${hintLevel}, 0,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("user_id", "exercise_id") DO UPDATE SET
      "hint_level_used" = GREATEST("answer"."hint_level_used", EXCLUDED."hint_level_used"),
      "is_delete" = 0,
      "updated_at" = CURRENT_TIMESTAMP
  `;
}

function resolveMaxHintLevel(hints: any): number {
  const configuredMaxLevel = hints?._meta?.max_level;
  if (!Number.isInteger(configuredMaxLevel)) {
    return DEFAULT_AI_HINT_MAX_LEVEL;
  }

  return Math.min(
    DEFAULT_AI_HINT_MAX_LEVEL,
    Math.max(1, configuredMaxLevel)
  );
}

export async function getExerciseHint(
  exerciseId: string,
  hintLevel: number,
  userId: string
): Promise<{ content: string; level: number; maxLevel: number } | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findFirst({
    where: {
      id: resolvedId,
      is_delete: 0,
      review_status: 'approved',
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
    include: {
      lessons: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!exercise) return null;

  const hints = exercise.hints as any;
  const maxLevel = resolveMaxHintLevel(hints);

  if (hintLevel < 1 || hintLevel > maxLevel) {
    return null;
  }

  const adminHints: string[] = [];
  for (let i = 1; i <= hintLevel; i++) {
    const hintContent = hints?.[`level_${i}`];
    if (typeof hintContent === 'string' && hintContent.trim()) {
      adminHints.push(hintContent.trim());
    }
  }

  let hintContent: string;
  try {
    hintContent = await generateExerciseHint({
      hintLevel,
      exerciseType: exercise.type,
      knowledge: exercise.knowledge || '',
      content: exercise.content,
      lessonContent: exercise.lessons.content || '',
      adminHints,
    });
  } catch (error) {
    if (adminHints.length === 0) throw error;
    logAiError('exercise-hint-admin-fallback', error);
    hintContent = adminHints[adminHints.length - 1];
  }

  await recordHintLevel(resolvedId, userId, hintLevel);

  return {
    content: hintContent,
    level: hintLevel,
    maxLevel,
  };
}

export async function getExerciseHintProgress(
  exerciseId: string,
  userId: string
): Promise<{ currentLevel: number; maxLevel: number } | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findFirst({
    where: {
      id: resolvedId,
      is_delete: 0,
      review_status: 'approved',
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
    select: {
      hints: true,
    },
  });

  if (!exercise) return null;

  const userAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
    select: {
      hint_level_used: true,
    },
  });

  const hints = exercise.hints as any;
  return {
    currentLevel: userAnswer?.hint_level_used || 0,
    maxLevel: resolveMaxHintLevel(hints),
  };
}

export async function getAcquiredHints(
  exerciseId: string,
  userId: string
): Promise<{
  hints: Array<{ level: number; content: string }>;
  currentLevel: number;
  maxLevel: number;
} | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findFirst({
    where: {
      id: resolvedId,
      is_delete: 0,
      review_status: 'approved',
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
    include: {
      lessons: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!exercise) return null;

  const userAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
  });

  const currentLevel = userAnswer?.hint_level_used || 0;
  const hints = exercise.hints as any;
  const maxLevel = resolveMaxHintLevel(hints);
  const acquiredHints = [];

  for (let i = 1; i <= currentLevel && i <= maxLevel; i++) {
    const hintContent = hints?.[`level_${i}`];

    if (hintContent) {
      acquiredHints.push({
        level: i,
        content: hintContent,
      });
    } else {
      const generatedHint = await generateExerciseHint({
        hintLevel: i,
        exerciseType: exercise.type,
        knowledge: exercise.knowledge || '',
        content: exercise.content,
        lessonContent: exercise.lessons.content || '',
        adminHints: [],
      });

      acquiredHints.push({
        level: i,
        content: generatedHint,
      });
    }
  }

  return {
    hints: acquiredHints,
    currentLevel,
    maxLevel,
  };
}
