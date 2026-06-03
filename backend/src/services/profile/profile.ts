import prisma from '@/config/prisma';
import type { UpdateUserInfopRequest, UserCourse } from '@/types/profile';
import fs from 'fs';
import path from 'path';
import { uploadToOSS, deleteFromOSS, extractOSSKey } from '@/middleware/upload';

class ProfileService {
  async getProfile(userId?: string) {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    const user = await prisma.users.findFirst({
      where: {
        id: userId,
        is_delete: 0,
      },
      select: {
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
      throw new Error('用户不存在');
    }

    const level = Math.floor(user.score / 1500);
    await prisma.users.update({
      where: { id: userId },
      data: { level },
    });

    return {
      ...user,
      level,
    };
  }

  async getProfileCourses(userId: string): Promise<UserCourse[]> {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    const progressList = await prisma.courses_progress.findMany({
      where: {
        user_id: userId,
        is_delete: 0,
      },
      orderBy: {
        last_learned_at: 'desc',
      },
    });

    const courseIds = progressList.map((p) => p.course_id);

    const courses = await prisma.courses.findMany({
      where: {
        id: {
          in: courseIds,
        },
        is_delete: 0,
      },
      select: {
        id: true,
        cover_url: true,
        title: true,
        level: true,
      },
    });

    const courseMap = new Map(courses.map((c) => [c.id, c]));
    return progressList.map((progress) => {
      const course = courseMap.get(progress.course_id);
      return {
        id: progress.course_id,
        cover_url: course?.cover_url || '',
        title: course?.title || '',
        level: course?.level || 0,
        completed_lessons: progress.completed_lessons || 0,
        total_lessons: progress.total_lessons || 0,
        status: progress.status || 0,
        last_learned_at: progress.last_learned_at || new Date(),
      };
    });
  }

  async updateProfile(userId: string, data: UpdateUserInfopRequest) {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    if (!data.nickname || data.nickname.trim() === '') {
      throw new Error('昵称不能为空');
    }

    if (data.nickname.length > 50) {
      throw new Error('昵称长度不能超过50个字符');
    }

    if (data.occupation && data.occupation.length > 100) {
      throw new Error('职业长度不能超过100个字符');
    }

    const updatedUser = await prisma.users.update({
      where: {
        id: userId,
        is_delete: 0,
      },
      data: {
        nickname: data.nickname.trim(),
        avatar: data.avatar,
        sex: data.sex,
        occupation: data.occupation?.trim() || '',
        updated_at: new Date(),
      },
      select: {
        nickname: true,
        avatar: true,
        sex: true,
        occupation: true,
      },
    });

    if (!updatedUser) {
      throw new Error('更新用户信息失败');
    }

    return updatedUser;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    if (!file) {
      throw new Error('文件不能为空');
    }

    const avatarUrl = await uploadToOSS(file, 'avatars');

    const updatedUser = await prisma.users.update({
      where: {
        id: userId,
        is_delete: 0,
      },
      data: {
        avatar: avatarUrl,
        updated_at: new Date(),
      },
      select: {
        avatar: true,
      },
    });

    if (!updatedUser) {
      throw new Error('上传头像失败');
    }

    return { avatar: updatedUser.avatar };
  }

  async deleteOldAvatar(userId: string): Promise<void> {
    const user = await prisma.users.findFirst({
      where: {
        id: userId,
        is_delete: 0,
      },
      select: {
        avatar: true,
      },
    });

    if (!user?.avatar) return;

    const ossKey = extractOSSKey(user.avatar);
    if (ossKey) {
      await deleteFromOSS(ossKey);
    } else if (user.avatar.startsWith('/uploads/avatars/')) {
      const filePath = path.join(process.cwd(), user.avatar);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error('删除旧头像失败:', error);
      }
    }
  }
}

export const profileService = new ProfileService();
