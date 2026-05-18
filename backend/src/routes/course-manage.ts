import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { uploadCourseCover } from '../middleware/upload';
import { createCourse, updateCourse, deleteCourse } from '../services/course-manage/course-manage'

const router = Router();

router.post('/', 
  authMiddleware, 
  uploadCourseCover.single('coverImage'), 
  createCourse
);

router.put('/:id', 
  authMiddleware, 
  uploadCourseCover.single('coverImage'), 
  updateCourse
);

router.delete('/:id', 
  authMiddleware, 
  deleteCourse
);

export default router;