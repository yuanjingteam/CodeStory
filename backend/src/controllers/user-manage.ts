import { Request, Response } from 'express';
import { userManageService } from '../services/user-manage/user-manage';

class UserManageController {
  /**
   * 获取用户列表
   */
  async getUserList(req: Request, res: Response) {
    try {
      const data = req.body as {
        page: number;
        pageSize: number;
        search: string;
        role: number | string;
        status: number | string;
      };
      const result = await userManageService.getUserList(data);

      return res.status(200).json({
        code: 200,
        message: '获取用户列表成功',
        data: result,
      });
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return res.status(500).json({
        code: 500,
        message: '获取用户列表失败',
      });
    }
  }

  /**
   * 获取用户详情通过ID
   */
  async getUserDetailById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new Error('ID不能为空');
      }
      if (!id || Array.isArray(id)) {
        throw new Error('ID参数错误');
      }
      const user = await userManageService.getUserDetailById(id);

      return res.status(200).json({
        code: 200,
        message: '获取用户详情成功',
        data: user,
      });
    } catch (error) {
      return res.status(400).json({
        code: 400,
        message: '获取用户详情失败',
      });
    }
  }

  /**
   * 添加用户
   */
  async addUser(req: Request, res: Response) {
    try {
      const userData = req.body;
      if (!userData) {
        throw new Error('用户数据不能为空');
      }
      await userManageService.createUser(userData);
      return res.status(200).json({
        code: 200,
        message: '添加用户成功',
      });
    } catch (error) {
      return res.status(400).json({
        code: 400,
        message: '添加用户失败',
      });
    }
  }

  /**
   * 更新用户信息
   */
  async updateUserDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userData = req.body;
      if (!userData) {
        throw new Error('用户数据不能为空');
      }
      await userManageService.updateUser(id as string, userData);

      return res.status(200).json({
        code: 200,
        message: '更新用户信息成功',
      });
    } catch (error) {
      return res.status(400).json({
        code: 400,
        message: '更新用户信息失败',
      });
    }
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new Error('ID不能为空');
      }
      if (!id || Array.isArray(id)) {
        throw new Error('ID参数错误');
      }
      await userManageService.deleteUser(id as string);

      return res.status(200).json({
        code: 200,
        message: '删除用户成功',
      });
    } catch (error) {
      return res.status(500).json({
        code: 500,
        message: '删除用户失败',
      });
    }
  }

  /**
   * 恢复用户
   */
  async restoreUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new Error('ID不能为空');
      }
      if (!id || Array.isArray(id)) {
        throw new Error('ID参数错误');
      }
      await userManageService.restoreUser(id as string);

      return res.status(200).json({
        code: 200,
        message: '恢复用户成功',
      });
    } catch (error) {
      console.error('恢复用户失败:', error);
      return res.status(500).json({
        code: 500,
        message: '恢复用户失败',
      });
    }
  }
}

export const userManageController = new UserManageController();
