import prisma from '@/config/prisma';

class HomeService {
  async getHomeCourses(userId?: string) {
    const courses = await prisma.courses.findMany({
      where: {
        is_delete: 0,
      },
      orderBy: {
        course_seq: 'asc',
      },
      take: 4,
      include: {
        courses_progress: userId
          ? {
            where: {
              user_id: userId,
              is_delete: 0,
            },
            select: {
              completed_lessons: true,
              total_lessons: true,
            },
          }
          : false,
      },
    });

    const levelMap: Record<number, string> = {
      1: '入门',
      2: '初级',
      3: '中级',
      4: '高级',
    };

    return courses.map((course) => {
      const progress = course.courses_progress?.[0];
      return {
        id: course.id,
        title: course.title,
        cover_url: course.cover_url || '',
        description: course.description || '',
        level: levelMap[course.level] || '未知',
        course_seq: course.course_seq || 0,
        completed_lessons: progress?.completed_lessons || 0,
        total_lessons: progress?.total_lessons || 0,
      };
    });
  }


  //获取开始学习的课程路径
  async getStartLearningCourse(userId: string) {
    const progress = await prisma.courses_progress.findFirst({
      where: {
        user_id: userId,
        is_delete: 0,
        status:1
      },
      orderBy: {
        last_learned_at: 'asc',
      },
    });
    if (!progress) {
      return null;
    }
    return `/courses/${progress.course_id}`;
  }
}

export const homeService = new HomeService();
