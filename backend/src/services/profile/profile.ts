import prisma from '@/config/prisma';
import { UpdateUserInfopRequest, UserCourse } from 'shared/types/profile';

class ProfileService {
  async getProfile(userId?: string) {
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
    return user;
  }

  async getProfileCourses(userId: string): Promise<UserCourse[]> {
    // 1. 查询用户的课程进度
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

    const courseMap = new Map(courses.map((c) => [c.id, c]))
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
    const updatedUser = await prisma.users.update({
      where: {
        id: userId,
        is_delete: 0,
      },
      data: {
        nickname: data.nickname,
        avatar: data.avatar,
        sex: data.sex,
        occupation: data.occupation,
        updated_at: new Date(),
      },
      select: {
        nickname: true,
        avatar: true,
        sex: true,
        occupation: true,
      },
    });
    return updatedUser;
  }
}

export const profileService = new ProfileService();
