import { Request, Response } from 'express';
import { profileService } from '@/services/profile/profile';


class ProfileController {
  // 获取用户信息控制器
  async getProfile(req: Request, res: Response) {
    const userId = req.user.id;
    try {
      const data = await profileService.getProfile(userId);
      return res.status(200).json({
        code: 200,
        message: '成功获取用户信息',
        data,
      });
    } catch (error) {
      console.error('Failed to get profile:', error);
      return res.status(500).json({
        code: 500,
        message: '获取用户信息失败',
        data: null,
      });
    }
  }
  // 获取用户学习课程控制器
    async getUserCourses(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(400).json({
          code: 400,
          message: '用户ID不能为空',
          data: null,
        });
      }

      const data = await profileService.getProfileCourses(userId);
      return res.status(200).json({
        code: 200,
        message: '成功获取用户学习课程',
        data,
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
  // 更新用户信息控制器
  async updateUserProfile(req: Request, res: Response) {
    const userId = req.user.id;
    try {
      const data = await profileService.updateProfile(userId, req.body);
      return res.status(200).json({
        code: 200,
        message: '成功更新用户信息',
        data,
      });
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return res.status(500).json({
        code: 500,
        message: '更新用户信息失败',
        data: null,
      });
    }
    }
//     // 上传用户头像控制器
//     async uploadAvatar(req: Request, res: Response) {
//       const userId = req.user.id;
//       try {
//         const file = req.file as Multer.File;
//         if (!file) {
//           return res.status(400).json({
//             code: 400,
//             message: '文件不能为空',
//             data: null,
//           });
//         }
//         const data = await profileService.uploadAvatar(userId, file);
//         return res.status(200).json({
//           code: 200,
//           message: '成功上传用户头像',
//           data,
//         });
//       } catch (error) {
//         console.error('Failed to upload avatar:', error);
//         return res.status(500).json({
//           code: 500,
//           message: '上传用户头像失败',
//           data: null,
//         });
//       }
//     }
}

export const profileController = new ProfileController();
