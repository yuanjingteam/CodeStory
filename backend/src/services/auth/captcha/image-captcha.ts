import crypto from 'crypto';
import { setCache, getCache, deleteCache } from '@/utils/cache';
import { createCaptcha } from '@/utils/captcha';

class ImageCaptchaService {
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
}

export default new ImageCaptchaService();
