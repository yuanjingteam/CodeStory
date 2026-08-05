import { Router, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getAiTutorPromptVersion } from '../config/ai';
import { getLessonAiContext } from '../services/ai/lesson-context.service';
import {
  getInvalidCitationIndexes,
  getLessonChatSources,
  getLessonTutorPromptRevision,
  normalizeLessonChatAnswer,
  resolveAnswerScope,
  streamLessonChat,
} from '../services/ai/lesson-chat.service';
import type {
  LessonAnswerScope,
  LessonAnswerScopeRequest,
  LessonChatSourceReference,
  LessonEvidenceQuality,
  LessonTutorPromptRevision,
  LessonTutorPromptVersion,
} from '../services/ai/lesson-chat.types';
import {
  createAiChatErrorPayload,
  logAiError,
  sendAiChatError,
  type AiChatErrorCode,
} from '../services/ai/ai-chat-error.service';
import {
  appendLessonChatExchange,
  clearLessonChatMessages,
  getLessonChatMessages,
  getOrCreateLessonChatSession,
  getRecentLessonChatMessages,
} from '../services/ai/lesson-session.service';
import type { LessonChatMessageType } from '../services/ai/lesson-session.service';
import {
  getExerciseHint,
  getExerciseHintProgress,
} from '../services/courses/exercise-hint.service';
import {
  isLearningGraphEnabled,
} from '../config/ai';
import guidedLearningRouter from './guided-learning';
import {
  GUIDED_LEARNING_PHASES,
  type GuidedLearningPhase,
} from '../services/ai/learning-graph/types';

const router = Router();
const MAX_QUESTION_LENGTH = 2_000;
const MAX_CURRENT_CODE_LENGTH = 12_000;

if (isLearningGraphEnabled()) {
  router.use('/guided', guidedLearningRouter);
}

interface StreamEvent {
  type:
    | 'start'
    | 'state'
    | 'context'
    | 'token'
    | 'done'
    | 'error';
  content?: string;
  message?: string;
  sessionId?: string;
  code?: AiChatErrorCode;
  answerScope?: LessonAnswerScope;
  promptVersion?: LessonTutorPromptVersion;
  promptRevision?: LessonTutorPromptRevision;
  evidenceQuality?: LessonEvidenceQuality;
  sources?: LessonChatSourceReference[];
  guidedState?: {
    runId: string;
    stateVersion: number;
    phase: GuidedLearningPhase;
    hintLevel: number;
  };
}

function writeEvent(res: Response, event: StreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
}

// 提示只在满级时不带「提示 N/N」前缀，避免用完后每次都显示成「提示 3/3」
function formatHintMessage(
  content: string,
  level: number,
  maxLevel: number,
  exhausted: boolean
): string {
  return exhausted ? content : `提示 ${level}/${maxLevel}\n\n${content}`;
}

function resolveMessageType(
  hintRequest: boolean,
  currentCode: string,
  hasExercise: boolean
): LessonChatMessageType {
  if (hasExercise && hintRequest) return 'hint';
  if (hasExercise && currentCode) return 'code_analysis';
  return 'chat';
}

async function getNextHintMessage(
  exerciseId: string,
  userId: string
): Promise<
  { content: string; level: number; maxLevel: number; exhausted: boolean } | null
> {
  const progress = await getExerciseHintProgress(exerciseId, userId);
  if (!progress) return null;

  if (progress.currentLevel >= progress.maxLevel) {
    return {
      level: progress.currentLevel,
      maxLevel: progress.maxLevel,
      exhausted: true,
      content: `这道题的 ${progress.maxLevel} 级提示已经全部使用完了。你可以先提交一次答案，我会根据你的作答情况帮你分析；也可以把当前思路发给我，我帮你检查卡在哪里。`,
    };
  }

  const hint = await getExerciseHint(
    exerciseId,
    progress.currentLevel + 1,
    userId
  );
  return hint ? { ...hint, exhausted: false } : null;
}

router.get('/chat/history', authMiddleware, async (req, res) => {
  const userId = typeof req.user?.id === 'string' ? req.user.id : '';
  const lessonId = typeof req.query.lessonId === 'string' ? req.query.lessonId.trim() : '';

  if (!userId) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  if (!lessonId) {
    return res.status(400).json({ code: 400, message: '小节不能为空' });
  }

  try {
    const context = await getLessonAiContext(lessonId);
    if (!context) {
      return res.status(404).json({ code: 404, message: '小节不存在' });
    }

    const session = await getOrCreateLessonChatSession(userId, context);
    const messages = await getLessonChatMessages(session.id);

    return res.json({
      code: 200,
      message: '获取成功',
      data: {
        sessionId: session.id,
        messages,
        guidedModeAvailable: isLearningGraphEnabled(),
        guidedRun:
          isLearningGraphEnabled() && session.current_run_id
            ? {
                runId: session.current_run_id,
                stateVersion: session.state_version,
                graphVersion: session.graph_version,
              }
            : null,
      },
    });
  } catch (error) {
    console.error('获取 AI 对话历史失败:', error);
    return res.status(500).json({ code: 500, message: '获取 AI 对话历史失败' });
  }
});

router.delete('/chat/history', authMiddleware, async (req, res) => {
  const userId = typeof req.user?.id === 'string' ? req.user.id : '';
  const lessonId =
    typeof req.query.lessonId === 'string' ? req.query.lessonId.trim() : '';

  if (!userId) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  if (!lessonId) {
    return res.status(400).json({ code: 400, message: '小节不能为空' });
  }

  try {
    const context = await getLessonAiContext(lessonId);
    if (!context) {
      return res.status(404).json({ code: 404, message: '小节不存在' });
    }

    const deletedCount = await clearLessonChatMessages(
      userId,
      context.lessonId
    );

    return res.json({
      code: 200,
      message: '清空成功',
      data: { deletedCount },
    });
  } catch (error) {
    console.error('清空 AI 对话历史失败:', error);
    return res.status(500).json({
      code: 500,
      message: '清空 AI 对话历史失败',
    });
  }
});

router.post('/chat/stream', authMiddleware, async (req, res) => {
  const userId = typeof req.user?.id === 'string' ? req.user.id : '';
  const lessonId = typeof req.body.lessonId === 'string' ? req.body.lessonId.trim() : '';
  const exerciseId =
    typeof req.body.exerciseId === 'string' ? req.body.exerciseId.trim() : undefined;
  const question = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  const currentCode =
    typeof req.body.currentCode === 'string' ? req.body.currentCode.trim() : '';
  const requestedAnswerScope =
    typeof req.body.answerScope === 'string'
      ? req.body.answerScope.trim()
      : 'auto';
  // 只认客户端的显式提示请求（「给我提示」按钮），自由输入一律走 LLM，不消耗提示等级
  const hintRequest = req.body.hintRequest === true;

  if (!userId) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  if (!lessonId || !question) {
    return sendAiChatError(res, 400, 'AI_REQUEST_INVALID', '小节和问题不能为空');
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return sendAiChatError(
      res,
      400,
      'AI_REQUEST_INVALID',
      `问题不能超过 ${MAX_QUESTION_LENGTH} 个字符`
    );
  }

  if (currentCode.length > MAX_CURRENT_CODE_LENGTH) {
    return sendAiChatError(
      res,
      400,
      'AI_REQUEST_INVALID',
      `当前代码不能超过 ${MAX_CURRENT_CODE_LENGTH} 个字符`
    );
  }
  if (
    !['auto', 'course', 'extended'].includes(
      requestedAnswerScope
    )
  ) {
    return sendAiChatError(
      res,
      400,
      'AI_REQUEST_INVALID',
      '回答范围无效'
    );
  }

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort();
  });

  try {
    const context = await getLessonAiContext(lessonId, exerciseId, {
      userId,
      query: question,
    });
    if (!context) {
      return sendAiChatError(res, 404, 'AI_CONTEXT_INVALID', '小节不存在');
    }

    const messageType = resolveMessageType(hintRequest, currentCode, Boolean(context.exerciseId));
    const resolvedAnswerScope = resolveAnswerScope(
      question,
      requestedAnswerScope as LessonAnswerScopeRequest
    );
    const promptVersion = getAiTutorPromptVersion();
    const promptRevision =
      getLessonTutorPromptRevision(promptVersion);
    const answerScope =
      promptVersion === 'grounded-v3'
        ? resolvedAnswerScope
        : 'course';
    const sources = getLessonChatSources(context);
    const storedSources = sources.map((source) => ({
      index: source.index,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      title: source.title,
      chunkIndex: source.chunkIndex,
      contentHash: source.contentHash,
      score: source.score ?? null,
    }));
    const session = await getOrCreateLessonChatSession(userId, context);
    const history = await getRecentLessonChatMessages(session.id, {
      currentExerciseId: context.exerciseId,
    });
    const userMetadata = {
      lessonId: context.lessonId,
      exerciseId: context.exerciseId,
      hasCurrentCode: Boolean(currentCode),
      currentCodeLength: currentCode.length,
      requestedAnswerScope,
    };

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    writeEvent(res, { type: 'start', sessionId: session.id });
    if (
      isLearningGraphEnabled() &&
      session.current_run_id
    ) {
      writeEvent(res, {
        type: 'state',
        guidedState: {
          runId: session.current_run_id,
          stateVersion: session.state_version,
          phase:
            GUIDED_LEARNING_PHASES[session.state] || 'INIT',
          hintLevel: session.hint_level,
        },
      });
    }

    if (context.exerciseId && hintRequest) {
      const hint = await getNextHintMessage(context.exerciseId, userId);
      if (!hint) {
        throw new Error('当前练习不存在');
      }

      const assistantContent = formatHintMessage(
        hint.content,
        hint.level,
        hint.maxLevel,
        hint.exhausted
      );
      writeEvent(res, { type: 'token', content: assistantContent });

      await appendLessonChatExchange(
        session.id,
        question,
        assistantContent,
        userMetadata,
        {
          lessonId: context.lessonId,
          exerciseId: context.exerciseId,
          hintLevel: hint.level,
          maxHintLevel: hint.maxLevel,
          modelSource: 'exercise-hint',
        },
        'hint'
      );

      writeEvent(res, { type: 'done' });
      res.end();
      return;
    }

    writeEvent(res, {
      type: 'context',
      answerScope,
      promptVersion,
      promptRevision,
      evidenceQuality: context.evidenceQuality,
      sources,
    });

    let assistantContent = '';
    for await (const token of streamLessonChat(
      context,
      question,
      abortController.signal,
      history,
      currentCode,
      { answerScope, promptVersion }
    )) {
      if (abortController.signal.aborted) break;
      assistantContent += token;
      writeEvent(res, { type: 'token', content: token });
    }

    if (!abortController.signal.aborted) {
      const finalAssistantContent = normalizeLessonChatAnswer(
        assistantContent,
        answerScope
      );
      const invalidCitationIndexes =
        getInvalidCitationIndexes(
          finalAssistantContent,
          sources.length
        );
      await appendLessonChatExchange(
        session.id,
        question,
        finalAssistantContent,
        userMetadata,
        {
          lessonId: context.lessonId,
          exerciseId: context.exerciseId,
          modelSource: 'lesson-chat',
          usedCurrentCode: Boolean(currentCode),
          retrievalMode: context.retrievalMode,
          evidenceCount: context.evidence.length,
          evidenceQuality: context.evidenceQuality,
          answerScope,
          promptVersion,
          promptRevision,
          sources: storedSources,
          invalidCitationIndexes,
          answerPostProcessed:
            finalAssistantContent !== assistantContent,
        },
        messageType
      );
      writeEvent(res, {
        type: 'done',
        content: finalAssistantContent,
      });
      res.end();
    }
  } catch (error) {
    if (abortController.signal.aborted) return;

    const payload = createAiChatErrorPayload(error);
    logAiError('lesson-chat', error, payload);

    if (!res.headersSent) {
      return sendAiChatError(res, payload.status, payload.code, payload.message);
    }

    writeEvent(res, {
      type: 'error',
      code: payload.code,
      message: payload.message,
    });
    res.end();
  }
});

export default router;
