import express from 'express';
import {
  registerController,
  loginController,
  ImageCaptchaController,
} from '../controllers/auth/index';

const router = express.Router();

// 注册接口
router.post('/register', registerController);
// 登录接口
router.post('/login', loginController);
//获取图片验证码接口
router.get('/image-captcha', ImageCaptchaController.getImageCaptchaController);
//获取邮箱验证码接口
export default router;
