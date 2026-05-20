'use client';
import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiUser, FiMail } from 'react-icons/fi';
import type {
  UserDetail,
  GetUserListRequest,
  UserDetailRequest,
} from 'shared/types/user-manage';
import {
  SearchFilter,
  DataTable,
  Pagination,
  type FilterField,
  type Column,
} from '@/components/common';
import type { PaginationResponse } from 'shared/types/user-manage';
import { userRoleMap, userSexMap } from '@/utils/constants';
import {
  getUserList,
  addUser,
  updateUserDetail,
  deleteUser as deleteUserApi,
  restoreUser as restoreUserApi,
} from '@/app/api/manage/user-manage';
import { formatDate } from '@/utils/format';
import { toast } from 'sonner';
import UserModel from '@/components/manage/UserModel';

import Img from 'next/image';

export default function UsersManagePage() {
  const [userList, setUserList] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState({
    search: '',
    role: '',
    status: '',
  });
  const [pagination, setPagination] = useState<PaginationResponse>({
    pageSize: 5,
    currentPage: 1,
    total: 0,
    totalPages: 0,
  });

  // 弹窗状态
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // 筛选字段配置
  const [filters, setFilters] = useState<FilterField[]>([
    {
      id: 'role',
      label: '角色',
      type: 'select',
      value: '',
      options: [
        { label: '全部角色', value: '' },
        { label: '普通用户', value: 0 },
        { label: '管理员', value: 1 },
      ],
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      value: '',
      options: [
        { label: '全部状态', value: '' },
        { label: '正常', value: 0 },
        { label: '已删除', value: 1 },
      ],
    },
  ]);

  useEffect(() => {
    // 获取用户列表
    const fetchUsers = async (data: GetUserListRequest) => {
      setLoading(true);
      try {
        const res = await getUserList(data);
        if (res.code === 200) {
          setUserList(res.data.list);
          // 使用函数式更新避免闭包问题
          setPagination((prev) => ({
            ...prev,
            total: res.data.pagination.total,
            totalPages: res.data.pagination.totalPages,
          }));
        }
      } catch (error) {
        console.error('获取用户列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      search: searchTerm.search || '',
      role: searchTerm.role || '',
      status: searchTerm.status || '',
    });
  }, [
    pagination.currentPage,
    pagination.pageSize,
    searchTerm.search,
    searchTerm.role,
    searchTerm.status,
  ]);

  // 删除用户
  const handleDelete = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？')) return;

    try {
      const res = await deleteUserApi(userId);
      if (res.code === 200) {
        setUserList((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, is_delete: 1 } : user
          )
        );
        toast.success('删除成功');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      toast.error('删除失败');
    }
  };

  // 恢复用户
  const handleRestore = async (userId: string) => {
    try {
      const res = await restoreUserApi(userId);
      if (res.code === 200) {
        setUserList((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, is_delete: 0 } : user
          )
        );
        toast.success('恢复成功');
      }
    } catch (error) {
      console.error('恢复用户失败:', error);
      toast.error('恢复失败');
    }
  };

  // 打开添加用户弹窗
  const handleAddUser = () => {
    setEditingUserId(null);
    setShowUserModal(true);
  };

  // 打开编辑用户弹窗
  const handleEditUser = (user: UserDetail) => {
    setEditingUserId(user.id);
    setShowUserModal(true);
  };

  // 提交用户数据
  const handleSubmitUser = async (data: UserDetailRequest) => {
    try {
      if (data.id) {
        // 编辑用户
        const res = await updateUserDetail(data.id, {
          email: data.email,
          nickname: data.nickname,
          avatar: data.avatar,
          sex: data.sex,
          occupation: data.occupation,
          role: data.role,
          level: data.level,
          score: data.score,
        });
        if (res.code === 200) {
          setUserList((prev) =>
            prev.map((user) =>
              user.id === data.id ? { ...user, ...data } : user
            )
          );
          toast.success('更新成功');
        }
      } else {
        const res = await addUser({
          id: data.id,
          email: data.email,
          nickname: data.nickname,
          avatar: data.avatar,
          sex: data.sex,
          occupation: data.occupation,
          role: data.role,
          level: data.level,
          score: data.score,
        });
        if (res.code === 200) {
          // 刷新列表
          setPagination((prev) => ({ ...prev, currentPage: 1 }));
          toast.success('添加成功');
        }
      }
    } catch (error) {
      console.error('保存用户失败:', error);
    }
  };

  // 处理筛选变化
  const handleFilterChange = (updatedFilters: FilterField[]) => {
    setFilters(updatedFilters);
    // 同步更新 searchTerm 状态，触发 useEffect 重新请求
    const roleFilter = updatedFilters.find((f) => f.id === 'role');
    const statusFilter = updatedFilters.find((f) => f.id === 'status');
    setSearchTerm((prev) => ({
      ...prev,
      role: String(roleFilter?.value || ''),
      status: String(statusFilter?.value || ''),
    }));
  };

  const columns: Column<UserDetail>[] = [
    {
      id: 'id',
      key: 'id',
      header: 'ID',
      flex: 0.5,
      ellipsis: true,
      align: 'left',
    },
    {
      id: 'avatar',
      key: 'avatar',
      header: '头像',
      flex: 1,
      align: 'center',
      render: (value) => (
        <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden bg-purple-200 flex items-center justify-center">
          {value ? (
            <Img
              src={value as string}
              alt="头像"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <FiUser className="w-4 h-4 text-purple-600" />
          )}
        </div>
      ),
    },
    {
      id: 'userInfo',
      header: '用户信息',
      flex: 3,
      render: (_, item) => (
        <div>
          <div
            className="font-bold text-sm truncate"
            title={item.nickname || ''}
          >
            {item.nickname}
          </div>
          <div className="text-xs text-gray-500">
            <span>{userSexMap[item.sex || 0]}</span>
            <span> {item.occupation || '未设置职业'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'email',
      key: 'email',
      header: '邮箱',
      flex: 2.5,
      ellipsis: true,
      render: (value) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <FiMail className="w-3 h-3" />
          <span className="truncate" title={String(value ?? '')}>
            {value as string}
          </span>
        </div>
      ),
    },
    {
      id: 'role',
      key: 'role',
      header: '角色',
      flex: 1.5,
      align: 'center',
      render: (value) => {
        const role = Number(value);
        return (
          <span
            className={`${userRoleMap[role]?.color || 'bg-gray-400'} border-2 border-black px-2 py-0.5 text-xs font-black`}
          >
            {userRoleMap[role]?.text || '未知'}
          </span>
        );
      },
    },
    {
      id: 'level',
      key: 'level',
      header: '等级',
      flex: 1,
      align: 'center',
      render: (value) => (
        <span className="bg-yellow-300 border-2 border-black px-2 py-0.5 text-xs font-black">
          LV.{value as number}
        </span>
      ),
    },
    {
      id: 'score',
      key: 'score',
      header: '积分',
      flex: 1,
      align: 'center',
      render: (value) => (
        <span className="font-bold text-purple-600">{value as number}</span>
      ),
    },
    {
      id: 'created_at',
      key: 'created_at',
      header: '注册时间',
      flex: 2,
      ellipsis: true,
      render: (value) => formatDate(value as string, 'YYYY-MM-DD'),
      align: 'center',
    },
    {
      id: 'updated_at',
      key: 'updated_at',
      header: '更新时间',
      flex: 2,
      ellipsis: true,
      render: (value) => formatDate(value as string, 'YYYY-MM-DD'),
      align: 'center',
    },
    {
      id: 'actions',
      header: '操作',
      flex: 2.5,
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditUser(item)}
            className="px-3 py-1 bg-blue-400 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
          >
            <FiEdit className="w-3 h-3" />
            编辑
          </button>
          {item.is_delete === 1 ? (
            <button
              onClick={() => handleRestore(item.id)}
              className="px-3 py-1 bg-green-400 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              恢复
            </button>
          ) : (
            <button
              onClick={() => handleDelete(item.id)}
              className="px-3 py-1 bg-red-400 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
            >
              <FiTrash2 className="w-3 h-3" />
              删除
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SearchFilter
        searchTerm={searchTerm.search}
        onSearchChange={(value) =>
          setSearchTerm({ ...searchTerm, search: value })
        }
        searchPlaceholder="搜索用户名或邮箱..."
        filters={filters}
        onFilterChange={handleFilterChange}
        actionSlot={
          <button
            onClick={handleAddUser}
            className="px-6 py-2 bg-purple-500 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 shrink-0"
          >
            + 添加用户
          </button>
        }
      />

      {/* 数据表格 */}
      <DataTable<UserDetail>
        columns={columns}
        data={userList}
        loading={loading}
        emptyText="暂无用户数据"
        emptyIcon={<FiUser className="w-16 h-16 text-gray-300" />}
        getRowClassName={(user) =>
          user.is_delete === 1 ? 'bg-gray-100 opacity-60' : ''
        }
        maxHeight="500px"
      />

      {/* 分页 */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={(page) =>
          setPagination({ ...pagination, currentPage: page })
        }
        onPageSizeChange={(pageSize) =>
          setPagination({ ...pagination, pageSize: pageSize })
        }
        pageSizeOptions={[10, 20, 50, 100]}
      />

      {/* 用户编辑/添加弹窗 */}
      <UserModel
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSubmit={handleSubmitUser}
        userId={editingUserId}
        loading={loading}
      />
    </div>
  );
}
