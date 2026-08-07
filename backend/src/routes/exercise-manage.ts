import { Router, type Response } from 'express';
import {
  exerciseGenerationInputSchema,
  ExerciseGenerationError,
  generateExerciseDrafts,
} from '../services/ai/exercise-gen';
import {
  createManagedExercise,
  deleteManagedExercise,
  ExerciseManageError,
  getManagedExercise,
  listManagedExercises,
  reviewManagedExercise,
  updateManagedExercise,
  type ExerciseManageWriteInput,
  type ExerciseReviewStatus,
  type ExerciseType,
} from '../services/course-manage/exercise-manage';
import { exerciseGenerationRateLimit } from '../middleware/exercise-generation-rate-limit';

const router = Router();

function ok(res: Response, data: unknown) {
  return res.json({ code: 200, message: 'success', data });
}

function sendError(res: Response, error: unknown) {
  if (error instanceof ExerciseManageError) {
    return res.status(error.status).json({
      code: error.code,
      message: error.publicMessage,
      data: null,
    });
  }
  if (error instanceof ExerciseGenerationError) {
    const status = error.code.endsWith('NOT_FOUND')
      ? 404
      : error.code === 'EXERCISE_GENERATION_DUPLICATE'
        ? 409
        : 502;
    return res.status(status).json({
      code: error.code,
      message: error.publicMessage,
      data: null,
    });
  }
  console.error('题目管理接口失败:', error);
  return res.status(500).json({
    code: 'EXERCISE_MANAGE_INTERNAL_ERROR',
    message: '题目管理服务暂时不可用，请稍后重试。',
    data: null,
  });
}

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  max: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, max)
    : fallback;
}

router.get('/list', async (req, res) => {
  try {
    const difficulty =
      req.query.difficulty === undefined ||
      req.query.difficulty === ''
        ? undefined
        : Number(req.query.difficulty);
    if (
      difficulty !== undefined &&
      (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 2)
    ) {
      throw new ExerciseManageError(
        'EXERCISE_DIFFICULTY_INVALID',
        '难度筛选必须是 0、1 或 2。'
      );
    }
    const type = req.query.type as ExerciseType | undefined;
    if (type && type !== 'single_choice' && type !== 'code') {
      throw new ExerciseManageError(
        'EXERCISE_TYPE_UNSUPPORTED',
        '题型筛选仅支持选择题和编程题。'
      );
    }
    const reviewStatus = req.query.reviewStatus as
      | ExerciseReviewStatus
      | undefined;
    if (
      reviewStatus &&
      !['draft', 'approved', 'rejected'].includes(reviewStatus)
    ) {
      throw new ExerciseManageError(
        'EXERCISE_REVIEW_STATUS_INVALID',
        '审核状态筛选无效。'
      );
    }
    return ok(
      res,
      await listManagedExercises({
        courseId: String(req.query.courseId || '').trim() || undefined,
        chapterId:
          String(req.query.chapterId || '').trim() || undefined,
        lessonId: String(req.query.lessonId || '').trim() || undefined,
        type,
        difficulty,
        source: String(req.query.source || '').trim() || undefined,
        reviewStatus,
        keyword: String(req.query.keyword || '').trim() || undefined,
        queue: req.query.queue === 'true',
        page: parsePositiveInteger(req.query.page, 1, 100_000),
        size: parsePositiveInteger(req.query.size, 10, 100),
      })
    );
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/generate', exerciseGenerationRateLimit, async (req, res) => {
  try {
    const parsed = exerciseGenerationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'EXERCISE_GENERATION_INPUT_INVALID',
        message:
          parsed.error.issues[0]?.message || '出题参数不完整。',
        data: null,
      });
    }
    return ok(
      res,
      await generateExerciseDrafts(parsed.data, req.user!.id)
    );
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    return ok(
      res,
      await createManagedExercise(req.body as ExerciseManageWriteInput)
    );
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const exercise = await getManagedExercise(req.params.id);
    if (!exercise) {
      throw new ExerciseManageError(
        'EXERCISE_NOT_FOUND',
        '题目不存在或已删除。',
        404
      );
    }
    return ok(res, exercise);
  } catch (error) {
    return sendError(res, error);
  }
});

router.put('/:id', async (req, res) => {
  try {
    return ok(
      res,
      await updateManagedExercise(
        req.params.id,
        req.body as ExerciseManageWriteInput,
        req.user!.id
      )
    );
  } catch (error) {
    return sendError(res, error);
  }
});

router.put('/:id/review', async (req, res) => {
  try {
    const action = req.body?.action;
    if (action !== 'approve' && action !== 'reject') {
      throw new ExerciseManageError(
        'EXERCISE_REVIEW_ACTION_INVALID',
        '审核操作仅支持采用或拒绝。'
      );
    }
    return ok(
      res,
      await reviewManagedExercise(
        req.params.id,
        action,
        req.body?.exercise as ExerciseManageWriteInput | undefined,
        req.user!.id
      )
    );
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteManagedExercise(req.params.id);
    return ok(res, null);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
