import express from 'express';
import {
  registerController,
  loginController,
  captchaController,
  forgetPasswordController,
} from '../controllers/auth/index';

const router = express.Router();

// 注册接口
router.post('/register', (req, res) => registerController.register(req, res));
// 登录接口
router.post('/login', (req, res) => loginController.login(req, res));
// 获取图片验证码接口
router.get('/image-captcha', (req, res) =>
  captchaController.getImageCaptcha(req, res)
);
// 获取邮箱验证码接口
router.post('/email-captcha', (req, res) =>
  captchaController.getEmailCaptcha(req, res)
);
// 忘记密码接口
router.post('/forget-password', (req, res) =>
  forgetPasswordController.forgetPassword(req, res)
);
export default router;
