'use client';
import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import type { CreateChapterRequest, UpdateChapterRequest } from '@/types/chapter-manage';
import courseApi from '@/app/api/courses/courses';
import type { Course } from '@/types/course';

interface ChapterModelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: (CreateChapterRequest | UpdateChapterRequest) & { id?: string }) => Promise<void>;
  initialData?: {
    id: string;
    courseId: string;
    chapterName: string;
    sortOrder: number;
  };
}

export default function ChapterModel({ open, onClose, onSubmit, initialData }: ChapterModelProps) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState<{
    courseId: string;
    chapterName: string;
    sortOrder: number;
  }>({
    courseId: '',
    chapterName: '',
    sortOrder: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (open && initialData && isEdit) {
      setFormData({
        courseId: initialData.courseId || '',
        chapterName: initialData.chapterName || '',
        sortOrder: initialData.sortOrder ?? 0,
      });
    }
    if (!open) {
      setFormData({
        courseId: '',
        chapterName: '',
        sortOrder: 0,
      });
    }
  }, [open, initialData, isEdit]);

  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await courseApi.getList({
        page: 1,
        size: 100,
      });
      setCourses(res.records || []);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  if (!open) return null;

  const handleSubmit = async () => {
    if (!formData.courseId) {
      alert('请选择课程');
      return;
    }
    if (!formData.chapterName.trim()) {
      alert('请输入章节名称');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(isEdit ? { ...formData, id: initialData!.id } : formData);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] w-full max-w-lg mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <h2 className="text-xl font-bold">{isEdit ? '编辑章节' : '新建章节'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-gray-100 font-bold"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-bold mb-1">所属课程 *</label>
            <select
              value={formData.courseId}
              onChange={e => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
              disabled={isEdit}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{loadingCourses ? '加载中...' : '请选择课程'}</option>
              {courses.map(course => (
                <option key={course.id} value={String(course.id)}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">章节名称 *</label>
            <input
              type="text"
              value={formData.chapterName}
              onChange={e => setFormData(prev => ({ ...prev, chapterName: e.target.value }))}
              placeholder="请输入章节名称，例如：第一章：变量与数据类型"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">排序值（可选）</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={e => setFormData(prev => ({
                ...prev,
                sortOrder: Number(e.target.value) || 0,
              }))}
              placeholder="数字越小越靠前，默认自动计算"
              min={0}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

        </div>

        <div className="flex gap-3 p-4 border-t-2 border-black justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2 border-2 border-black font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-purple-500 text-white font-bold border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                提交中...
              </>
            ) : isEdit ? (
              '保存修改'
            ) : (
              '确认创建'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
