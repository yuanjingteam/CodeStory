'use client';
import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import type { CreateLessonRequest, UpdateLessonRequest } from '@/types/lesson-manage';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import { SearchableSelect } from '@/components/common';
import type { ChapterItem } from '@/types/chapter-manage';
import TiptapEditor from '@/components/tiptap/TiptapEditor';
import type { ExerciseItem } from '@/utils/exerciseHelpers';
import { generateExerciseId } from '@/utils/exerciseHelpers';
import ExerciseList from './ExerciseList';

interface LessonModelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: (CreateLessonRequest | UpdateLessonRequest) & { id?: string }) => Promise<void>;
  initialData?: {
    id: string;
    chapterId: string;
    lessonName: string;
    content?: string;
    difficulty: number;
    sortOrder: number;
    estimatedTime?: number;
    exercises?: ExerciseItem[];
  };
}

const getInitialFormData = (initialData?: LessonModelProps['initialData']) => ({
  chapterId: initialData?.chapterId || '',
  lessonName: initialData?.lessonName || '',
  content: initialData?.content || '',
  difficulty: initialData?.difficulty ?? 0,
  sortOrder: initialData?.sortOrder ?? 0,
  estimatedTime: initialData?.estimatedTime ?? 0,
  exercises: initialData?.exercises && initialData.exercises.length > 0
    ? initialData.exercises.map(ex => ({
        id: ex.id || generateExerciseId(),
        type: ex.type || '',
        exerciseContent: ex.exerciseContent || '',
        answer: ex.answer || '',
        metadata: ex.metadata || null,
        hints: ex.hints || null,
      }))
    : [],
});

export default function LessonModel({ open, onClose, onSubmit, initialData }: LessonModelProps) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState<{
    chapterId: string;
    lessonName: string;
    content: string;
    difficulty: number;
    sortOrder: number;
    estimatedTime: number;
    exercises: ExerciseItem[];
  }>(() => getInitialFormData(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

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

 useEffect(() => {
  if (open) {
    const loadData = async () => {
      try {
        await fetchChapters();
      } catch (err) {
        console.error("加载章节失败：", err);
      }
    };

    loadData();
  }
}, [open]);

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
      const submitData = { ...formData };
      delete (submitData as Record<string, unknown>).sortOrder;
      
      await onSubmit(isEdit ? { ...submitData, id: initialData!.id } : submitData);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => {
      if (window.getSelection()?.toString()) return
      onClose()
    }}>
      <div
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] w-full max-w-4xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b-2 border-black flex-shrink-0">
          <h2 className="text-xl font-bold">{isEdit ? '编辑小节' : '新建小节'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-gray-100 font-bold"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-bold mb-1">所属章节 *</label>
            <SearchableSelect
              options={chapters.map(chapter => ({
                label: `${chapter.courseName} - ${chapter.chapterName}`,
                value: String(chapter.id),
              }))}
              value={formData.chapterId}
              onChange={val => setFormData(prev => ({ ...prev, chapterId: val }))}
              placeholder="请选择章节"
              searchPlaceholder="搜索章节..."
              disabled={isEdit}
              loading={loadingChapters}
              emptyText="无匹配章节"
            />
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
            <TiptapEditor
              content={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              exercises={formData.exercises.map((ex, index) => ({
                id: ex.id,
                title: ex.exerciseContent || `练习 ${index + 1}`,
                type: ex.type,
              }))}
            />
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

          <div>
            <label className="block text-sm font-bold mb-1">预估时长（分钟）</label>
            <input
              type="number"
              min={0}
              value={formData.estimatedTime || ''}
              onChange={e => setFormData(prev => ({ ...prev, estimatedTime: Number(e.target.value) || 0 }))}
              placeholder="请输入预估学习时长，例如：15"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <ExerciseList
            exercises={formData.exercises}
            onChange={exercises => setFormData(prev => ({ ...prev, exercises }))}
          />
        </div>

        <div className="flex gap-3 p-4 border-t-2 border-black justify-end flex-shrink-0">
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
