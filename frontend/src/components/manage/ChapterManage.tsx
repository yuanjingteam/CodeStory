'use client';
import { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import { SearchFilter, DataTable, Pagination, ConfirmDialog } from '@/components/common';
import type { FilterField, Column } from '@/components/common';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import courseApi from '@/app/api/courses/courses';
import type { ChapterItem } from '@/types/chapter-manage';
import type { Course } from '@/types/course';
import ChapterModel from './ChapterModel';

export default function ChapterManage() {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterField[]>([
    {
      id: 'course',
      label: '课程',
      type: 'select',
      value: '',
      options: [
        { label: '全部课程', value: '' },
      ],
    },
  ]);
  const [deleteTarget, setDeleteTarget] = useState<ChapterItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterItem | undefined>();
  const hasMounted = useRef(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await courseApi.getList({
        page: 1,
        size: 100,
      });
      const courseOptions = (res.records || []).map((course: Course) => ({
        label: course.title,
        value: String(course.id),
      }));
      
      setFilters(prev => prev.map(filter => 
        filter.id === 'course' 
          ? { ...filter, options: [{ label: '全部课程', value: '' }, ...courseOptions] }
          : filter
      ));
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const courseIdValue = filters.find(f => f.id === 'course')?.value;
      const res = await chapterManageApi.getList({
        courseId: courseIdValue !== '' && courseIdValue !== undefined ? String(courseIdValue) : undefined,
        keyword: searchTerm || undefined,
        page,
        size,
      });
      setChapters(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('获取章节列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fetchChapters();
    }
  }, []);

  useEffect(() => {
    if (hasMounted.current) {
      fetchChapters();
    }
  }, [page, size]);

  const handleOpenCreate = () => {
    setEditingChapter(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ChapterItem) => {
    setEditingChapter(item);
    setModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (data.id) {
      await chapterManageApi.update(data.id, data);
      showToast.success('章节更新成功');
    } else {
      await chapterManageApi.create(data);
      showToast.success('章节创建成功');
    }
    fetchChapters();
  };

  const handleOpenDelete = (item: ChapterItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await chapterManageApi.delete(deleteTarget.id);
        showToast.success(`章节「${deleteTarget.chapterName}」已删除`);
        fetchChapters();
      } catch (error) {
        console.error('删除章节失败:', error);
      }
      setDeleteTarget(null);
    }
  };

  const columns: Column<ChapterItem>[] = [
    {
      id: 'courseId',
      key: 'courseId',
      header: '课程名',
      flex: 2,
      render: (_, item) => (
        <span className="font-bold text-gray-800">{item.courseName}</span>
      ),
    },
    {
      id: 'chapterName',
      key: 'chapterName',
      header: '章节名',
      flex: 3,
      render: (_, item) => (
        <span className="text-gray-700">{item.chapterName}</span>
      ),
    },
    {
      id: 'sectionCount',
      key: 'sectionCount',
      header: '小节数',
      flex: 1,
      align: 'center',
      render: (value) => (
        <span className="px-3 py-1 font-bold border-2 border-black bg-blue-300 inline-block">
          {String(value)} 节
        </span>
      ),
    },
    {
      id: 'createdAt',
      key: 'createdAt',
      header: '创建时间',
      flex: 1.5,
      align: 'center',
      render: (value) => (
        <span className="text-gray-600">{String(value)}</span>
      ),
    },
    {
      id: 'updateAt',
      key: 'updateAt',
      header: '更新时间',
      flex: 1.5,
      align: 'center',
      render: (value) => (
        <span className="text-gray-600">{String(value)}</span>
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
        searchPlaceholder="搜索章节名称..."
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={() => {
          setPage(1);
          fetchChapters();
        }}
        actionSlot={
          <button
            onClick={handleOpenCreate}
            className="px-6 py-2 rounded-sm bg-purple-500 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
          >
            + 新建章节
          </button>
        }
      />

      <DataTable<ChapterItem> columns={columns} data={chapters} loading={loading} maxHeight="700px" />

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

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除章节"
        message={`确定删除「${deleteTarget?.chapterName}」吗？删除后不可恢复。`}
        confirmText="确认"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ChapterModel
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingChapter}
      />
    </div>
  );
}
