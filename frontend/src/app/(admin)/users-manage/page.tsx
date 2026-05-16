'use client';
import { useState, useEffect, useMemo } from 'react';
import { FiEdit, FiTrash2, FiUser, FiMail } from 'react-icons/fi';
import {
  SearchFilter,
  DataTable,
  Pagination,
  type FilterField,
  type Column,
} from '@/components/common';

export interface User {
  id: string;
  email: string;
  role: number;
  nickname: string;
  avatar?: string;
  sex?: number;
  occupation?: string;
  score: number;
  level: number;
  created_at: string;
  is_delete: number;
}

const roleConfig: Record<number, { text: string; color: string }> = {
  0: { text: '普通用户', color: 'bg-green-400' },
  1: { text: '管理员', color: 'bg-red-400' },
  2: { text: '讲师', color: 'bg-blue-400' },
};

const sexConfig: Record<number, string> = {
  0: '男',
  1: '女',
  3: '未知',
};

const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@codestory.com',
    role: 1,
    nickname: '系统管理员',
    avatar: '',
    sex: 0,
    occupation: '技术工程师',
    score: 9999,
    level: 10,
    created_at: '2024-01-15',
    is_delete: 0,
  },
  {
    id: '2',
    email: 'teacher@codestory.com',
    role: 2,
    nickname: '李老师',
    avatar: '',
    sex: 1,
    occupation: '高级讲师',
    score: 5000,
    level: 8,
    created_at: '2024-02-20',
    is_delete: 0,
  },
  {
    id: '3',
    email: 'student1@codestory.com',
    role: 0,
    nickname: '张三',
    avatar: '',
    sex: 0,
    occupation: '大学生',
    score: 1250,
    level: 3,
    created_at: '2024-03-10',
    is_delete: 0,
  },
  {
    id: '4',
    email: 'student2@codestory.com',
    role: 0,
    nickname: '王小明',
    avatar: '',
    sex: 0,
    occupation: '程序员',
    score: 3200,
    level: 6,
    created_at: '2024-03-15',
    is_delete: 0,
  },
  {
    id: '5',
    email: 'student3@codestory.com',
    role: 0,
    nickname: '小红',
    avatar: '',
    sex: 1,
    occupation: '产品经理',
    score: 890,
    level: 2,
    created_at: '2024-04-01',
    is_delete: 0,
  },
  {
    id: '6',
    email: 'test@codestory.com',
    role: 0,
    nickname: '测试用户',
    avatar: '',
    sex: 0,
    occupation: '测试工程师',
    score: 0,
    level: 1,
    created_at: '2024-05-01',
    is_delete: 1,
  },
];

export default function UsersManagePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);

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
        { label: '讲师', value: 2 },
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
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 500);
  }, []);

  // 应用筛选条件
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 搜索关键词筛选
      const matchesSearch =
        user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // 角色筛选
      const roleFilter = filters.find((f) => f.id === 'role');
      const matchesRole =
        !roleFilter?.value || user.role === Number(roleFilter.value);

      // 状态筛选
      const statusFilter = filters.find((f) => f.id === 'status');
      const matchesStatus =
        !statusFilter?.value || user.is_delete === Number(statusFilter.value);

      // 关键词输入框筛选
      const keywordFilter = filters.find((f) => f.id === 'keyword');
      const keywordValue = String(keywordFilter?.value || '').toLowerCase();
      const matchesKeyword =
        !keywordValue ||
        user.nickname.toLowerCase().includes(keywordValue) ||
        user.email.toLowerCase().includes(keywordValue);

      return matchesSearch && matchesRole && matchesStatus && matchesKeyword;
    });
  }, [users, searchTerm, filters]);

  // 分页
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDelete = (userId: string) => {
    if (confirm('确定要删除该用户吗？')) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, is_delete: 1 } : user
        )
      );
    }
  };

  const handleRestore = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, is_delete: 0 } : user
      )
    );
  };

  // 处理每页条数变化
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // 处理筛选变化
  const handleFilterChange = (updatedFilters: FilterField[]) => {
    setFilters(updatedFilters);
  };

  // 获取筛选参数（用于传给后端）
  const getFilterParams = () => {
    const params: Record<string, string | number | boolean> = {};
    filters.forEach((filter) => {
      if (
        filter.value !== '' &&
        filter.value !== undefined &&
        filter.value !== null
      ) {
        params[filter.id] = filter.value;
      }
    });
    return params;
  };

  // 应用筛选（模拟调用后端）
  const handleApplyFilters = () => {
    const params = getFilterParams();
    console.log('筛选参数:', params);
    // 这里可以调用后端 API
    // fetchUsers(params);
  };

  const columns: Column<User>[] = [
    {
      id: 'id  ',
      key: 'id',
      header: 'ID',
      flex: 0.5,
      ellipsis: true,
      align: 'left',
    },
    {
      id: 'nickname',
      key: 'nickname',
      header: '用户信息',
      flex: 2,
      render: (value, item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-black bg-purple-200 flex items-center justify-center">
            <FiUser className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div
              className="font-bold text-sm truncate"
              title={String(value ?? '')}
            >
              {value}
            </div>
            <div className="text-xs text-gray-500">
              {sexConfig[item.sex ?? 3]} | {item.occupation ?? ''}
            </div>
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
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <FiMail className="w-3 h-3" />
          <span className="truncate" title={String(value ?? '')}>
            {value}
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
            className={`${roleConfig[role].color} border-2 border-black px-2 py-0.5 text-xs font-black text-white`}
          >
            {roleConfig[role].text}
          </span>
        );
      },
    },
    {
      id: 'level',
      key: 'level',
      header: '等级',
      flex: 1.5,
      align: 'center',
      render: (value) => (
        <span className="bg-yellow-300 border-2 border-black px-2 py-0.5 text-xs font-black">
          Lv.{value}
        </span>
      ),
    },
    {
      id: 'score',
      key: 'score',
      header: '积分',
      flex: 1.5,
      align: 'center',
      render: (value) => (
        <span className="font-bold text-purple-600">{value}</span>
      ),
    },
    {
      id: 'created_at',
      key: 'created_at',
      header: '注册时间',
      flex: 2,
      ellipsis: true,
      align: 'center',
    },
    {
      id: 'actions',
      header: '操作',
      flex: 2.5,
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-blue-400 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1">
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
      {/* 搜索筛选和添加用户在同一行 */}
      <div className="flex items-center  gap-4">
        <SearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="搜索用户名或邮箱..."
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          stats={[
            {
              label: '正常',
              value: users.filter((u) => u.is_delete === 0).length,
              color: 'bg-green-100 text-green-700',
            },
            {
              label: '已删除',
              value: users.filter((u) => u.is_delete === 1).length,
              color: 'bg-gray-100 text-gray-600',
            },
          ]}
        />
        <button className="px-6 py-2 bg-purple-500 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 shrink-0">
          + 添加用户
        </button>
      </div>

      {/* 数据表格 */}
      <DataTable<User>
        columns={columns}
        data={paginatedUsers}
        loading={loading}
        emptyText="暂无用户数据"
        emptyIcon={<FiUser className="w-16 h-16 text-gray-300" />}
        getRowClassName={(user) =>
          user.is_delete === 1 ? 'bg-gray-100 opacity-60' : ''
        }
        maxHeight="600px"
      />

      {/* 分页 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredUsers.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[3, 5, 10, 20]}
      />
    </div>
  );
}
