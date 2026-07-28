import { Router } from 'express';
import { success, fail, notFound } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import {
  getLessonDetail,
  startLesson,
} from '../services/courses/lesson.service';

const router = Router();

router.post('/:lessonId/start', authMiddleware, async (req, res) => {
  try {
    const result = await startLesson(
      req.params.lessonId as string,
      req.user!.id,
      {
        courseId:
          typeof req.query.courseId === 'string'
            ? req.query.courseId
            : undefined,
        chapterId:
          typeof req.query.chapterId === 'string'
            ? req.query.chapterId
            : undefined,
      }
    );
    if (!result) return notFound(res, '小节不存在');
    return success(res, result);
  } catch (error) {
    console.error('开始学习小节失败:', error);
    return fail(res);
  }
});

router.get('/:lessonId', authMiddleware, async (req, res) => {
  try {
    const result = await getLessonDetail(
      req.params.lessonId as string,
      req.user!.id,
      {
        courseId: typeof req.query.courseId === 'string' ? req.query.courseId : undefined,
        chapterId: typeof req.query.chapterId === 'string' ? req.query.chapterId : undefined,
      }
    );
    if (!result) return notFound(res, '小节不存在');
    return success(res, result);
  } catch (error) {
    console.error('获取小节详情失败:', error);
    return fail(res);
  }
});

export default router;
