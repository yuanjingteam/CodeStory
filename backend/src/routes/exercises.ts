import { Router } from 'express';
import prisma from '../config/prisma';
import { uuidToShortId, resolveShortId } from '../utils/idTransform';

const router = Router();

// 获取单道题目详情
router.get('/detail', async (req, res) => {
  try {
    const exerciseId = req.query.exercise_id as string;
    const userId = req.headers['x-user-id'] as string || '550e8400-e29b-41d4-a716-446655440000';

    console.log('[DEBUG] 收到题目详情请求, exercise_id:', exerciseId);

    if (!exerciseId) {
      return res.status(400).json({
        code: 400,
        message: '缺少 exercise_id 参数',
        data: null,
      });
    }

    // 短 ID 反查完整 UUID
    const resolvedExerciseId = await resolveShortId('exercises', exerciseId);
    console.log('[DEBUG] 反查结果 resolvedExerciseId:', resolvedExerciseId);

    if (!resolvedExerciseId) {
      return res.status(404).json({
        code: 404,
        message: '题目不存在（短ID反查失败）',
        data: null,
      });
    }

    // 查询题目详情
    const exercise = await prisma.exercises.findUnique({
      where: { id: resolvedExerciseId, is_delete: 0 },
    });

    console.log('[DEBUG] 数据库查询结果 exercise:', exercise ? '找到' : '未找到');

    if (!exercise) {
      return res.status(404).json({
        code: 404,
        message: '题目不存在（数据库未找到）',
        data: null,
      });
    }

    // 查询用户答案
    const userAnswer = await prisma.answer.findUnique({
      where: {
        user_id_exercise_id: {
          user_id: userId,
          exercise_id: resolvedExerciseId,
        },
        is_delete: 0,
      },
    });

    // 解析 metadata
    const metadata = exercise.metadata as any;

    res.json({
      code: 200,
      message: 'success',
      data: {
        id: uuidToShortId(exercise.id),
        lesson_id: uuidToShortId(exercise.lesson_id),
        type: exercise.type,
        knowledge: exercise.knowledge || '',
        content: exercise.content,
        answer: exercise.answer,
        analysis: exercise.analysis || '',
        difficulty: exercise.difficulty,
        metadata,
        userAnswer: userAnswer ? {
          answer: userAnswer.answer || '',
          submission_count: userAnswer.submission_count,
          feedback: userAnswer.feedback || '',
          hint_level_used: userAnswer.hint_level_used,
          score: userAnswer.score,
        } : null,
      },
    });
  } catch (error) {
    console.error('获取题目详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    });
  }
});

export default router;
