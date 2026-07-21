import { Request, Response } from 'express';
import { homeService } from '@/services/home/home';

class HomeController {
  async getHomeCourses(req: Request, res: Response) {
    const userId = req.user?.id;
    try {
      const data = await homeService.getHomeCourses();
      return res.status(200).json({
        code: 200,
        message: '成功获取热门课程',
        data,
      });
    } catch (error) {
      console.error('Failed to get home courses:', error);
      return res.status(500).json({
        code: 500,
        message: '获取热门课程失败',
        data: null,
      });
    }
  }

  async startLearning(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({
          code: 400,
          message: '用户ID不能为空',
          data: null,
        });
      }

      const path = await homeService.getStartLearningCourse(userId);
      return res.status(200).json({
        code: 200,
        message: '成功跳转学习',
        data: {
          path,
        },
      });
    } catch (error) {
      console.error('Failed to start learning:', error);
      return res.status(500).json({
        code: 500,
        message: '跳转学习失败',
        data: null,
      });
    }
  }

  async getLearningStats(req: Request, res: Response) {
    try {
      const data = await homeService.getHomeStats();
      return res.status(200).json({
        code: 200,
        message: '成功获取学习统计数据',
        data,
      });
    } catch (error) {
      console.error('Failed to get learning stats:', error);
      return res.status(500).json({
        code: 500,
        message: '获取学习统计数据失败',
        data: null,
      });
    }
  }
}

export const homeController = new HomeController();