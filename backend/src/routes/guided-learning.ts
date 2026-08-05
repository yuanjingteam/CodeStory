import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  advanceGuidedLearning,
  resumeGuidedLearning,
  startGuidedLearning,
} from '../services/ai/learning-graph/service';
import {
  GuidedLearningConflictError,
  GuidedLearningNotFoundError,
  GuidedLearningRestartRequiredError,
} from '../services/ai/learning-graph/types';

const router = Router();

function getUserId(req: { user?: { id?: unknown } }): string {
  return typeof req.user?.id === 'string' ? req.user.id : '';
}

function sendError(res: any, error: unknown) {
  if (error instanceof GuidedLearningConflictError) {
    return res.status(409).json({
      code: 409,
      message: '学习状态已更新，请使用最新状态重试',
      data: error.current,
    });
  }
  if (error instanceof GuidedLearningRestartRequiredError) {
    return res.status(409).json({
      code: 409,
      message: '学习图版本已升级，请重新开始',
      data: error.current,
    });
  }
  if (error instanceof GuidedLearningNotFoundError) {
    return res.status(404).json({
      code: 404,
      message: error.message,
    });
  }
  console.error('引导式学习失败:', error);
  return res.status(500).json({
    code: 500,
    message: '引导式学习暂时不可用',
  });
}

router.post('/start', authMiddleware, async (req, res) => {
  const userId = getUserId(req);
  const lessonId =
    typeof req.body.lessonId === 'string'
      ? req.body.lessonId.trim()
      : '';
  if (!userId) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  if (!lessonId) {
    return res.status(400).json({
      code: 400,
      message: '小节不能为空',
    });
  }
  try {
    const state = await startGuidedLearning(userId, lessonId);
    return res.json({ code: 200, message: '启动成功', data: state });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/advance', authMiddleware, async (req, res) => {
  const userId = getUserId(req);
  const lessonId =
    typeof req.body.lessonId === 'string'
      ? req.body.lessonId.trim()
      : '';
  const runId =
    typeof req.body.runId === 'string' ? req.body.runId.trim() : '';
  const answer =
    typeof req.body.answer === 'string' ? req.body.answer.trim() : '';
  const expectedStateVersion = Number(req.body.expectedStateVersion);
  if (!userId) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  if (
    !lessonId ||
    !runId ||
    !answer ||
    !Number.isInteger(expectedStateVersion) ||
    expectedStateVersion < 1
  ) {
    return res.status(400).json({
      code: 400,
      message: '推进参数无效',
    });
  }
  try {
    const state = await advanceGuidedLearning({
      userId,
      lessonId,
      runId,
      answer,
      expectedStateVersion,
    });
    return res.json({ code: 200, message: '推进成功', data: state });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/resume', authMiddleware, async (req, res) => {
  const userId = getUserId(req);
  const lessonId =
    typeof req.query.lessonId === 'string'
      ? req.query.lessonId.trim()
      : '';
  const runId =
    typeof req.query.runId === 'string'
      ? req.query.runId.trim()
      : '';
  if (!userId) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  if (!lessonId || !runId) {
    return res.status(400).json({
      code: 400,
      message: '恢复参数无效',
    });
  }
  try {
    const state = await resumeGuidedLearning(userId, lessonId, runId);
    return res.json({ code: 200, message: '恢复成功', data: state });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
