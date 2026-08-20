import prisma from '@/config/prisma';
import { hashPassword } from '@/utils/bcrypt';
import { captchaService } from '@/services/auth/captcha';
import type { RegisterRequest } from '@/types/auth';
import {
  validateEmail,
  validatePassword,
  validateNickname,
  validateEmailCode,
} from '@/utils/validate';
import { AuthError } from '@/errors/auth-error';

class RegisterService {
  async register(req: RegisterRequest) {
    const { email, password, nickname, emailCode } = req;
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      throw new AuthError('AUTH_INVALID_EMAIL', emailResult.message, 400);
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      throw new AuthError('AUTH_INVALID_PASSWORD', passwordResult.message, 400);
    }

    const nicknameResult = validateNickname(nickname);
    if (!nicknameResult.isValid) {
      throw new AuthError('AUTH_INVALID_NICKNAME', nicknameResult.message, 400);
    }

    const codeResult = validateEmailCode(emailCode);
    if (!codeResult.isValid) {
      throw new AuthError('AUTH_INVALID_EMAIL_CODE', codeResult.message, 400);
    }
    await captchaService.verifyEmailCode(email, emailCode);
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AuthError('AUTH_EMAIL_EXISTS', '邮箱已被注册', 409);
    }
    const hashedPassword = await hashPassword(password);
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        role: 0,
        score: 0,
        level: 0,
      },
    });
    return {
      message: '注册成功，请使用邮箱和密码登录',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }
}
export const registerService = new RegisterService();
