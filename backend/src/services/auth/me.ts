import prisma from '@/config/prisma';
import { AuthError } from '@/errors/auth-error';

class MeService {
  async getCurrentUser(userId: string) {
    const user = await prisma.users.findFirst({
      where: {
        id: userId,
        is_delete: 0,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        sex: true,
        occupation: true,
        role: true,
        level: true,
        score: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new AuthError('USER_UNAVAILABLE', '用户不存在或已被停用');
    }

    return user;
  }
}

export const meService = new MeService();
