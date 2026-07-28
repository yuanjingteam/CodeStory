import crypto from 'crypto';
import { setCache, getCache, deleteCache } from '@/utils/cache';
import { createCaptcha } from '@/utils/captcha';
import { sendEmail } from '@/utils/email';

class CaptchaService {
  // 生成图片验证码
  async generateImageCaptcha() {
    const captcha = createCaptcha();
    const captchaId = crypto.randomUUID();
    await setCache(`captcha:${captchaId}`, captcha.text.toLowerCase(), 60 * 5);
    return {
      captchaId,
      image: captcha.data,
    };
  }

  // 验证图片验证码
  async verifyImageCaptcha(captchaId: string, code: string) {
    const redisCode = await getCache(`captcha:${captchaId}`);
    if (!redisCode) {
      throw new Error('验证码已过期');
    }
    if (redisCode !== code.toLowerCase()) {
      throw new Error('验证码错误');
    }
    await deleteCache(`captcha:${captchaId}`);
    return true;
  }

  // 发送邮箱验证码
  generateCode(): string {
    return Math.random().toString(10).substring(2, 8);
  }
  async sendEmailCaptcha(email: string) {
    const code = this.generateCode();
    await setCache(`email-code:${email}`, code, 60 * 5);
    await setCache(`email-limit:${email}`, '1', 60);
    const sent = await sendEmail({
      to: email,
      subject: '【CodeStory】您的验证码',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>验证码</h2>
          <p>您的验证码是：<strong style="font-size: 24px; color: #6366f1;">${code}</strong></p>
          <p>有效期5分钟，请勿告诉他人。</p>
        </div>
      `,
    });
    if (!sent) {
      throw new Error('邮件发送失败');
    }
  }

  // 验证邮箱验证码
  async verifyEmailCode(email: string, emailCode: string): Promise<boolean> {
    const storedCode = await getCache(`email-code:${email}`);
    if (!storedCode) {
      throw new Error('验证码已过期');
    }
    if (storedCode !== emailCode) {
      throw new Error('验证码错误');
    }
    await deleteCache(`email-code:${email}`);
    return true;
  }
  // 限制邮箱验证码发送频率
  async canSendEmail(email: string): Promise<boolean> {
    const limit = await getCache(`email-limit:${email}`);
    return !limit;
  }
}

export const captchaService = new CaptchaService();
