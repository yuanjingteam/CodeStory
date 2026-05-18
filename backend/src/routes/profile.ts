import express from 'express';
import { profileController } from '../controllers/profile';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/user-info', authMiddleware, profileController.getProfile);
router.get('/user-courses', authMiddleware, profileController.getUserCourses);
router.put('/update-profile', authMiddleware, profileController.updateUserProfile);
// router.post('/upload-avatar', authMiddleware, profileController.uploadAvatar);
export default router;
