import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getLessonList,
  createLesson,
  updateLesson,
  deleteLesson,
  reindexLesson,
  reindexLessonsBatch,
  restoreLesson,
  restoreExercise,
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

router.post('/reindex-batch',
  authMiddleware,
  reindexLessonsBatch
);

router.post('/:id/reindex',
  authMiddleware,
  reindexLesson
);

router.put('/:id/restore',
  authMiddleware,
  restoreLesson
);

router.put('/:id/exercises/:exerciseId/restore',
  authMiddleware,
  restoreExercise
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
