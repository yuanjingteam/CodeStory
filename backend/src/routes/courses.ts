import { Router } from 'express';
import { success, fail, notFound } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import {
  getCourseList,
  getCourseDetail,
} from '../services/courses/course.service';

const router = Router();

router.get('/list', async (req, res) => {
  try {
    const result = await getCourseList(
      {
        keyword: req.query.keyword as string,
        level: req.query.level
          ? parseInt(req.query.level as string)
          : undefined,
        learnStatus: req.query.learnStatus
          ? parseInt(req.query.learnStatus as string)
          : undefined,
        minStudentCount: req.query.minStudentCount
          ? parseInt(req.query.minStudentCount as string)
          : undefined,
        maxStudentCount: req.query.maxStudentCount
          ? parseInt(req.query.maxStudentCount as string)
          : undefined,
        page: parseInt(req.query.page as string) || 1,
        size: parseInt(req.query.size as string) || 10,
      },
      req.user?.id
    );
    return success(res, result);
  } catch (error) {
    console.error('课程列表失败:', error);
    return fail(res);
  }
});

router.get('/:courseId', authMiddleware, async (req, res) => {
  try {
    const result = await getCourseDetail(req.params.courseId as string);
    if (!result) return notFound(res, '课程不存在');
    return success(res, result);
  } catch (error) {
    console.error('课程详情失败:', error);
    return fail(res);
  }
});

export default router;
