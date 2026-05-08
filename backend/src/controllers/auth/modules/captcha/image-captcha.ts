import { Request, Response } from 'express';
import captchaService from '@/services/auth/captcha/image-captcha';
// 获取图片验证码控制器
class ImageCaptcha {
  async getImageCaptchaController(req: Request, res: Response) {
    const data = await captchaService.generateImageCaptcha();
    res.json({
      code: 200,
      message: 'success',
      data,
    });
  }
}
export const ImageCaptchaController = new ImageCaptcha();
