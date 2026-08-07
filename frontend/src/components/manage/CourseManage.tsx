'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiEdit, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import { showKnowledgeIndexResult } from '@/utils/knowledgeIndex';
import {
  SearchFilter,
  DataTable,
  Pagination,
  ConfirmDialog,
} from '@/components/common';
import type { FilterField, Column } from '@/components/common';
import CourseModel from './CourseModel';
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

interface CourseManageQuery {
  keyword?: string;
  level?: number;
  status: 'active' | 'deleted';
  page: number;
  size: number;
}

export default function CourseManage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<CourseManageQuery>({
    status: 'active',
    page: 1,
    size: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<
    (CourseFormData & { id: string; cover_url?: string }) | undefined
  >();
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [restoringId, setRestoringId] = useState<string | number | null>(
    null
  );
  const [filters, setFilters] = useState<FilterField[]>([
    {
      id: 'status',
      label: '数据状态',
      type: 'select',
      value: 'active',
      options: [
        { label: '有效内容', value: 'active' },
        { label: '回收站', value: 'deleted' },
      ],
    },
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

  const refreshCourses = async () => {
    setLoading(true);
    try {
      const res = await courseManageApi.getList(query);
      setCourses(res.records || []);
      setTotal(res.total);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    courseManageApi
      .getList(query)
      .then((res) => {
        if (cancelled) return;
        setCourses(res.records || []);
        setTotal(res.total);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('获取课程列表失败:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleSubmit = async (data: CourseFormData & { id?: string }) => {
    if (data.id) {
      const response = await courseManageApi.update(data.id, data);
      showKnowledgeIndexResult(
        '课程更新成功',
        response.indexSummary
      );
    } else {
      await courseManageApi.create(data);
      showToast.success('课程创建成功');
    }
    await refreshCourses();
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
      await refreshCourses();
    }
    setDeleteTarget(null);
  };

  const handleRestore = async (item: Course) => {
    setRestoringId(item.id);
    try {
      await courseManageApi.restore(item.id);
      showToast.success(`课程「${item.title}」已恢复`);
      await refreshCourses();
    } catch (error) {
      console.error('恢复课程失败:', error);
      showToast.error('恢复课程失败，请稍后重试');
    } finally {
      setRestoringId(null);
    }
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
        const numLevel =
          typeof value === 'string' ? parseInt(value) : (value as number);
        return (
          <span className={`px-3 py-1 font-bold border-2 border-black rounded-md ${levelColorMap[numLevel] || 'bg-gray-300'}`}>
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
          <Image
            src={String(value)}
            alt="课程封面"
            width={36}
            height={36}
            className="w-9 h-9 object-cover border-2 border-black"
          />
        ) : (
          <div className="w-9 h-9 bg-gray-200 border-2 border-black flex items-center justify-center text-xs font-bold">
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
          {query.status === 'deleted' ? (
            <button
              onClick={() => handleRestore(item)}
              disabled={restoringId === item.id}
              className="flex items-center gap-1 border-2 border-black bg-green-300 px-3 py-1 text-xs font-bold text-zinc-950 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-wait disabled:opacity-60"
            >
              <FiRotateCcw className="h-3 w-3" />
              {restoringId === item.id ? '恢复中' : '恢复'}
            </button>
          ) : (
            <>
          <button
            onClick={() => handleOpenEdit(item)}
            className="px-3 py-1 bg-blue-400 text-white text-xs font-bold border-2 border-black rounded-md shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
          >
            <FiEdit className="w-3 h-3" />
            编辑
          </button>
          <button
            onClick={() => handleOpenDelete(item)}
            className="px-3 py-1 bg-red-400 text-white text-xs font-bold border-2 border-black rounded-md shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
          >
            <FiTrash2 className="w-3 h-3" />
            删除
          </button>
            </>
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
        searchPlaceholder="搜索课程名称或描述..."
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={() => {
          const levelValue = filters.find(
            (filter) => filter.id === 'level'
          )?.value;
          const statusValue = filters.find(
            (filter) => filter.id === 'status'
          )?.value;
          setLoading(true);
          setQuery((current) => ({
            keyword: searchTerm || undefined,
            level:
              levelValue !== '' && levelValue !== undefined
                ? Number(levelValue)
                : undefined,
            status:
              statusValue === 'deleted' ? 'deleted' : 'active',
            page: 1,
            size: current.size,
          }));
        }}
        actionSlot={
          <button
            onClick={handleOpenCreate}
            disabled={query.status === 'deleted'}
            className="px-6 py-2 rounded-sm bg-purple-500 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            + 新建课程
          </button>
        }
      />
      <div className="flex-1 min-h-0  flex flex-col">
        <DataTable<Course> columns={columns} data={courses} loading={loading} />
      </div>

      <Pagination
        currentPage={query.page}
        totalPages={Math.ceil(total / query.size) || 1}
        totalItems={total}
        pageSize={query.size}
        onPageChange={(newPage) => {
          setLoading(true);
          setQuery((current) => ({ ...current, page: newPage }));
        }}
        onPageSizeChange={(newSize) => {
          setLoading(true);
          setQuery((current) => ({ ...current, page: 1, size: newSize }));
        }}
      />

      {modalOpen && (
        <CourseModel
          key={editingCourse?.id ?? 'create'}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingCourse}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除课程"
        message={`确定删除「${deleteTarget?.title}」吗？删除后保留 30 天，可在回收站恢复。`}
        confirmText="确认"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
