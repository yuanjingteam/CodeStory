import express from 'express';
import { homeController } from '../controllers/home';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/home-courses', authMiddleware, homeController.getHomeCourses);
router.get('/start-learning', authMiddleware, homeController.startLearning);
router.get('/home-stats', homeController.getLearningStats);

export default router;