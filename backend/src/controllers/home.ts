import { Request, Response } from 'express';
import { homeService } from '@/services/home/home';

class HomeController {
  // 获取热门课程控制器
  async getHomeCourses(req: Request, res: Response) {
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
  //开始学习跳转控制器
  async startLearning(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          code: 400,
          message: '用户ID不能为空',
          data: null,
        });
      }

      const path = await homeService.getStartLearningCourse(userId as string);
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
}

export const homeController = new HomeController();
