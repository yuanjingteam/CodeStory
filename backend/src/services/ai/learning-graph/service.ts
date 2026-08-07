import { randomUUID } from 'node:crypto';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import prisma from '../../../config/prisma';
import {
  getLearningGraphVersion,
  isLearningGraphEnabled,
} from '../../../config/ai';
import { getLessonAiContext } from '../lesson-context.service';
import { getOrCreateLessonChatSession } from '../lesson-session.service';
import {
  Command,
  createGuidedLearningGraph,
  type GuidedLearningGraphState,
} from './graph';
import {
  GUIDED_PHASE_CODE,
  GuidedLearningConflictError,
  GuidedLearningNotFoundError,
  GuidedLearningRestartRequiredError,
  type GuidedLearningPublicState,
} from './types';

let checkpointer: PostgresSaver | null = null;
let graph: ReturnType<typeof createGuidedLearningGraph> | null =
  null;

export interface GuidedLearningAdvanceHooks {
  afterGraphInvoke?: () => void | Promise<void>;
}

function assertEnabled(): void {
  if (!isLearningGraphEnabled()) {
    throw new GuidedLearningNotFoundError();
  }
}

function getGraphRuntime() {
  if (graph) return graph;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('缺少 DATABASE_URL');
  checkpointer = PostgresSaver.fromConnString(databaseUrl);
  graph = createGuidedLearningGraph(checkpointer);
  return graph;
}

function graphConfig(runId: string) {
  return {
    configurable: { thread_id: runId },
    durability: 'sync' as const,
  };
}

function toPublicState(
  values: Partial<GuidedLearningGraphState>,
  next: readonly string[],
  stateVersion: number
): GuidedLearningPublicState {
  const waiting = next.includes('wait_answer');
  const phase = waiting ? 'WAIT_ANSWER' : values.phase || 'INIT';
  return {
    runId: values.runId || '',
    graphVersion:
      values.graphVersion || getLearningGraphVersion(),
    stateVersion,
    phase,
    lessonId: values.lessonId || '',
    exerciseId: values.exerciseId || null,
    exerciseContent: values.exerciseContent || null,
    exerciseType: values.exerciseType || null,
    exerciseOptions: values.exerciseOptions || null,
    explanation: values.explanation || null,
    hintLevel: values.hintLevel || 0,
    hint: values.hint || null,
    feedback: values.feedback || null,
    score: values.score ?? null,
    correct: values.correct ?? null,
  };
}

async function readPublicState(
  runId: string,
  stateVersion: number
): Promise<GuidedLearningPublicState | null> {
  const snapshot = await getGraphRuntime().getState(
    graphConfig(runId)
  );
  const values = snapshot.values as Partial<GuidedLearningGraphState>;
  if (!values.runId) return null;
  return toPublicState(
    values,
    Array.from(snapshot.next),
    stateVersion
  );
}

async function projectState(
  sessionId: string,
  state: GuidedLearningPublicState
): Promise<void> {
  const stateCode = GUIDED_PHASE_CODE[state.phase];
  const terminal = ['REVIEW', 'COMPLETE', 'EMPTY', 'RESTART_REQUIRED']
    .includes(state.phase);
  await prisma.$transaction(async (tx) => {
    const projected = await tx.ai_chat_sessions.updateMany({
      where: {
        id: sessionId,
        current_run_id: state.runId,
        state_version: state.stateVersion,
      },
      data: {
        graph_version: state.graphVersion,
        state: stateCode,
        current_exercise_id: state.exerciseId,
        hint_level: state.hintLevel,
      },
    });
    // A concurrent restart may replace current_run_id while an older invocation is
    // finishing. Preserve a confirmed terminal lifecycle, but never revive a
    // superseded non-terminal run back to active.
    if (projected.count !== 1 && !terminal) return;
    await tx.guided_learning_runs.upsert({
      where: { run_id: state.runId },
      create: {
        run_id: state.runId,
        session_id: sessionId,
        graph_version: state.graphVersion,
        state: stateCode,
        status: terminal ? 'terminal' : 'active',
        completed_at: terminal ? new Date() : null,
      },
      update: {
        graph_version: state.graphVersion,
        state: stateCode,
        status: terminal ? 'terminal' : 'active',
        ...(terminal && { completed_at: new Date() }),
      },
    });
  });
}

async function getOwnedSession(
  userId: string,
  lessonId: string
) {
  return prisma.ai_chat_sessions.findFirst({
    where: {
      user_id: userId,
      lesson_id: lessonId,
      is_delete: 0,
    },
    select: {
      id: true,
      lesson_id: true,
      current_run_id: true,
      state_version: true,
      graph_version: true,
    },
  });
}

export async function startGuidedLearning(
  userId: string,
  lessonId: string
): Promise<GuidedLearningPublicState> {
  assertEnabled();
  const context = await getLessonAiContext(lessonId, undefined, {
    userId,
    query: '引导式学习',
  });
  if (!context) {
    throw new GuidedLearningNotFoundError('小节不存在或不可访问');
  }
  const session = await getOrCreateLessonChatSession(
    userId,
    context
  );
  const runId = randomUUID();
  const graphVersion = getLearningGraphVersion();
  const claimed = await prisma.$transaction(async (tx) => {
    const result = await tx.ai_chat_sessions.updateMany({
      where: {
        id: session.id,
        state_version: session.state_version,
      },
      data: {
        current_run_id: runId,
        state_version: { increment: 1 },
        graph_version: graphVersion,
        state: GUIDED_PHASE_CODE.INIT,
        current_exercise_id: null,
        hint_level: 0,
      },
    });
    if (result.count !== 1) return result;
    if (session.current_run_id) {
      await tx.guided_learning_runs.updateMany({
        where: {
          run_id: session.current_run_id,
          status: 'active',
        },
        data: { status: 'superseded' },
      });
    }
    await tx.guided_learning_runs.create({
      data: {
        run_id: runId,
        session_id: session.id,
        graph_version: graphVersion,
        state: GUIDED_PHASE_CODE.INIT,
      },
    });
    return result;
  });
  if (claimed.count !== 1) {
    const currentSession = await getOwnedSession(userId, lessonId);
    const current = currentSession?.current_run_id
      ? await readPublicState(
          currentSession.current_run_id,
          currentSession.state_version
        )
      : null;
    throw new GuidedLearningConflictError(current);
  }

  const stateVersion = session.state_version + 1;
  await getGraphRuntime().invoke(
    {
      runId,
      graphVersion,
      userId,
      lessonId: context.lessonId,
      phase: 'INIT',
      explanation: null,
      exerciseId: null,
      exerciseContent: null,
      exerciseType: null,
      exerciseOptions: null,
      hintLevel: 0,
      hint: null,
      answer: null,
      feedback: null,
      score: null,
      correct: null,
    },
    graphConfig(runId)
  );
  const state = await readPublicState(runId, stateVersion);
  if (!state) throw new Error('引导式学习 checkpoint 创建失败');
  await projectState(session.id, state);
  return state;
}

export async function advanceGuidedLearning(params: {
  userId: string;
  lessonId: string;
  runId: string;
  expectedStateVersion: number;
  answer: string;
}, hooks: GuidedLearningAdvanceHooks = {}): Promise<GuidedLearningPublicState> {
  assertEnabled();
  const context = await getLessonAiContext(params.lessonId);
  if (!context) {
    throw new GuidedLearningNotFoundError(
      '小节不存在或不可访问'
    );
  }
  const lessonId = context.lessonId;
  const session = await getOwnedSession(
    params.userId,
    lessonId
  );
  if (!session || session.current_run_id !== params.runId) {
    throw new GuidedLearningNotFoundError(
      '运行不存在或已被新的学习运行替代'
    );
  }
  const current = await readPublicState(
    params.runId,
    session.state_version
  );
  if (session.graph_version !== getLearningGraphVersion()) {
    const restartState: GuidedLearningPublicState = {
      ...(current || {
        runId: params.runId,
        graphVersion: session.graph_version || 'unknown',
        stateVersion: session.state_version,
        phase: 'RESTART_REQUIRED',
        lessonId,
        exerciseId: null,
        exerciseContent: null,
        exerciseType: null,
        exerciseOptions: null,
        explanation: null,
        hintLevel: 0,
        hint: null,
        feedback: null,
        score: null,
        correct: null,
      }),
      phase: 'RESTART_REQUIRED',
    };
    await projectState(session.id, restartState);
    throw new GuidedLearningRestartRequiredError(restartState);
  }
  const claimed = await prisma.ai_chat_sessions.updateMany({
    where: {
      id: session.id,
      current_run_id: params.runId,
      state_version: params.expectedStateVersion,
    },
    data: { state_version: { increment: 1 } },
  });
  if (claimed.count !== 1) {
    throw new GuidedLearningConflictError(current);
  }
  const stateVersion = params.expectedStateVersion + 1;
  await getGraphRuntime().invoke(
    new Command({ resume: { answer: params.answer } }),
    graphConfig(params.runId)
  );
  await hooks.afterGraphInvoke?.();
  const state = await readPublicState(params.runId, stateVersion);
  if (!state) {
    throw new GuidedLearningNotFoundError();
  }
  await projectState(session.id, state);
  return state;
}

export async function resumeGuidedLearning(
  userId: string,
  lessonId: string,
  runId: string
): Promise<GuidedLearningPublicState> {
  assertEnabled();
  const context = await getLessonAiContext(lessonId);
  if (!context) {
    throw new GuidedLearningNotFoundError(
      '小节不存在或不可访问'
    );
  }
  const session = await getOwnedSession(
    userId,
    context.lessonId
  );
  if (!session || session.current_run_id !== runId) {
    throw new GuidedLearningNotFoundError();
  }
  const state = await readPublicState(runId, session.state_version);
  if (!state) throw new GuidedLearningNotFoundError();
  if (session.graph_version !== getLearningGraphVersion()) {
    const restartState = {
      ...state,
      phase: 'RESTART_REQUIRED' as const,
    };
    await projectState(session.id, restartState);
    throw new GuidedLearningRestartRequiredError(restartState);
  }
  await projectState(session.id, state);
  return state;
}

export async function reconcileGuidedLearningProjection(params: {
  sessionId: string;
  runId: string;
  stateVersion: number;
}): Promise<GuidedLearningPublicState | null> {
  const state = await readPublicState(
    params.runId,
    params.stateVersion
  );
  if (!state) return null;
  const projected =
    state.graphVersion === getLearningGraphVersion()
      ? state
      : { ...state, phase: 'RESTART_REQUIRED' as const };
  await projectState(params.sessionId, projected);
  return projected;
}

export async function closeGuidedLearningRuntime(): Promise<void> {
  if (checkpointer) await checkpointer.end();
  checkpointer = null;
  graph = null;
}
