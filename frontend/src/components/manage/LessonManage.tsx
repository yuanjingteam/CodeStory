'use client';
import { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import { getExerciseTypeLabel, getExerciseTypeColor } from '@/utils/exerciseType';
import { SearchFilter, DataTable, Pagination, ConfirmDialog } from '@/components/common';
import type { FilterField, Column } from '@/components/common';
import lessonManageApi from '@/app/api/manage/lesson-manage';
import courseApi from '@/app/api/courses/courses';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import type { LessonItem } from '@/types/lesson-manage';
import type { Course } from '@/types/course';
import type { ChapterItem } from '@/types/chapter-manage';
import LessonModel from '@/components/manage/LessonModel';

export default function LessonManage() {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
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
    {
      id: 'chapter',
      label: '章节',
      type: 'select',
      value: '',
      options: [
        { label: '全部章节', value: '' },
      ],
    },
    {
      id: 'difficulty',
      label: '难度',
      type: 'select',
      value: '',
      options: [
        { label: '全部难度', value: '' },
        { label: '简单', value: '0' },
        { label: '中等', value: '1' },
        { label: '困难', value: '2' },
      ],
    },
  ]);
  const [deleteTarget, setDeleteTarget] = useState<LessonItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonItem | undefined>();
  const hasMounted = useRef(false);

  useEffect(() => {
    fetchCourses();
    fetchChapters();
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fetchLessons();
    }
  }, []);

  useEffect(() => {
    if (hasMounted.current) {
      fetchLessons();
    }
  }, [page, size]);

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
    try {
      const res = await chapterManageApi.getList({
        page: 1,
        size: 100,
      });
      const chapterOptions = (res.data || []).map((chapter: ChapterItem) => ({
        label: chapter.chapterName,
        value: String(chapter.id),
      }));
      
      setFilters(prev => prev.map(filter => 
        filter.id === 'chapter' 
          ? { ...filter, options: [{ label: '全部章节', value: '' }, ...chapterOptions] }
          : filter
      ));
    } catch (error) {
      console.error('获取章节列表失败:', error);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const courseIdValue = filters.find(f => f.id === 'course')?.value;
      const chapterIdValue = filters.find(f => f.id === 'chapter')?.value;
      const difficultyValue = filters.find(f => f.id === 'difficulty')?.value;
      
      const res = await lessonManageApi.getList({
        courseId: courseIdValue !== '' && courseIdValue !== undefined ? String(courseIdValue) : undefined,
        chapterId: chapterIdValue !== '' && chapterIdValue !== undefined ? String(chapterIdValue) : undefined,
        keyword: searchTerm || undefined,
        difficulty: difficultyValue !== '' && difficultyValue !== undefined ? Number(difficultyValue) : undefined,
        page,
        size,
      });
      setLessons(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('获取小节列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingLesson(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: LessonItem) => {
    setEditingLesson(item);
    setModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (data.id) {
        await lessonManageApi.update(data.id, data);
        showToast.success('小节更新成功');
      } else {
        await lessonManageApi.create(data);
        showToast.success('小节创建成功');
      }
      fetchLessons();
    } catch (error: any) {
      console.error('保存小节失败:', error);
      showToast.error(error?.message || '保存失败，请重试');
    }
  };

  const handleOpenDelete = (item: LessonItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await lessonManageApi.delete(deleteTarget.id);
        showToast.success(`小节「${deleteTarget.lessonName}」已删除`);
        fetchLessons();
      } catch (error) {
        console.error('删除小节失败:', error);
      }
      setDeleteTarget(null);
    }
  };

  const columns: Column<LessonItem>[] = [
    {
      id: 'courseName',
      key: 'courseName',
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
      flex: 2,
      render: (_, item) => (
        <span className="text-gray-700">{item.chapterName}</span>
      ),
    },
    {
      id: 'lessonName',
      key: 'lessonName',
      header: '小节名',
      flex: 2.5,
      render: (_, item) => (
        <span className="text-gray-700">{item.lessonName}</span>
      ),
    },
    {
      id: 'type',
      key: 'type',
      header: '题型',
      flex: 1.5,
      align: 'center',
      render: (value) => {
        const label = getExerciseTypeLabel(String(value));
        const color = getExerciseTypeColor(String(value));
        return (
          <span className={`px-3 py-1 font-bold border-2 border-black rounded-md ${color} inline-block`}>
            {label}
          </span>
        );
      },
    },
    {
      id: 'difficulty',
      key: 'difficulty',
      header: '难度',
      flex: 1.5,
      align: 'center',
      render: (value) => {
        const levelMap: Record<number, string> = { 0: '简单', 1: '中等', 2: '困难' };
        const colorMap: Record<number, string> = { 0: 'bg-green-300', 1: 'bg-yellow-300', 2: 'bg-red-300' };
        return (
          <span className={`px-3 py-1 font-bold border-2 border-black rounded-md ${colorMap[value as number] || 'bg-gray-300'} inline-block`}>
            {levelMap[value as number] || `${value}`}
          </span>
        );
      },
    },
    {
      id: 'createdAt',
      key: 'createdAt',
      header: '创建时间',
      flex: 1.5,
      align: 'left',
      render: (_, item) => (
        <span className="text-gray-600">{String(item.createdAt || '-')}</span>
      ),
    },
    {
      id: 'updateAt',
      key: 'updateAt',
      header: '更新时间',
      flex: 1.5,
      align: 'left',
      render: (_, item) => (
        <span className="text-gray-600">{String(item.updateAt || '-')}</span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      flex: 2.5,
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center gap-2">
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
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="搜索小节名称..."
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={() => {
          setPage(1);
          fetchLessons();
        }}
        actionSlot={
          <button
            onClick={handleOpenCreate}
            className="px-6 py-2 rounded-sm bg-purple-500 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
          >
            + 新建小节
          </button>
        }
      />

      <DataTable<LessonItem> columns={columns} data={lessons} loading={loading} maxHeight="700px" />

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
        title="删除小节"
        message={`确定删除「${deleteTarget?.lessonName}」吗？删除后不可恢复。`}
        confirmText="确认"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <LessonModel
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingLesson}
      />
    </div>
  );
}
