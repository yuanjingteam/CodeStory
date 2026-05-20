import express from 'express';
import { userManageController } from '../controllers/user-manage';
import { uploadAvatar } from '../middleware/upload';
import { profileController } from '../controllers/profile';

const router = express.Router();


router.post('/list', userManageController.getUserList);
router.get('/detail/:id', userManageController.getUserDetailById);
router.post('/adduser', userManageController.addUser);
router.put('/update-detail/:id', userManageController.updateUserDetail);
router.post(
  '/upload-avatar/:id',
  uploadAvatar.single('avatar'),
  profileController.uploadAvatar
);
router.delete('/:id', userManageController.deleteUser);
router.put('/restore/:id', userManageController.restoreUser);

export default router;
