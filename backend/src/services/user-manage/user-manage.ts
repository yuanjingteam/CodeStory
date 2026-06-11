import prisma from '@/config/prisma';
import type {
  GetUserListRequest,
  UpdateUserDetailRequest,
  UserDetail,
  UserListResponse,
} from '@/types/user-manage';
import { success, fail, badRequest, notFound } from '../../utils/response';
class UserManageService {
  async getUserList(params: GetUserListRequest): Promise<UserListResponse> {
    const { page = 1, pageSize = 10, search, role, status } = params;
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (search) {
      where.OR = [
        { nickname: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (role !== undefined && role !== null && role !== '') {
      where.role = Number(role);
    }
    if (status !== undefined && status !== null && status !== '') {
      where.is_delete = Number(status);
    }

    const data = await prisma.users.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ is_delete: 'asc' }, { created_at: 'asc' }],
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        sex: true,
        occupation: true,
        role: true,
        score: true,
        level: true,
        is_delete: true,
        created_at: true,
        updated_at: true,
      },
    });
    const total = await prisma.users.count({ where });
    return {
      list: data,
      pagination: {
        pageSize,
        currentPage: page,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取单个用户详情
   * @param id 用户ID
   * @param includeDeleted 是否包含已删除用户（默认不包含）
   */
  async getUserDetailById(
    id: string,
    includeDeleted = false
  ): Promise<UserDetail> {
    const user = await prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      return notFound('用户不存在');
    }

    // 如果不允许查看已删除用户且用户已被删除
    if (!includeDeleted && user.is_delete === 1) {
      return notFound('用户已被删除');
    }

    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUser(
    id: string,
    data: Partial<UpdateUserDetailRequest>
  ): Promise<void> {
    // 如果更新邮箱，检查新邮箱是否已被其他用户使用
    if (data.email) {
      const existingUser = await prisma.users.findFirst({
        where: {
          email: data.email,
          id: { not: id },
        },
      });

      if (existingUser) {
        return badRequest('该邮箱已被注册');
      }
    }
    if (data.score) {
      const level = Math.floor(data.score / 1500);
      await prisma.users.update({
        where: { id },
        data: {
          level: level,
        },
      });
    }

    await prisma.users.update({
      where: { id },
      data: {
        email: data.email,
        nickname: data.nickname,
        avatar: data.avatar,
        sex: data.sex,
        occupation: data.occupation,
        role: data.role,
        score: data.score,
        updated_at: new Date(),
      },
    });
  }

  /**
   * 软删除用户
   */
  async deleteUser(id: string): Promise<void> {
    await prisma.users.update({
      where: { id },
      data: {
        is_delete: 1,
        updated_at: new Date(),
      },
    });
  }

  /**
   * 恢复用户
   */
  async restoreUser(id: string): Promise<void> {
    await prisma.users.update({
      where: { id },
      data: {
        is_delete: 0,
        updated_at: new Date(),
      },
    });
  }
}

export const userManageService = new UserManageService();
