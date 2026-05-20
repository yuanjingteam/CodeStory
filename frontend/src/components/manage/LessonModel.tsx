'use client';
import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import type { CreateLessonRequest, UpdateLessonRequest } from '@/types/lesson-manage';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import { getExerciseTypeOptions } from '@/utils/exerciseType';
import type { ChapterItem } from '@/types/chapter-manage';

interface LessonModelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: (CreateLessonRequest | UpdateLessonRequest) & { id?: string }) => Promise<void>;
  initialData?: {
    id: string;
    chapterId: string;
    lessonName: string;
    content?: string;
    type?: string;
    difficulty: number;
    sortOrder: number;
  };
}

export default function LessonModel({ open, onClose, onSubmit, initialData }: LessonModelProps) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState<{
    chapterId: string;
    lessonName: string;
    content: string;
    type: string;
    difficulty: number;
    sortOrder: number;
  }>({
    chapterId: '',
    lessonName: '',
    content: '',
    type: '',
    difficulty: 0,
    sortOrder: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  useEffect(() => {
    if (open && initialData && isEdit) {
      setFormData({
        chapterId: initialData.chapterId || '',
        lessonName: initialData.lessonName || '',
        content: initialData.content || '',
        type: initialData.type || '',
        difficulty: initialData.difficulty ?? 0,
        sortOrder: initialData.sortOrder ?? 0,
      });
    }
    if (!open) {
      setFormData({
        chapterId: '',
        lessonName: '',
        content: '',
        type: '',
        difficulty: 0,
        sortOrder: 0,
      });
    }
  }, [open, initialData, isEdit]);

  useEffect(() => {
    if (open) {
      fetchChapters();
    }
  }, [open]);

  const fetchChapters = async () => {
    setLoadingChapters(true);
    try {
      const res = await chapterManageApi.getList({
        page: 1,
        size: 100,
      });
      setChapters(res.data || []);
    } catch (error) {
      console.error('获取章节列表失败:', error);
    } finally {
      setLoadingChapters(false);
    }
  };

  if (!open) return null;

  const handleSubmit = async () => {
    if (!formData.chapterId) {
      alert('请选择章节');
      return;
    }
    if (!formData.lessonName.trim()) {
      alert('请输入小节名称');
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
          <h2 className="text-xl font-bold">{isEdit ? '编辑小节' : '新建小节'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-gray-100 font-bold"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-bold mb-1">所属章节 *</label>
            <select
              value={formData.chapterId}
              onChange={e => setFormData(prev => ({ ...prev, chapterId: e.target.value }))}
              disabled={isEdit}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{loadingChapters ? '加载中...' : '请选择章节'}</option>
              {chapters.map(chapter => (
                <option key={chapter.id} value={String(chapter.id)}>
                  {chapter.courseName} - {chapter.chapterName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">小节名称 *</label>
            <input
              type="text"
              value={formData.lessonName}
              onChange={e => setFormData(prev => ({ ...prev, lessonName: e.target.value }))}
              placeholder="请输入小节名称，例如：1.1 变量的声明与赋值"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">小节内容</label>
            <textarea
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="输入小节的详细内容（支持HTML格式）..."
              rows={5}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">题型</label>
            <select
              value={formData.type}
              onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">请选择题型</option>
              {getExerciseTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">难度</label>
            <select
              value={formData.difficulty}
              onChange={e => setFormData(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value={0}>简单</option>
              <option value={1}>中等</option>
              <option value={2}>困难</option>
            </select>
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
