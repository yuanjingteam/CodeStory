import express from 'express';
import { homeController } from '../controllers/home';

const router = express.Router();

// 获取热门课程
router.get('/home-courses', homeController.getHomeCourses);
//开始学习跳转
router.get('/start-learning/:userId', homeController.startLearning);
export default router;
