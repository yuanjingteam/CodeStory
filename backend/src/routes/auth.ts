import express from 'express';
import {
  registerController,
  loginController,
  captchaController,
} from '../controllers/auth/index';

const router = express.Router();

// 注册接口
router.post('/register', registerController.register);
// 登录接口
router.post('/login', loginController.login);
//获取图片验证码接口
router.get('/image-captcha', captchaController.getImageCaptchaController);
//获取邮箱验证码接口
router.post('/email-captcha', captchaController.getEmailCaptchaController);
export default router;
