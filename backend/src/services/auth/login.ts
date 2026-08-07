import { randomUUID } from 'node:crypto';
import prisma from '@/config/prisma';
import type { LoginRequest } from '@/types/auth';
import type { AuthSession } from '@/types/auth-session';
import { captchaService } from '@/services/auth/captcha';
import { createAuthSession } from '@/services/auth/session';
import { createAuthSessionTimes } from '@/config/auth-session';
import {
  validateEmail,
  validatePassword,
  validateCode,
} from '@/utils/validate';
import { comparePassword } from '@/utils/bcrypt';
import {
  hashRefreshToken,
  issueAccessToken,
  issueRefreshToken,
} from '@/utils/auth-token';

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

    if (user.is_delete === 1) {
      throw new Error('该账户已被删除，无法登录');
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }
    const sessionId = randomUUID();
    const tokenId = randomUUID();
    const rememberMe = body.rememberMe === true;
    const sessionTimes = createAuthSessionTimes();
    const accessToken = issueAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });
    const refreshToken = issueRefreshToken({
      userId: user.id,
      sessionId,
      tokenId,
    });
    const authSession: AuthSession = {
      sessionId,
      userId: user.id,
      currentTokenId: tokenId,
      refreshTokenHash: hashRefreshToken(refreshToken.token),
      rememberMe,
      createdAt: sessionTimes.createdAt,
      lastRefreshedAt: sessionTimes.createdAt,
      refreshExpiresAt: sessionTimes.refreshExpiresAt,
      sessionExpiresAt: sessionTimes.sessionExpiresAt,
      revokedAt: null,
    };

    await createAuthSession(authSession);

    return {
      accessToken: accessToken.token,
      accessExpiresAt: accessToken.expiresAt,
      token: accessToken.token,
      refreshToken: refreshToken.token,
      refreshExpiresAt: sessionTimes.refreshExpiresAt,
      rememberMe,
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
}

export const loginService = new LoginService();
