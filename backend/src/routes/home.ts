import express from 'express';
import { homeController } from '../controllers/home';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// 获取热门课程
router.get('/home-courses', authMiddleware, homeController.getHomeCourses);
//开始学习跳转
router.get('/start-learning', authMiddleware, homeController.startLearning);
export default router;
