import { Router, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getLessonAiContext } from '../services/ai/lesson-context.service';
import { streamLessonChat } from '../services/ai/lesson-chat.service';
import {
  appendLessonChatMessage,
  getLessonChatMessages,
  getOrCreateLessonChatSession,
  getRecentLessonChatMessages,
} from '../services/ai/lesson-session.service';
import type { LessonChatMessageType } from '../services/ai/lesson-session.service';
import {
  getExerciseHint,
  getExerciseHintProgress,
} from '../services/courses/exercise-hint.service';

const router = Router();
const MAX_QUESTION_LENGTH = 2_000;
const MAX_CURRENT_CODE_LENGTH = 12_000;

interface StreamEvent {
  type: 'start' | 'token' | 'done' | 'error';
  content?: string;
  message?: string;
  sessionId?: string;
}

function writeEvent(res: Response, event: StreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
}

function isHintIntent(question: string): boolean {
  const normalized = question.trim().toLowerCase();
  return /提示|给点思路|给.*思路|没思路|不会做|卡住|hint|clue/.test(normalized);
}

function formatHintMessage(content: string, level: number, maxLevel: number): string {
  return `提示 ${level}/${maxLevel}\n\n${content}`;
}

function resolveMessageType(
  question: string,
  currentCode: string,
  hasExercise: boolean
): LessonChatMessageType {
  if (hasExercise && isHintIntent(question)) return 'hint';
  if (hasExercise && currentCode) return 'code_analysis';
  return 'chat';
}

async function getNextHintMessage(
  exerciseId: string,
  userId: string
): Promise<{ content: string; level: number; maxLevel: number } | null> {
  const progress = await getExerciseHintProgress(exerciseId, userId);
  if (!progress) return null;

  if (progress.currentLevel >= progress.maxLevel) {
    return {
      level: progress.currentLevel,
      maxLevel: progress.maxLevel,
      content: `这道题的 ${progress.maxLevel} 级提示已经全部使用完了。你可以先提交一次答案，我会根据你的作答情况帮你分析；也可以把当前思路发给我，我帮你检查卡在哪里。`,
    };
  }

  return getExerciseHint(exerciseId, progress.currentLevel + 1, userId);
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
      },
    });
  } catch (error) {
    console.error('获取 AI 对话历史失败:', error);
    return res.status(500).json({ code: 500, message: '获取 AI 对话历史失败' });
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

  if (!userId) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  if (!lessonId || !question) {
    return res.status(400).json({ code: 400, message: '小节和问题不能为空' });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({
      code: 400,
      message: `问题不能超过 ${MAX_QUESTION_LENGTH} 个字符`,
    });
  }

  if (currentCode.length > MAX_CURRENT_CODE_LENGTH) {
    return res.status(400).json({
      code: 400,
      message: `当前代码不能超过 ${MAX_CURRENT_CODE_LENGTH} 个字符`,
    });
  }

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort();
  });

  try {
    const context = await getLessonAiContext(lessonId, exerciseId);
    if (!context) {
      return res.status(404).json({ code: 404, message: '小节不存在' });
    }

    const messageType = resolveMessageType(question, currentCode, Boolean(context.exerciseId));
    const session = await getOrCreateLessonChatSession(userId, context);
    const history = await getRecentLessonChatMessages(session.id);
    await appendLessonChatMessage(session.id, 'user', question, {
      lessonId: context.lessonId,
      exerciseId: context.exerciseId,
      hasCurrentCode: Boolean(currentCode),
      currentCodeLength: currentCode.length,
    }, messageType);

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    writeEvent(res, { type: 'start', sessionId: session.id });

    if (context.exerciseId && isHintIntent(question)) {
      const hint = await getNextHintMessage(context.exerciseId, userId);
      if (!hint) {
        throw new Error('当前练习不存在');
      }

      const assistantContent = formatHintMessage(hint.content, hint.level, hint.maxLevel);
      writeEvent(res, { type: 'token', content: assistantContent });

      await appendLessonChatMessage(
        session.id,
        'assistant',
        assistantContent,
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

    let assistantContent = '';
    for await (const token of streamLessonChat(
      context,
      question,
      abortController.signal,
      history,
      currentCode
    )) {
      if (abortController.signal.aborted) break;
      assistantContent += token;
      writeEvent(res, { type: 'token', content: token });
    }

    if (!abortController.signal.aborted) {
      await appendLessonChatMessage(session.id, 'assistant', assistantContent, {
        lessonId: context.lessonId,
        exerciseId: context.exerciseId,
        modelSource: 'lesson-chat',
        usedCurrentCode: Boolean(currentCode),
      }, messageType);
      writeEvent(res, { type: 'done' });
      res.end();
    }
  } catch (error) {
    if (abortController.signal.aborted) return;

    const message = error instanceof Error ? error.message : 'AI 服务调用失败';
    console.error('AI 对话失败:', error);

    if (!res.headersSent) {
      const isContextError = message.startsWith('当前练习');
      return res.status(isContextError ? 400 : 500).json({
        code: isContextError ? 400 : 500,
        message: isContextError ? message : 'AI 服务调用失败',
      });
    }

    writeEvent(res, {
      type: 'error',
      message: message.includes('QWEN_API_KEY') ? message : 'AI 暂时无法回答，请稍后重试',
    });
    res.end();
  }
});

export default router;
