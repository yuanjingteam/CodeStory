import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getLessonList,
  createLesson,
  updateLesson,
  deleteLesson
} from '../services/course-manage/lesson-manage';

const router = Router();

router.get('/list',
  authMiddleware,
  getLessonList
);

router.post('/',
  authMiddleware,
  createLesson
);

router.put('/:id',
  authMiddleware,
  updateLesson
);

router.delete('/:id',
  authMiddleware,
  deleteLesson
);

export default router;
