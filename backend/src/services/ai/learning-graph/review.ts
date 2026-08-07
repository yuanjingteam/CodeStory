import prisma from '../../../config/prisma';
import type { GuidedLearningGraphState } from './graph';

// 三级提示后仍未通过时，直接给出参考答案与解析结束本轮，
// 不再建人工复核单。掌握度仍由 submitExercise 的事件矩阵决定，不额外下调。
export async function getGuidedLearningSolution(
  state: GuidedLearningGraphState
): Promise<{ answer: string; analysis: string } | null> {
  if (!state.exerciseId) return null;
  const exercise = await prisma.exercises.findUnique({
    where: { id: state.exerciseId },
    select: { answer: true, analysis: true },
  });
  if (!exercise) return null;
  return {
    answer: exercise.answer,
    analysis: exercise.analysis || '',
  };
}
