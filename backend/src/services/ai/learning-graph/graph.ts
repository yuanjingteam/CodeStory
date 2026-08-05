import {
  Annotation,
  Command,
  END,
  interrupt,
  START,
  StateGraph,
} from '@langchain/langgraph';
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import prisma from '../../../config/prisma';
import { getExerciseHint } from '../../courses/exercise-hint.service';
import { submitExercise } from '../../courses/exercise.service';
import type {
  GuidedLearningInput,
  GuidedLearningPhase,
} from './types';
import { createGuidedLearningReview } from './review';

export const GuidedLearningState = Annotation.Root({
  runId: Annotation<string>,
  graphVersion: Annotation<string>,
  userId: Annotation<string>,
  lessonId: Annotation<string>,
  phase: Annotation<GuidedLearningPhase>,
  explanation: Annotation<string | null>,
  exerciseId: Annotation<string | null>,
  exerciseContent: Annotation<string | null>,
  exerciseType: Annotation<string | null>,
  hintLevel: Annotation<number>,
  hint: Annotation<string | null>,
  answer: Annotation<string | null>,
  feedback: Annotation<string | null>,
  score: Annotation<number | null>,
  correct: Annotation<boolean | null>,
  requiresHumanReview: Annotation<boolean>,
});

export type GuidedLearningGraphState =
  typeof GuidedLearningState.State;

async function explainNode(
  state: GuidedLearningGraphState
): Promise<Partial<GuidedLearningGraphState>> {
  const lesson = await prisma.lessons.findFirst({
    where: {
      id: state.lessonId,
      is_delete: 0,
      chapters: {
        is_delete: 0,
        courses: { is_delete: 0 },
      },
    },
    select: { title: true },
  });
  return {
    phase: 'EXPLAIN',
    explanation: lesson
      ? `先回顾“${lesson.title}”的核心内容，再完成一道已审核练习。`
      : '先回顾本节核心内容，再完成一道已审核练习。',
  };
}

async function questionNode(
  state: GuidedLearningGraphState
): Promise<Partial<GuidedLearningGraphState>> {
  const exercise = await prisma.exercises.findFirst({
    where: {
      lesson_id: state.lessonId,
      review_status: 'approved',
      is_delete: 0,
    },
    orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    select: { id: true, content: true, type: true },
  });
  if (!exercise) {
    return {
      phase: 'EMPTY',
      exerciseId: null,
      exerciseContent: null,
      exerciseType: null,
      feedback: '当前小节暂无已审核题目。',
    };
  }
  return {
    phase: 'QUESTION',
    exerciseId: exercise.id,
    exerciseContent: exercise.content,
    exerciseType: exercise.type,
  };
}

function waitAnswerNode(
  state: GuidedLearningGraphState
): Partial<GuidedLearningGraphState> {
  const input = interrupt({
    phase: 'WAIT_ANSWER',
    exerciseId: state.exerciseId,
    hintLevel: state.hintLevel,
  }) as GuidedLearningInput;
  return {
    phase: 'EVALUATE',
    answer: input.answer.trim(),
    hint: null,
  };
}

async function evaluateNode(
  state: GuidedLearningGraphState
): Promise<Partial<GuidedLearningGraphState>> {
  if (!state.exerciseId || !state.answer) {
    return {
      phase: 'REVIEW',
      feedback: '未收到有效答案，需要人工复核。',
      requiresHumanReview: true,
    };
  }
  const result = await submitExercise(
    state.exerciseId,
    state.answer,
    state.userId,
    {
      runId: state.runId,
      nodeName: 'evaluate',
      effectType: 'submit_answer',
      effectKey: `${state.runId}:evaluate:${state.hintLevel}`,
    }
  );
  if (!result) {
    return {
      phase: 'REVIEW',
      feedback: '当前题目已不可用，需要重新开始。',
      requiresHumanReview: true,
    };
  }
  return {
    phase: 'EVALUATE',
    correct: result.correct,
    score: result.score,
    feedback: result.feedback,
  };
}

async function hintNode(
  state: GuidedLearningGraphState
): Promise<Partial<GuidedLearningGraphState>> {
  if (!state.exerciseId || state.hintLevel >= 3) {
    return {
      phase: 'REVIEW',
      requiresHumanReview: true,
      feedback:
        state.feedback ||
        '三级提示后仍未通过，等待人工复核后再判断未掌握。',
    };
  }
  const nextLevel = state.hintLevel + 1;
  const hint = await getExerciseHint(
    state.exerciseId,
    nextLevel,
    state.userId,
    {
      runId: state.runId,
      nodeName: 'hint',
      effectType: 'record_hint',
      effectKey: `${state.runId}:hint:${nextLevel}`,
    }
  );
  if (!hint) {
    return {
      phase: 'REVIEW',
      requiresHumanReview: true,
      feedback: '提示不可用，等待人工复核。',
    };
  }
  return {
    phase: 'HINT',
    hintLevel: hint.level,
    hint: hint.content,
  };
}

async function reviewNode(
  state: GuidedLearningGraphState
): Promise<Partial<GuidedLearningGraphState>> {
  if (!state.correct && state.requiresHumanReview) {
    await createGuidedLearningReview(state);
  }
  return {
    phase: state.correct ? 'COMPLETE' : 'REVIEW',
    requiresHumanReview: !state.correct,
  };
}

export function createGuidedLearningGraph(
  checkpointer: PostgresSaver
) {
  return new StateGraph(GuidedLearningState)
    .addNode('explain', explainNode)
    .addNode('question', questionNode)
    .addNode('wait_answer', waitAnswerNode)
    .addNode('evaluate', evaluateNode)
    .addNode('provide_hint', hintNode)
    .addNode('review', reviewNode)
    .addEdge(START, 'explain')
    .addEdge('explain', 'question')
    .addConditionalEdges('question', (state) =>
      state.phase === 'EMPTY' ? END : 'wait_answer'
    )
    .addEdge('wait_answer', 'evaluate')
    .addConditionalEdges('evaluate', (state) =>
      state.correct ? 'review' : 'provide_hint'
    )
    .addConditionalEdges('provide_hint', (state) =>
      state.phase === 'REVIEW' ? 'review' : 'wait_answer'
    )
    .addEdge('review', END)
    .compile({ checkpointer });
}

export { Command };
