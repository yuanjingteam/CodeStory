import prisma from '@/config/prisma';

class HomeService {
  async getHomeCourses(userId?: string) {
    const courses = await prisma.courses.findMany({
      where: {
        is_delete: 0,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 4,
      include: {
        courses_progress: {
          where: {
            is_delete: 0,
          },
          select: {
            user_id: true,
            completed_lessons: true,
            total_lessons: true,
          },
        },
      },
    });

    return courses.map((course) => {
      const progressList = course.courses_progress;
      const studentCount = progressList.length;
      const progress = userId
        ? progressList.find((p) => p.user_id === userId)
        : progressList[0];

      return {
        id: course.id,
        title: course.title,
        cover_url: course.cover_url || '',
        description: course.description || '',
        level: course.level || 0,
        course_seq: course.course_seq || 0,
        student_count: studentCount,
        completed_lessons: progress?.completed_lessons || 0,
        total_lessons: progress?.total_lessons || 0,
      };
    });
  }

  async getStartLearningCourse(userId: string) {
    const progress = await prisma.courses_progress.findFirst({
      where: {
        user_id: userId,
        is_delete: 0,
        status: 1,
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

  async getHomeStats() {
    const [totalCourses, totalUsers, progress, totalLessons] = await Promise.all([
      prisma.courses.count({ where: { is_delete: 0 } }),
      prisma.users.count({ where: { is_delete: 0 } }),
      prisma.courses_progress.aggregate({
        where: { is_delete: 0 },
        _sum: {
          completed_lessons: true,
          total_lessons: true,
        },
      }),
      prisma.lessons.count({ where: { is_delete: 0 } }),
    ]);

    const totalCompleted = progress._sum.completed_lessons || 0;
    const totalLessonsStudied = progress._sum.total_lessons || 0;
    const completionRate = totalLessonsStudied > 0 
      ? Math.round((totalCompleted / totalLessonsStudied) * 100) 
      : 0;

    return {
      course_count: totalCourses,
      lesson_count: totalLessons,
      completion_rate: completionRate,
      user_count: totalUsers,
    };
  }
}

export const homeService = new HomeService();