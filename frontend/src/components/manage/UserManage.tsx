'use client';
import { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash2, FiUser, FiMail, FiRefreshCw } from 'react-icons/fi';
import type { UserDetail, UpdateUserDetailRequest } from '@/types/user-manage';
import {
  SearchFilter,
  DataTable,
  Pagination,
  ConfirmDialog,
  type FilterField,
  type Column,
} from '@/components/common';
import type { PaginationResponse } from '@/types/user-manage';
import { userRoleMap, userSexMap } from '@/utils/constants';
import {
  getUserList,
  updateUserDetail,
  deleteUser as deleteUserApi,
  restoreUser as restoreUserApi,
} from '@/app/api/manage/user-manage';
import { formatDate } from '@/utils/format';
import { toast } from 'sonner';
import UserModel from '@/components/manage/UserModel';

import Img from 'next/image';

export default function UserManage() {
  const [userList, setUserList] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationResponse>({
    pageSize: 10,
    currentPage: 1,
    total: 0,
    totalPages: 0,
  });

  // 弹窗状态
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const hasMounted = useRef(false);

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
  });

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

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const roleValue = filters.find((f) => f.id === 'role')?.value;
      const statusValue = filters.find((f) => f.id === 'status')?.value;

      const res = await getUserList({
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        search: searchTerm || '',
        role:
          roleValue !== '' && roleValue !== undefined ? String(roleValue) : '',
        status:
          statusValue !== '' && statusValue !== undefined
            ? String(statusValue)
            : '',
      });
      if (res.code === 200) {
        setUserList(res.data.list);
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

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    if (hasMounted.current) {
      fetchUsers();
    }
  }, [pagination.currentPage, pagination.pageSize]);

  // 删除用户
  const handleDelete = async (userId: string) => {
    setConfirmDialog({
      open: true,
      title: '确认删除',
      message: '确定要删除该用户吗？此操作可以恢复。',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await deleteUserApi(userId);
          if (res.code === 200) {
            toast.success('删除成功');
            fetchUsers();
          }
        } catch (error) {
          console.error('删除用户失败:', error);
          toast.error('删除失败');
        }
      },
      variant: 'danger',
    });
  };

  // 恢复用户
  const handleRestore = async (userId: string) => {
    setConfirmDialog({
      open: true,
      title: '确认恢复',
      message: '确定要恢复该用户吗？',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const res = await restoreUserApi(userId);
          if (res.code === 200) {
            toast.success('恢复成功');
            fetchUsers();
          }
        } catch (error) {
          console.error('恢复用户失败:', error);
          toast.error('恢复失败');
        }
      },
      variant: 'warning',
    });
  };

  // 打开编辑用户弹窗
  const handleEditUser = (user: UserDetail) => {
    setEditingUserId(user.id);
    setShowUserModal(true);
  };

  // 提交用户数据
  const handleSubmitUser = async (data: UpdateUserDetailRequest) => {
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
      }
    } catch (error) {
      console.error('保存用户失败:', error);
    }
  };

  // 处理筛选变化
  const handleFilterChange = (updatedFilters: FilterField[]) => {
    setFilters(updatedFilters);
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
      flex: 2.5,
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
      flex: 3,
      ellipsis: true,
      render: (value) => (
        <div className="flex mr-2 items-center gap-1 text-sm text-gray-600">
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
      render: (value) => formatDate(value as string, 'YYYY-MM-DD HH:mm:ss'),
      align: 'left',
    },
    {
      id: 'updated_at',
      key: 'updated_at',
      header: '更新时间',
      flex: 2,
      ellipsis: true,
      render: (value) => formatDate(value as string, 'YYYY-MM-DD HH:mm:ss'),
      align: 'left',
    },
    {
      id: 'actions',
      header: '操作',
      flex: 3,
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditUser(item)}
            className="px-3 py-1 bg-blue-400 text-white  text-xs font-bold border-2 rounded-md border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
          >
            <FiEdit className="w-3 h-3" />
            编辑
          </button>
          {item.is_delete === 1 ? (
            <button
              onClick={() => handleRestore(item.id)}
              className="px-3 py-1 bg-green-400 text-white text-xs  font-bold border-2 rounded-md border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
            >
              <FiRefreshCw className="w-3 h-3" />
              恢复
            </button>
          ) : (
            <button
              onClick={() => handleDelete(item.id)}
              className="px-3 py-1 bg-red-400 text-white text-xs  font-bold border-2 rounded-md border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
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
    <div className="h-[calc(100vh-130px)] flex flex-col gap-4">
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="搜索用户名或邮箱..."
        filters={filters}
        onFilterChange={handleFilterChange}
        onApplyFilters={() => {
          setPagination((prev) => ({ ...prev, currentPage: 1 }));
          fetchUsers();
        }}
      />
      <div className="flex-1 min-h-0  flex flex-col">
        {/* 数据表格 */}
        <DataTable<UserDetail>
          columns={columns}
          data={userList}
          loading={loading}
          emptyText="暂无用户数据"
          emptyIcon={<FiUser className="w-16 h-16 text-gray-300" />}
          getRowClassName={(user) =>
            user.is_delete === 1 ? 'bg-gray-300 opacity-60' : ''
          }
        />
      </div>

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

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="确认"
        cancelText="取消"
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
