import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getChapterList,
  createChapter,
  updateChapter,
  deleteChapter,
  restoreChapter,
} from '../services/course-manage/chapter-manage';

const router = Router();

router.get('/list',
  authMiddleware,
  getChapterList
);

router.post('/',
  authMiddleware,
  createChapter
);

router.put('/:id',
  authMiddleware,
  updateChapter
);

router.delete('/:id',
  authMiddleware,
  deleteChapter
);

router.put('/:id/restore',
  authMiddleware,
  restoreChapter
);

export default router;
