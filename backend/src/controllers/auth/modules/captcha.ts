import { Request, Response } from 'express';
import { captchaService } from '@/services/auth/captcha';
import { validateEmail } from '@/utils/validate';
import { AuthError, normalizeAuthError } from '@/errors/auth-error';

class CaptchaController {
  // 获取图片验证码控制器
  async getImageCaptcha(req: Request, res: Response) {
    try {
      const data = await captchaService.generateImageCaptcha();
      return res.status(200).json({
        code: 200,
        message: '图片验证码生成成功',
        data,
      });
    } catch {
      return res.status(500).json({
        code: 500,
        errorCode: 'AUTH_CAPTCHA_GENERATION_FAILED',
        message: '图片验证码加载失败',
      });
    }
  }
  // 获取邮箱验证码控制器
  async getEmailCaptcha(req: Request, res: Response) {
    const { email } = req.body;
    try {
      const emailResult = validateEmail(email);
      if (!emailResult.isValid) {
        throw new AuthError('AUTH_INVALID_EMAIL', emailResult.message, 400);
      }
      const canSend = await captchaService.canSendEmail(email);
      if (!canSend) {
        throw new AuthError(
          'AUTH_EMAIL_RATE_LIMITED',
          '发送过于频繁，请稍后再试',
          429
        );
      }
      await captchaService.sendEmailCaptcha(email);
      return res.status(200).json({
        code: 200,
        message: '邮件验证码发送成功',
      });
    } catch (error) {
      const authError = normalizeAuthError(error, {
        statusCode: 500,
        code: 'AUTH_EMAIL_SEND_FAILED',
        message: '邮件验证码发送失败',
      });
      return res.status(authError.statusCode).json({
        code: authError.statusCode,
        errorCode: authError.code,
        message: authError.message,
      });
    }
  }
}
export const captchaController = new CaptchaController();
