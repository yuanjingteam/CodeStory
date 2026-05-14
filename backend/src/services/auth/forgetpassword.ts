import prisma from '@/config/prisma';
import { hashPassword } from '@/utils/bcrypt';
import { captchaService } from '@/services/auth/captcha';
import { ForgetPasswordRequest } from 'shared/types/auth';
import { deleteCache } from '@/utils/cache';
import {
  validateEmail,
  validatePassword,
  validateCode,
} from '@/utils/validate';

class ForgetPasswordService {
  async forgetPassword(req: ForgetPasswordRequest) {
    const { email, emailCode, password } = req;

    const emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      throw new Error(emailResult.message);
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      throw new Error(passwordResult.message);
    }

    const codeResult = validateCode(emailCode);
    if (!codeResult.isValid) {
      throw new Error(codeResult.message);
    }
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });
    if (!existingUser) {
      throw new Error('该邮箱未注册');
    }
    const verifyResult = await captchaService.verifyEmailCode(email, emailCode);
    if (!verifyResult) {
      throw new Error('验证码错误或已过期');
    }
    const hashedPassword = await hashPassword(password);
    const updatedUser = await prisma.users.update({
      where: { email },
      data: {
        password: hashedPassword,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        created_at: true,
        updated_at: true,
      },
    });

   
    await deleteCache(`emailCode:${email}`);

    return {
      message: '密码重置成功，请使用新密码登录',
      user: updatedUser,
    };
  }
}

export const forgetPasswordService = new ForgetPasswordService();
