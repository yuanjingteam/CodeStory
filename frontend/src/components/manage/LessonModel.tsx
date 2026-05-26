'use client';
import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import type { CreateLessonRequest, UpdateLessonRequest, MetadataValue, HintsValue } from '@/types/lesson-manage';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import { getExerciseTypeOptions } from '@/utils/exerciseType';
import { SearchableSelect } from '@/components/common';
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
    answer?: string;
    metadata?: MetadataValue;
    hints?: HintsValue;
    estimatedTime?: number;
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
    answer: string;
    metadata: MetadataValue;
    hints: HintsValue;
    estimatedTime: number;
  }>({
    chapterId: '',
    lessonName: '',
    content: '',
    type: '',
    difficulty: 0,
    sortOrder: 0,
    answer: '',
    metadata: null,
    hints: null,
    estimatedTime: 0,
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
        answer: initialData.answer || '',
        metadata: initialData.metadata || null,
        hints: initialData.hints || null,
        estimatedTime: initialData.estimatedTime ?? 0,
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
        answer: '',
        metadata: null,
        hints: null,
        estimatedTime: 0,
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
      const submitData = { ...formData };
      delete (submitData as Record<string, unknown>).sortOrder;
      
      await onSubmit(isEdit ? { ...submitData, id: initialData!.id } : submitData);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh] pb-4 px-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] w-full max-w-lg my-4 flex flex-col"
        style={{ maxHeight: '80vh' }}
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
            <textarea
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="输入小节的详细内容（支持Markdown格式）..."
              rows={3}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-bold mb-1">答案</label>
            <textarea
              value={formData.answer}
              onChange={e => setFormData(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="输入正确答案（选择题填正确选项内容，编程题填参考代码）"
              rows={2}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {formData.type && (
          <>
            <div className="border-2 border-dashed border-blue-300 p-4 rounded-lg bg-blue-50">
              <label className="block text-sm font-bold mb-2">题目配置</label>
              
              <div className="mb-3 p-3 bg-white border border-gray-200 rounded text-xs">
                <p className="font-semibold mb-2 text-gray-700">
                  {formData.type === 'single_choice' ? '📝 选择题示例格式：' : '💻 编程题示例格式：'}
                </p>
                <pre className="text-gray-600 whitespace-pre-wrap break-all">
                  {formData.type === 'single_choice' 
                    ? `{
  "template": "单选题模板",
  "options": ["<link>", "<a>", "<href>", "<url>"]
}`
                    : `{
  "codeTemplate": "# 在此编写代码\\ndef solve():\\n    pass"
}`
                   }</pre>
              </div>

              <textarea
                value={typeof formData.metadata === 'object' ? JSON.stringify(formData.metadata, null, 2) : (formData.metadata || '')}
                onChange={e => {
                  const value = e.target.value.trim();
                  if (!value) {
                    setFormData(prev => ({ ...prev, metadata: null }));
                    return;
                  }
                  try {
                    const parsed = JSON.parse(value);
                    setFormData(prev => ({ ...prev, metadata: parsed }));
                  } catch {
                    setFormData(prev => ({ ...prev, metadata: value }));
                  }
                }}
                placeholder={`复制上方示例并修改内容...`}
                rows={6}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none font-mono text-sm"
              />
              
              {typeof formData.metadata === 'string' && formData.metadata && (
                <p className="mt-2 text-xs text-red-600">⚠️ JSON 格式错误，请检查</p>
              )}
            </div>

            <div className="border-2 border-dashed border-yellow-300 p-4 rounded-lg bg-yellow-50">
              <label className="block text-sm font-bold mb-2">配置提示</label>
              
              <div className="mb-3 p-3 bg-white border border-gray-200 rounded text-xs">
                <p className="font-semibold mb-2 text-gray-700">
                  💡 提示配置示例格式：
                </p>
                <pre className="text-gray-600 whitespace-pre-wrap break-all">
{`{
  "level_1": "第一级提示内容",
  "level_2": "第二级提示内容",
  "level_3": "第三级提示内容",
  "_meta": {
    "max_level": 3,
    "score_deduction": [10, 20, 30]
  }
}`}
                </pre>
              </div>

              <textarea
                value={typeof formData.hints === 'object' ? JSON.stringify(formData.hints, null, 2) : (formData.hints || '')}
                onChange={e => {
                  const value = e.target.value.trim();
                  if (!value) {
                    setFormData(prev => ({ ...prev, hints: null }));
                    return;
                  }
                  try {
                    const parsed = JSON.parse(value);
                    setFormData(prev => ({ ...prev, hints: parsed }));
                  } catch {
                    setFormData(prev => ({ ...prev, hints: value }));
                  }
                }}
                placeholder="复制上方示例并修改内容..."
                rows={6}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none font-mono text-sm"
              />
              
              {typeof formData.hints === 'string' && formData.hints && (
                <p className="mt-2 text-xs text-red-600">⚠️ JSON 格式错误，请检查</p>
              )}
            </div>
          </>
          )}
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
