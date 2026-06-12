import { Router, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getLessonAiContext } from '../services/ai/lesson-context.service';
import { streamLessonChat } from '../services/ai/lesson-chat.service';

const router = Router();
const MAX_QUESTION_LENGTH = 2_000;

interface StreamEvent {
  type: 'start' | 'token' | 'done' | 'error';
  content?: string;
  message?: string;
}

function writeEvent(res: Response, event: StreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
}

router.post('/chat/stream', authMiddleware, async (req, res) => {
  const lessonId = typeof req.body.lessonId === 'string' ? req.body.lessonId.trim() : '';
  const exerciseId =
    typeof req.body.exerciseId === 'string' ? req.body.exerciseId.trim() : undefined;
  const question = typeof req.body.message === 'string' ? req.body.message.trim() : '';

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

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    writeEvent(res, { type: 'start' });
    for await (const token of streamLessonChat(context, question, abortController.signal)) {
      if (abortController.signal.aborted) break;
      writeEvent(res, { type: 'token', content: token });
    }

    if (!abortController.signal.aborted) {
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
