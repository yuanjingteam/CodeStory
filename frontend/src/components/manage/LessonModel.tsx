'use client';
import { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { CreateLessonRequest, UpdateLessonRequest, MetadataValue, HintsValue } from '@/types/lesson-manage';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import { getExerciseTypeOptions } from '@/utils/exerciseType';
import { SearchableSelect } from '@/components/common';
import type { ChapterItem } from '@/types/chapter-manage';
import TiptapEditor from '@/components/tiptap/TiptapEditor';

interface ExerciseItem {
  id: string;
  type: string;
  exerciseContent: string;
  answer: string;
  metadata: MetadataValue;
  hints: HintsValue;
}

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

const generateExerciseId = () => `exercise_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createEmptyExercise = (): ExerciseItem => ({
  id: generateExerciseId(),
  type: '',
  exerciseContent: '',
  answer: '',
  metadata: null,
  hints: null,
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
  }>({
    chapterId: '',
    lessonName: '',
    content: '',
    difficulty: 0,
    sortOrder: 0,
    estimatedTime: 0,
    exercises: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const toggleExerciseExpand = (id: string) => {
    setExpandedExercises(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getExerciseTypeLabel = (type: string) => {
    switch (type) {
      case 'choice': return '选择题';
      case 'code': return '编程题';
      case 'fill': return '填空题';
      default: return '未设置';
    }
  };

  const getExerciseTypeIcon = (type: string) => {
    switch (type) {
      case 'choice': return '📝';
      case 'code': return '💻';
      case 'fill': return '✏️';
      default: return '❓';
    }
  };

  useEffect(() => {
    if (open && initialData?.id) {
      setFormData({
        chapterId: initialData.chapterId || '',
        lessonName: initialData.lessonName || '',
        content: initialData.content || '',
        difficulty: initialData.difficulty ?? 0,
        sortOrder: initialData.sortOrder ?? 0,
        estimatedTime: initialData.estimatedTime ?? 0,
        exercises: initialData.exercises && initialData.exercises.length > 0
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
    }
    if (!open) {
      setFormData({
        chapterId: '',
        lessonName: '',
        content: '',
        difficulty: 0,
        sortOrder: 0,
        estimatedTime: 0,
        exercises: [],
      });
    }
  }, [open, initialData]);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh] pb-4 px-4 overflow-y-auto" onClick={(e) => {
      if (window.getSelection()?.toString()) return
      onClose()
    }}>
      <div
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] w-full max-w-4xl my-4 flex flex-col"
        style={{ maxHeight: '85vh' }}
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

          <div className="border-2 border-purple-300 p-4 rounded-lg bg-purple-50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold">📝 题目列表 ({formData.exercises.length} 道)</label>
              <button
                type="button"
                onClick={() => {
                  const newExercise = createEmptyExercise();
                  setFormData(prev => ({
                    ...prev,
                    exercises: [...prev.exercises, newExercise],
                  }));
                  setExpandedExercises(prev => new Set(prev).add(newExercise.id));
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-sm font-bold border-2 border-black rounded hover:bg-purple-600 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                添加题目
              </button>
            </div>

            {formData.exercises.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">暂无题目，点击上方按钮添加</p>
            )}

            {formData.exercises.map((exercise, index) => {
              const isExpanded = expandedExercises.has(exercise.id);
              const typeIcon = getExerciseTypeIcon(exercise.type);
              const typeLabel = getExerciseTypeLabel(exercise.type);
              const title = exercise.exerciseContent || exercise.answer || '未填写';
              
              return (
                <div key={exercise.id} className="border-2 border-black rounded-lg bg-white mb-2 overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExerciseExpand(exercise.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-lg">{typeIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-purple-600 truncate">
                          题目 {index + 1}：{title.slice(0, 30)}{title.length > 30 ? '...' : ''}
                        </div>
                        <div className="text-xs text-gray-500">{typeLabel}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({
                            ...prev,
                            exercises: prev.exercises.filter(ex => ex.id !== exercise.id),
                          }));
                          setExpandedExercises(prev => {
                            const next = new Set(prev);
                            next.delete(exercise.id);
                            return next;
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-red-500 text-sm hover:bg-red-50 rounded transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <FiChevronUp className="w-5 h-5 text-gray-400" /> : <FiChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-bold mb-1">题型</label>
                        <select
                          value={exercise.type}
                          onChange={e => {
                            const newExercises = [...formData.exercises];
                            newExercises[index] = { ...newExercises[index], type: e.target.value };
                            setFormData(prev => ({ ...prev, exercises: newExercises }));
                          }}
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

                      {exercise.type && (
                        <div>
                          <label className="block text-sm font-bold mb-1">题目描述</label>
                          <textarea
                            value={exercise.exerciseContent}
                            onChange={e => {
                              const newExercises = [...formData.exercises];
                              newExercises[index] = { ...newExercises[index], exerciseContent: e.target.value };
                              setFormData(prev => ({ ...prev, exercises: newExercises }));
                            }}
                            placeholder="请输入题目描述，例如：以下哪个是 Python 中定义变量的正确方式？"
                            rows={2}
                            className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-bold mb-1">答案</label>
                        <textarea
                          value={exercise.answer}
                          onChange={e => {
                            const newExercises = [...formData.exercises];
                            newExercises[index] = { ...newExercises[index], answer: e.target.value };
                            setFormData(prev => ({ ...prev, exercises: newExercises }));
                          }}
                          placeholder="输入正确答案"
                          rows={2}
                          className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                        />
                      </div>

                      {exercise.type && (
                        <>
                          <div className="border-2 border-dashed border-blue-300 p-3 rounded-lg bg-blue-50">
                            <label className="block text-sm font-bold mb-2">题目配置</label>
                            <div className="mb-2 p-2 bg-white border border-gray-200 rounded text-xs">
                              <p className="font-semibold mb-1 text-gray-700">
                                {exercise.type === 'single_choice' ? '📝 选择题示例：' : '💻 编程题示例：'}
                              </p>
                              <pre className="text-gray-600 whitespace-pre-wrap break-all text-xs">
                                {exercise.type === 'single_choice'
                                  ? `{"template": "单选题模板", "options": ["选项A", "选项B", "选项C", "选项D"]}`
                                  : `{"codeTemplate": "# 在此编写代码\\ndef solve():\\n    pass"}`}
                              </pre>
                            </div>
                            <textarea
                              value={typeof exercise.metadata === 'object' ? JSON.stringify(exercise.metadata, null, 2) : (exercise.metadata || '')}
                              onChange={e => {
                                const value = e.target.value.trim();
                                const newExercises = [...formData.exercises];
                                if (!value) {
                                  newExercises[index] = { ...newExercises[index], metadata: null };
                                } else {
                                  try {
                                    newExercises[index] = { ...newExercises[index], metadata: JSON.parse(value) };
                                  } catch {
                                    newExercises[index] = { ...newExercises[index], metadata: value };
                                  }
                                }
                                setFormData(prev => ({ ...prev, exercises: newExercises }));
                              }}
                              placeholder="复制上方示例并修改..."
                              rows={4}
                              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none font-mono text-sm"
                            />
                            {typeof exercise.metadata === 'string' && exercise.metadata && (
                              <p className="mt-1 text-xs text-red-600">⚠️ JSON 格式错误</p>
                            )}
                          </div>

                          <div className="border-2 border-dashed border-yellow-300 p-3 rounded-lg bg-yellow-50">
                            <label className="block text-sm font-bold mb-2">提示配置</label>
                            <div className="mb-2 p-2 bg-white border border-gray-200 rounded text-xs">
                              <pre className="text-gray-600 whitespace-pre-wrap break-all text-xs">
{`{"level_1": "第一级提示", "level_2": "第二级提示"}`}
                              </pre>
                            </div>
                            <textarea
                              value={typeof exercise.hints === 'object' ? JSON.stringify(exercise.hints, null, 2) : (exercise.hints || '')}
                              onChange={e => {
                                const value = e.target.value.trim();
                                const newExercises = [...formData.exercises];
                                if (!value) {
                                  newExercises[index] = { ...newExercises[index], hints: null };
                                } else {
                                  try {
                                    newExercises[index] = { ...newExercises[index], hints: JSON.parse(value) };
                                  } catch {
                                    newExercises[index] = { ...newExercises[index], hints: value };
                                  }
                                }
                                setFormData(prev => ({ ...prev, exercises: newExercises }));
                              }}
                              placeholder="复制上方示例并修改..."
                              rows={4}
                              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none font-mono text-sm"
                            />
                            {typeof exercise.hints === 'string' && exercise.hints && (
                              <p className="mt-1 text-xs text-red-600">⚠️ JSON 格式错误</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
