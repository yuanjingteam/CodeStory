import { Router } from 'express';
import {
  explainChoiceExercise,
  getExerciseDetail,
  submitExercise,
  formatExerciseResponse,
} from '../services/courses/exercise.service';
import {
  getAcquiredHints,
  getExerciseHint,
} from '../services/courses/exercise-hint.service';
import { sendAiErrorResponse } from '../services/ai/ai-chat-error.service';
import { badRequest, notFound, serverError } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';
import {
  appealLatestSubmission,
  getLatestUserGradingReview,
  GradingReviewNotFoundError,
} from '../services/courses/grading-review.service';

const router = Router();

const appealSchema = z.object({
  exercise_id: z.string().trim().min(1),
  reason: z.string().trim().min(5).max(1000),
}).strict();

router.get('/detail', authMiddleware, async (req, res) => {
  try {
    const exerciseId = req.query.exercise_id as string;
    const userId = req.user!.id;

    if (!exerciseId) {
      return badRequest(res, '缺少 exercise_id 参数');
    }

    const result = await getExerciseDetail(exerciseId, userId);
    if (!result) {
      return notFound(res, '题目不存在');
    }

    return res.json({
      code: 200,
      message: 'success',
      data: formatExerciseResponse(result.exercise, result.userAnswer),
    });
  } catch (error) {
    return serverError(res, error);
  }
});

router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { exercise_id, answer, recommendationToken } = req.body;
    const userId = req.user!.id;

    if (!exercise_id || !answer) {
      return badRequest(res, '缺少 exercise_id 或 answer 参数');
    }

    const result = await submitExercise(exercise_id, answer, userId);
    if (!result) {
      return notFound(res, '题目不存在');
    }

    if (recommendationToken) {
      const { recordRecommendationEvent } = await import('../services/recommendations/service');
      await recordRecommendationEvent({ userId, token: recommendationToken, eventType: 'review_completed' }).catch(() => undefined);
    }
    return res.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

router.post('/grading-reviews/appeal', authMiddleware, async (req, res) => {
  const parsed = appealSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 400, message: '申诉理由至少 5 个字符', data: null });
  }
  try {
    const result = await appealLatestSubmission({
      exerciseId: parsed.data.exercise_id,
      userId: req.user!.id,
      reason: parsed.data.reason,
    });
    return res.json({ code: 200, message: 'success', data: result });
  } catch (error) {
    if (error instanceof GradingReviewNotFoundError) {
      return res.status(404).json({ code: 404, message: error.message, data: null });
    }
    return serverError(res, error);
  }
});

router.get('/grading-reviews/latest', authMiddleware, async (req, res) => {
  const exerciseId = typeof req.query.exercise_id === 'string'
    ? req.query.exercise_id.trim()
    : '';
  if (!exerciseId) {
    return res.status(400).json({ code: 400, message: '缺少 exercise_id 参数', data: null });
  }
  try {
    const result = await getLatestUserGradingReview({
      exerciseId,
      userId: req.user!.id,
    });
    return res.json({ code: 200, message: 'success', data: result });
  } catch (error) {
    return serverError(res, error);
  }
});

router.post('/choice-explanation', authMiddleware, async (req, res) => {
  try {
    const { exercise_id, answer } = req.body;
    const userId = req.user!.id;

    if (!exercise_id || !answer) {
      return badRequest(res, '缺少 exercise_id 或 answer 参数');
    }

    const result = await explainChoiceExercise(exercise_id, answer, userId);
    if (!result) {
      return notFound(res, '选择题不存在或选项无效');
    }

    return res.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    return sendAiErrorResponse(res, 'choice-explanation', error);
  }
});

router.get('/hint', authMiddleware, async (req, res) => {
  try {
    const exerciseId = req.query.exercise_id as string;
    const hintLevel = parseInt(req.query.level as string);
    const userId = req.user!.id;

    if (!exerciseId || isNaN(hintLevel)) {
      return badRequest(res, '缺少 exercise_id 或 level 参数');
    }

    const result = await getExerciseHint(exerciseId, hintLevel, userId);
    if (!result) {
      return notFound(res, '提示不存在或级别无效');
    }

    return res.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    return sendAiErrorResponse(res, 'exercise-hint', error);
  }
});

router.get('/hints', authMiddleware, async (req, res) => {
  try {
    const exerciseId = req.query.exercise_id as string;
    const userId = req.user!.id;

    if (!exerciseId) {
      return badRequest(res, '缺少 exercise_id 参数');
    }

    const result = await getAcquiredHints(exerciseId, userId);
    if (!result) {
      return notFound(res, '题目不存在或无提示');
    }

    return res.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    return sendAiErrorResponse(res, 'acquired-exercise-hints', error);
  }
});

export default router;
