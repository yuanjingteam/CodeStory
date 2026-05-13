import express from 'express';
import {
  registerController,
  loginController,
  captchaController,
  forgetPasswordController,
} from '../controllers/auth/index';

const router = express.Router();

// 注册接口
router.post('/register', registerController.register);
// 登录接口
router.post('/login', loginController.login);
//登出接口
router.post('/logout', loginController.logout);
//获取图片验证码接口
router.get('/image-captcha', captchaController.getImageCaptcha);
//获取邮箱验证码接口
router.post('/email-captcha', captchaController.getEmailCaptcha);
//忘记密码接口
router.post('/forget-password', forgetPasswordController.forgetPassword);
export default router;
