'use client';
import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import { SearchFilter, DataTable, Pagination, ConfirmDialog } from '@/components/common';
import type { FilterField, Column } from '@/components/common';
import CourseModel from './CourseModel';
import courseApi from '@/app/api/courses/courses';
import courseManageApi from '@/app/api/manage/course-manage';
import type { Course } from '@/types/course';
import type { CourseFormData } from '@/types/course-manage';

const levelMap: Record<number, string> = {
  0: '初级',
  1: '中级',
  2: '高级',
};

const levelColorMap: Record<number, string> = {
  0: 'bg-green-300',
  1: 'bg-yellow-300',
  2: 'bg-red-300',
};

export default function CourseManage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<(CourseFormData & { id: string; cover_url?: string }) | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [filters, setFilters] = useState<FilterField[]>([
    {
      id: 'level',
      label: '难度',
      type: 'select',
      value: '',
      options: [
        { label: '全部难度', value: '' },
        { label: '初级', value: 0 },
        { label: '中级', value: 1 },
        { label: '高级', value: 2 },
      ],
    },
  ]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const levelValue = filters.find(f => f.id === 'level')?.value;
      const res = await courseApi.getList({
        keyword: searchTerm || undefined,
        level: levelValue !== '' && levelValue !== undefined ? Number(levelValue) : undefined,
        page,
        size,
      });
      setCourses(res.records || []);
      setTotal(res.total);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [page, size]);

  const handleSubmit = async (data: CourseFormData & { id?: string }) => {
    if (data.id) {
      await courseManageApi.update(data.id, data);
      showToast.success('课程更新成功');
    } else {
      await courseManageApi.create(data);
      showToast.success('课程创建成功');
    }
    fetchCourses();
  };

  const handleOpenCreate = () => {
    setEditingCourse(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Course) => {
    setEditingCourse({
      id: String(item.id),
      title: item.title,
      description: item.description || '',
      level: Number(item.level),
      cover_url: item.cover_url,
    });
    setModalOpen(true);
  };

  const handleOpenDelete = (item: Course) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await courseManageApi.delete(deleteTarget.id);
      showToast.success(`课程「${deleteTarget.title}」已删除`);
      fetchCourses();
    }
    setDeleteTarget(null);
  };

  const columns: Column<Course>[] = [
    {
      id: 'title',
      key: 'title',
      header: '课程名',
      flex: 2,
      render: (_, item) => (
        <span className="font-bold text-gray-800">{item.title}</span>
      ),
    },
    {
      id: 'description',
      key: 'description',
      header: '描述',
      flex: 3,
      ellipsis: true,
    },
    {
      id: 'level',
      key: 'level',
      header: '难度',
      flex: 1,
      align: 'center',
      render: (value) => {
        const numLevel = typeof value === 'string' ? parseInt(value) : (value as number);
        return (
          <span className={`px-3 py-1 font-bold border-2 border-black ${levelColorMap[numLevel] || 'bg-gray-300'}`}>
            {levelMap[numLevel] || '未知'}
          </span>
        );
      },
    },
    {
      id: 'cover_url',
      key: 'cover_url',
      header: '封面',
      flex: 1,
      align: 'center',
      render: (value) =>
        value ? (
          <img src={String(value)} alt="" className="w-12 h-12 object-cover border-2 border-black" />
        ) : (
          <div className="w-12 h-12 bg-gray-200 border-2 border-black flex items-center justify-center text-xs font-bold">
            暂无
          </div>
        ),
    },
    {
      id: 'actions',
      header: '操作',
      flex: 2,
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEdit(item)}
            className="px-3 py-1 bg-blue-400 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
          >
            <FiEdit className="w-3 h-3" />
            编辑
          </button>
          <button
            onClick={() => handleOpenDelete(item)}
            className="px-3 py-1 bg-red-400 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
          >
            <FiTrash2 className="w-3 h-3" />
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="搜索课程名称或描述..."
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={() => {
          setPage(1);
          fetchCourses();
        }}
        actionSlot={
          <button
            onClick={handleOpenCreate}
            className="px-6 py-2 bg-purple-500 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
          >
            + 新建课程
          </button>
        }
      />

      <DataTable<Course> columns={columns} data={courses} loading={loading} maxHeight="500px" />

      <Pagination
        currentPage={page}
        totalPages={Math.ceil(total / size) || 1}
        totalItems={total}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setSize(newSize);
          setPage(1);
        }}
      />

      <CourseModel
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingCourse}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除课程"
        message={`确定删除「${deleteTarget?.title}」吗？删除后不可恢复。`}
        confirmText="确认"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
