import { Router } from 'express';
import { getExerciseDetail, submitExercise, formatExerciseResponse } from '../services/courses/exercise.service';
import { badRequest, notFound, serverError } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

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

router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { exercise_id, answer } = req.body;
    const userId = req.user!.id;

    if (!exercise_id || !answer) {
      return badRequest(res, '缺少 exercise_id 或 answer 参数');
    }

    const result = await submitExercise(exercise_id, answer, userId);
    if (!result) {
      return notFound(res, '题目不存在');
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

export default router;
