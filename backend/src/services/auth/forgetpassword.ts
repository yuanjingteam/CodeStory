import prisma from '@/config/prisma';
import { hashPassword } from '@/utils/bcrypt';
import { captchaService } from '@/services/auth/captcha';
import type { ForgetPasswordRequest } from '@/types/auth';
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

    await captchaService.verifyEmailCode(email, emailCode);
    const hashedPassword = await hashPassword(password);
    await prisma.users.updateMany({
      where: {
        email,
        is_delete: 0,
      },
      data: {
        password: hashedPassword,
        updated_at: new Date(),
      },
    });

    return {
      message: '如果该邮箱已注册，密码已重置',
    };
  }
}

export const forgetPasswordService = new ForgetPasswordService();
