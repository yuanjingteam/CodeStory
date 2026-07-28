'use client';
import { useState, useEffect, useRef } from 'react';
import type { CreateLessonRequest, UpdateLessonRequest } from '@/types/lesson-manage';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import { SearchableSelect } from '@/components/common';
import type { ChapterItem } from '@/types/chapter-manage';
import TiptapEditor from '@/components/tiptap/TiptapEditor';
import type { ExerciseItem } from '@/utils/exerciseHelpers';
import { generateExerciseId } from '@/utils/exerciseHelpers';
import { validateExercise } from '@/utils/exerciseValidation';
import { clearLessonDraft, loadLessonDraft, saveLessonDraft } from '@/utils/lessonDraft';
import ExerciseList from './ExerciseList';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';

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

const normalizeExercise = (exercise: Partial<ExerciseItem>): ExerciseItem => ({
  id: exercise.id || generateExerciseId(),
  type: exercise.type || '',
  exerciseContent: exercise.exerciseContent || '',
  answer: exercise.answer || '',
  knowledge: exercise.knowledge || '',
  analysis: exercise.analysis || '',
  source: exercise.source || 'static',
  metadata: exercise.metadata || null,
  hints: exercise.hints || null,
});

const getInitialFormData = (initialData?: LessonModelProps['initialData']) => ({
  chapterId: initialData?.chapterId || '',
  lessonName: initialData?.lessonName || '',
  content: initialData?.content || '',
  difficulty: initialData?.difficulty ?? 0,
  sortOrder: initialData?.sortOrder ?? 0,
  estimatedTime: initialData?.estimatedTime ?? 0,
  exercises: initialData?.exercises && initialData.exercises.length > 0
    ? initialData.exercises.map(normalizeExercise)
    : [],
});

type LessonFormData = ReturnType<typeof getInitialFormData>;

const normalizeDraftFormData = (draft: Partial<LessonFormData>): LessonFormData => ({
  chapterId: draft.chapterId || '',
  lessonName: draft.lessonName || '',
  content: draft.content || '',
  difficulty: draft.difficulty ?? 0,
  sortOrder: draft.sortOrder ?? 0,
  estimatedTime: draft.estimatedTime ?? 0,
  exercises: Array.isArray(draft.exercises)
    ? draft.exercises.map(normalizeExercise)
    : [],
});

export default function LessonModel({ open, onClose, onSubmit, initialData }: LessonModelProps) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState<LessonFormData>(() => getInitialFormData(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [draftReady, setDraftReady] = useState(isEdit);
  const [initialSnapshot] = useState(() => JSON.stringify(getInitialFormData(initialData)));
  const submittedRef = useRef(false);

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

  useEffect(() => {
    if (!open || isEdit) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      const draft = loadLessonDraft<LessonFormData>();
      if (draft) {
        const savedAt = new Date(draft.savedAt).toLocaleString('zh-CN');
        const shouldRestore = window.confirm(`检测到 ${savedAt} 保存的未提交小节草稿，是否恢复？`);

        if (shouldRestore) {
          setFormData(normalizeDraftFormData(draft.data));
        } else {
          clearLessonDraft();
        }
      }
      setDraftReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isEdit, open]);

  const isDirty = JSON.stringify(formData) !== initialSnapshot;

  useEffect(() => {
    if (!open || isEdit || !draftReady || submittedRef.current) return;

    const timer = window.setTimeout(() => {
      if (isDirty) {
        saveLessonDraft(formData);
      } else {
        clearLessonDraft();
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draftReady, formData, isDirty, isEdit, open]);

  if (!open) return null;

  const requestClose = ({ discard = false, skipConfirm = false } = {}) => {
    if (submittedRef.current || !isDirty) {
      onClose();
      return;
    }

    if (!isEdit) {
      if (discard) {
        const shouldDiscard = window.confirm('确定放弃当前草稿吗？已填写的小节内容和题目将无法恢复。');
        if (!shouldDiscard) return;
        clearLessonDraft();
        onClose();
        return;
      }

      saveLessonDraft(formData);
      if (skipConfirm || window.confirm('当前小节尚未创建，关闭后草稿会保留，下次新建小节时可以恢复。是否关闭？')) {
        onClose();
      }
      return;
    }

    if (skipConfirm || window.confirm('当前修改尚未保存，确定关闭吗？')) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!formData.chapterId) {
      alert('请选择章节');
      return;
    }
    if (!formData.lessonName.trim()) {
      alert('请输入小节名称');
      return;
    }

    for (let index = 0; index < formData.exercises.length; index += 1) {
      const errors = validateExercise(formData.exercises[index]);
      if (errors.length > 0) {
        alert(`题目 ${index + 1} 尚未完成配置：\n${errors.join('\n')}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const submitData = { ...formData };
      delete (submitData as Record<string, unknown>).sortOrder;
      
      await onSubmit(isEdit ? { ...submitData, id: initialData!.id } : submitData);
      submittedRef.current = true;
      if (!isEdit) {
        clearLessonDraft();
      }
      onClose();
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) {
          requestClose();
        }
      }}
      title={isEdit ? '编辑小节' : '新建小节'}
      size="xl"
      closeDisabled={submitting}
      bodyClassName="space-y-4"
      footer={
        <>
          {!isEdit && isDirty ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => requestClose({ discard: true })}
              disabled={submitting}
              className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              放弃草稿
            </Button>
          ) : null}
          <Button
            onClick={() => requestClose({ skipConfirm: !isEdit })}
            disabled={submitting}
          >
            {isEdit ? '取消' : '暂存并关闭'}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            loadingText="提交中..."
          >
            {isEdit ? '保存修改' : '确认创建'}
          </Button>
        </>
      }
    >
          <Field label="所属章节" required>
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
              ariaLabel="所属章节"
            />
          </Field>

          <Field label="小节名称" htmlFor="lesson-name" required>
            <Input
              id="lesson-name"
              type="text"
              value={formData.lessonName}
              onChange={e => setFormData(prev => ({ ...prev, lessonName: e.target.value }))}
              placeholder="请输入小节名称，例如：1.1 变量的声明与赋值"
            />
          </Field>

          <Field label="小节内容">
            <TiptapEditor
              content={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              exercises={formData.exercises.map((ex, index) => ({
                id: ex.id,
                title: ex.exerciseContent || `练习 ${index + 1}`,
                type: ex.type,
              }))}
            />
          </Field>

          <Field label="难度" htmlFor="lesson-difficulty">
            <NativeSelect
              id="lesson-difficulty"
              value={formData.difficulty}
              onChange={e => setFormData(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
            >
              <option value={0}>简单</option>
              <option value={1}>中等</option>
              <option value={2}>困难</option>
            </NativeSelect>
          </Field>

          <Field label="预估时长（分钟）" htmlFor="lesson-duration">
            <Input
              id="lesson-duration"
              type="number"
              min={0}
              value={formData.estimatedTime || ''}
              onChange={e => setFormData(prev => ({ ...prev, estimatedTime: Number(e.target.value) || 0 }))}
              placeholder="请输入预估学习时长，例如：15"
            />
          </Field>

          <ExerciseList
            exercises={formData.exercises}
            onChange={exercises => setFormData(prev => ({ ...prev, exercises }))}
          />
    </Dialog>
  );
}
