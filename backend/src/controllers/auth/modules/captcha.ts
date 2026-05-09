import { Request, Response } from 'express';
import { captchaService } from '@/services/auth/captcha';

class CaptchaController {
  // 获取图片验证码控制器
  async getImageCaptchaController(req: Request, res: Response) {
    const data = await captchaService.generateImageCaptcha();
    res.json({
      code: 200,
      message: 'Image captcha generated successfully',
      data,
    });
  }
  // 获取邮箱验证码控制器
  async getEmailCaptchaController(req: Request, res: Response) {
    const { email } = req.body;
    try {
      const canSend = await captchaService.canSendEmail(email);
      if (!canSend) {
        return res.status(429).json({
          code: 429,
          message: '发送过于频繁，请稍后再试',
        });
      }
      await captchaService.sendEmailCaptcha(email);
    } catch (error) {
      return res.status(500).json({
        code: 500,
        message: 'Email captcha sent failed',
      });
    }
    res.json({
      code: 200,
      message: 'Email captcha sent successfully',
    });
  }
}
export const captchaController = new CaptchaController();
