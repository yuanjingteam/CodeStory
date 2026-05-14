import { Router } from 'express';
import { getExerciseDetail, submitExercise, formatExerciseResponse } from '../services/courses/exercise.service';
import { badRequest, notFound, serverError } from '../utils/response';

const router = Router();

router.get('/detail', async (req, res) => {
  try {
    const exerciseId = req.query.exercise_id as string;
    const userId = req.headers['x-user-id'] as string || '550e8400-e29b-41d4-a716-446655440000';

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

router.post('/submit', async (req, res) => {
  try {
    const { exercise_id, answer } = req.body;
    const userId = req.headers['x-user-id'] as string || '550e8400-e29b-41d4-a716-446655440000';

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
