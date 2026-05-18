// routes/course.js
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { uploadCourseCover } from '../middleware/upload'; // 引入刚才抽离的上传中间件
import { createCourse, updateCourse } from '../services/course-manage/course-manage'

const router = Router();

// 创建课程路由（single是Multer提供的一个方法，用于处理单个文件上传）
router.post('/', 
  authMiddleware, 
  uploadCourseCover.single('coverImage'), 
  createCourse
);

// 更新课程路由
router.put('/:id', 
  authMiddleware, 
  uploadCourseCover.single('coverImage'), 
  updateCourse
);

export default router;