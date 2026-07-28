import prisma from '../../config/prisma';
import { resolveShortId } from '../../utils/idTransform';
import { generateExerciseHint } from '../ai/exercise-hint.service';

const DEFAULT_AI_HINT_MAX_LEVEL = 3;

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

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
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
    hintContent = adminHints[adminHints.length - 1];
  }

  const existingAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
  });

  if (existingAnswer) {
    await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        hint_level_used: Math.max(existingAnswer.hint_level_used, hintLevel),
      },
    });
  } else {
    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: resolvedId,
        answer: '',
        submission_count: 0,
        feedback: '',
        score: 0,
        hint_level_used: hintLevel,
      },
    });
  }

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

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
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

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
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
