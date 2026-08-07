import { Router } from 'express';
import {
  explainChoiceExercise,
  getExerciseDetail,
  submitExercise,
  formatExerciseResponse,
} from '../services/courses/exercise.service';
import { ChoiceExerciseUnusableError } from '../services/courses/choice-exercise-integrity';
import {
  getAcquiredHints,
  getExerciseHint,
} from '../services/courses/exercise-hint.service';
import { sendAiErrorResponse } from '../services/ai/ai-chat-error.service';
import { badRequest, notFound, serverError } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import {
  codeSubmissionRateLimit,
  exerciseAssistanceRateLimit,
} from '../middleware/ai-rate-limit';

const router = Router();

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

router.post('/submit', authMiddleware, codeSubmissionRateLimit, async (req, res) => {
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
    if (error instanceof ChoiceExerciseUnusableError) {
      return badRequest(res, '本题选项配置有误，暂时无法作答');
    }
    return serverError(res, error);
  }
});

router.post('/choice-explanation', authMiddleware, exerciseAssistanceRateLimit, async (req, res) => {
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

router.get('/hint', authMiddleware, exerciseAssistanceRateLimit, async (req, res) => {
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
