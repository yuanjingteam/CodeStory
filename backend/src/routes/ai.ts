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

const router = Router();
const MAX_QUESTION_LENGTH = 2_000;

interface StreamEvent {
  type: 'start' | 'token' | 'done' | 'error';
  content?: string;
  message?: string;
  sessionId?: string;
}

function writeEvent(res: Response, event: StreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
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

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort();
  });

  try {
    const context = await getLessonAiContext(lessonId, exerciseId);
    if (!context) {
      return res.status(404).json({ code: 404, message: '小节不存在' });
    }

    const session = await getOrCreateLessonChatSession(userId, context);
    const history = await getRecentLessonChatMessages(session.id);
    await appendLessonChatMessage(session.id, 'user', question, {
      lessonId: context.lessonId,
      exerciseId: context.exerciseId,
    });

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    writeEvent(res, { type: 'start', sessionId: session.id });
    let assistantContent = '';
    for await (const token of streamLessonChat(context, question, abortController.signal, history)) {
      if (abortController.signal.aborted) break;
      assistantContent += token;
      writeEvent(res, { type: 'token', content: token });
    }

    if (!abortController.signal.aborted) {
      await appendLessonChatMessage(session.id, 'assistant', assistantContent, {
        lessonId: context.lessonId,
        exerciseId: context.exerciseId,
        modelSource: 'lesson-chat',
      });
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
