import prisma from '@/config/prisma';
import type { LoginRequest } from '@/types/auth';
import { captchaService } from '@/services/auth/captcha';
import { deleteCache } from '@/utils/cache';
import {
  validateEmail,
  validatePassword,
  validateCode,
} from '@/utils/validate';
import { comparePassword } from '@/utils/bcrypt';
import { generateToken, verifyToken } from '@/utils/jwt';
import { badRequest } from '../../utils/response';

const tokenBlacklist = new Set<string>();
class LoginService {
  async login(body: LoginRequest) {
    const { email, password, captchaId, captchaCode } = body;
    const emailResult = validateEmail(email);
    
    if (!emailResult.isValid) {
      return badRequest(emailResult.message);
    }
    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      return badRequest(passwordResult.message);
    }
    const captchaResult = validateCode(captchaCode);
    if (!captchaResult.isValid) {
      return badRequest(captchaResult.message);
    }

    await captchaService.verifyImageCaptcha(captchaId, captchaCode);

    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return badRequest('用户不存在');
    }

    if (user.is_delete === 1) {
      return badRequest('该账户已被删除，无法登录');
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return badRequest('密码错误');
    }
    const token = generateToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      body.rememberMe
    );
    await deleteCache(`emailCode:${captchaId}`);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        level: user.level,
        score: user.score,
        created_at: user.created_at,
        sex: user.sex,
        occupation: user.occupation,
      },
      message: '',
    };
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
