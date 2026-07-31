import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { uploadCourseCover } from '../middleware/upload';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseManageList,
  restoreCourse,
} from '../services/course-manage/course-manage'

const router = Router();

router.get('/list',
  authMiddleware,
  getCourseManageList
);

router.post('/', 
  authMiddleware, 
  uploadCourseCover, 
  createCourse
);

router.put('/:id', 
  authMiddleware, 
  uploadCourseCover, 
  updateCourse
);

router.delete('/:id', 
  authMiddleware, 
  deleteCourse
);

router.put('/:id/restore',
  authMiddleware,
  restoreCourse
);

export default router;
