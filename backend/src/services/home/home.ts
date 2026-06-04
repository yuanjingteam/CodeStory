import prisma from '@/config/prisma';

class HomeService {
  async getHomeCourses() {
   const courses = await prisma.courses.findMany({
     where: {
       is_delete: 0,
     },
     orderBy: {
       courses_progress: {
         _count: 'desc',
       },
     },
     take: 4,
     include: {
       _count: {
         select: {
           courses_progress: true,
         },
       },
     },
   });
    return courses.map((course) => {
      return {
        id: course.id,
        title: course.title,
        cover_url: course.cover_url || '',
        description: course.description || '',
        level: course.level || 0,
        study_count: course._count.courses_progress,
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