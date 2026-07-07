import express from 'express';
import {
  registerController,
  loginController,
  captchaController,
  forgetPasswordController,
  refreshController,
  logoutController,
  meController,
} from '../controllers/auth/index';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// 注册接口
router.post('/register', (req, res) => registerController.register(req, res));
// 登录接口
router.post('/login', (req, res) => loginController.login(req, res));
router.post('/refresh', (req, res) => refreshController.refresh(req, res));
router.post('/logout', (req, res) => logoutController.logout(req, res));
router.get('/me', authMiddleware, (req, res) =>
  meController.getCurrentUser(req, res)
);
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
