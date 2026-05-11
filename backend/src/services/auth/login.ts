import prisma from '@/config/prisma';
import type { LoginRequest } from 'shared/types/auth';
import { captchaService } from '@/services/auth/captcha';
import {
  validateEmail,
  validatePassword,
  validateCode,
} from '@/utils/validate';
import { comparePassword } from '@/utils/bcrypt';
import { generateToken, verifyToken } from '@/utils/jwt';

const tokenBlacklist = new Set<string>();
class LoginService {
  async login(body: LoginRequest) {
    const { email, password, captchaId, captchaCode } = body;
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      throw new Error(emailResult.message);
    }
    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      throw new Error(passwordResult.message);
    }
    const captchaResult = validateCode(captchaCode);
    if (!captchaResult.isValid) {
      throw new Error(captchaResult.message);
    }

    await captchaService.verifyImageCaptcha(captchaId, captchaCode);

    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('用户不存在');
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }
    const token = generateToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      body.rememberMe
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        sex: user.sex,
        occupation: user.occupation,
        role: user.role,
        level: user.level,
        score: user.score,
      },
    };
  }
  async logout(token: string) {
    try {
      const decoded = verifyToken(token);
      const jti = `${decoded.id}-${decoded.email}`;
      tokenBlacklist.add(jti);

      setTimeout(
        () => {
          tokenBlacklist.delete(jti);
        },
        30 * 24 * 60 * 60 * 1000
      );

      return { success: true, message: '登出成功' };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, message: '登出失败' };
    }
  }

  isTokenBlacklisted(token: string): boolean {
    try {
      const decoded = verifyToken(token);
      const jti = `${decoded.id}-${decoded.email}`;
      return tokenBlacklist.has(jti);
    } catch {
      return true;
    }
  }
}

export const loginService = new LoginService();
