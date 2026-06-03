import prisma from '@/config/prisma';
import { hashPassword } from '@/utils/bcrypt';
import { captchaService } from '@/services/auth/captcha';
import type { RegisterRequest } from '@/types/auth';
import { deleteCache } from '@/utils/cache';
import {
  validateEmail,
  validatePassword,
  validateNickname,
  validateCode,
} from '@/utils/validate';

class RegisterService {
  async register(req: RegisterRequest) {
    const { email, password, nickname, emailCode } = req;
    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      throw new Error(emailResult.message);
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      throw new Error(passwordResult.message);
    }

    const nicknameResult = validateNickname(nickname);
    if (!nicknameResult.isValid) {
      throw new Error(nicknameResult.message);
    }

    const codeResult = validateCode(emailCode);
    if (!codeResult.isValid) {
      throw new Error(codeResult.message);
    }
    if (!(await captchaService.verifyEmailCode(email, emailCode))) {
      throw new Error('邮件验证码错误');
    }
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new Error('邮箱已被注册');
    }
    await deleteCache(`emailCode:${email}`);
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
