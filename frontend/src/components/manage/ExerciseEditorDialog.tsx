'use client';

import { useMemo, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';
import Textarea from '@/components/ui/Textarea';
import type { LessonItem } from '@/types/lesson-manage';
import type {
  ExerciseManageWriteInput,
  ManagedExercise,
  ManagedExerciseMetadata,
  ManagedExerciseType,
} from '@/types/exercise-manage';

interface ExerciseEditorDialogProps {
  open: boolean;
  mode: 'create' | 'edit' | 'approve';
  lessons: LessonItem[];
  initialExercise?: ManagedExercise | null;
  onClose: () => void;
  onSubmit: (input: ExerciseManageWriteInput) => Promise<void>;
}

interface FormState {
  lessonId: string;
  type: ManagedExerciseType;
  difficulty: number;
  source: string;
  knowledge: string;
  content: string;
  answer: string;
  analysis: string;
  options: string[];
  language: string;
  codeTemplate: string;
  metadata: ManagedExerciseMetadata;
}

function createInitialState(
  exercise: ManagedExercise | null | undefined,
  lessons: LessonItem[]
): FormState {
  const metadata = exercise?.metadata || {};
  const options = Array.isArray(metadata.options)
    ? metadata.options
    : ['', '', '', ''];
  return {
    lessonId: exercise?.lessonId || lessons[0]?.uuid || '',
    type: exercise?.type || 'single_choice',
    difficulty: exercise?.difficulty ?? 1,
    source: exercise?.source || 'static',
    knowledge: exercise?.knowledge || '',
    content: exercise?.content || '',
    answer: exercise?.answer || '',
    analysis: exercise?.analysis || '',
    options: options.length >= 2 ? options : [...options, '', ''].slice(0, 2),
    language:
      typeof metadata.language === 'string' ? metadata.language : 'python',
    codeTemplate:
      typeof metadata.codeTemplate === 'string'
        ? metadata.codeTemplate
        : '',
    metadata,
  };
}

function validateForm(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.lessonId) errors.lessonId = '请选择所属小节';
  if (!form.knowledge.trim()) errors.knowledge = '请填写知识点';
  if (!form.content.trim()) errors.content = '请填写题目描述';
  if (!form.answer.trim()) errors.answer = '请填写答案';
  if (!form.analysis.trim()) errors.analysis = '请填写题目解析';
  if (!form.source.trim()) errors.source = '请填写来源';

  if (form.type === 'single_choice') {
    const options = form.options.map((option) => option.trim());
    if (options.length < 2 || options.some((option) => !option)) {
      errors.options = '至少填写两个非空选项';
    } else if (new Set(options).size !== options.length) {
      errors.options = '选项不能重复';
    } else if (!options.includes(form.answer.trim())) {
      errors.answer = '请选择一个选项作为正确答案';
    }
  }
  return errors;
}

export default function ExerciseEditorDialog({
  open,
  mode,
  lessons,
  initialExercise,
  onClose,
  onSubmit,
}: ExerciseEditorDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialState(initialExercise, lessons)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const title =
    mode === 'create'
      ? '手工录入题目'
      : mode === 'approve'
        ? '编辑后采用'
        : '编辑题目';
  const lessonOptions = useMemo(
    () =>
      lessons.map((lesson) => ({
        value: lesson.uuid || lesson.id,
        label: `${lesson.courseName} / ${lesson.chapterName} / ${lesson.lessonName}`,
      })),
    [lessons]
  );

  const updateOption = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      ),
      answer:
        current.answer === current.options[index]
          ? value
          : current.answer,
    }));
  };

  const removeOption = (index: number) => {
    setForm((current) => {
      const removed = current.options[index];
      return {
        ...current,
        options: current.options.filter((_, optionIndex) => optionIndex !== index),
        answer: current.answer === removed ? '' : current.answer,
      };
    });
  };

  const handleSubmit = async () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const metadata: ManagedExerciseMetadata =
      form.type === 'single_choice'
        ? {
            ...form.metadata,
            options: form.options.map((option) => option.trim()),
          }
        : {
            ...form.metadata,
            language: form.language.trim() || 'python',
            codeTemplate: form.codeTemplate,
            testCases: Array.isArray(form.metadata.testCases)
              ? form.metadata.testCases
              : [],
          };
    setSaving(true);
    try {
      await onSubmit({
        lessonId: form.lessonId,
        type: form.type,
        difficulty: form.difficulty,
        source: form.source.trim(),
        knowledge: form.knowledge.trim(),
        content: form.content.trim(),
        answer: form.answer.trim(),
        analysis: form.analysis.trim(),
        metadata,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) onClose();
      }}
      title={title}
      description="题型仅支持选择题和编程题。审核态与 AI 生成溯源不会因编辑丢失。"
      size="xl"
      closeDisabled={saving}
      closeOnOverlay={!saving}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button
            variant={mode === 'approve' ? 'success' : 'primary'}
            loading={saving}
            loadingText="保存中"
            onClick={handleSubmit}
          >
            {mode === 'approve' ? '保存并采用' : '保存题目'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <Field
          label="所属小节"
          htmlFor="exercise-lesson"
          required
          error={errors.lessonId}
        >
          <NativeSelect
            id="exercise-lesson"
            value={form.lessonId}
            invalid={Boolean(errors.lessonId)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                lessonId: event.target.value,
              }))
            }
          >
            <option value="">请选择小节</option>
            {lessonOptions.map((lesson) => (
              <option key={lesson.value} value={lesson.value}>
                {lesson.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="题型" htmlFor="exercise-type" required>
            <NativeSelect
              id="exercise-type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as ManagedExerciseType,
                  answer: '',
                }))
              }
            >
              <option value="single_choice">选择题</option>
              <option value="code">编程题</option>
            </NativeSelect>
          </Field>
          <Field label="难度" htmlFor="exercise-difficulty" required>
            <NativeSelect
              id="exercise-difficulty"
              value={form.difficulty}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  difficulty: Number(event.target.value),
                }))
              }
            >
              <option value={0}>简单</option>
              <option value={1}>中等</option>
              <option value={2}>困难</option>
            </NativeSelect>
          </Field>
          <Field
            label="来源"
            htmlFor="exercise-source"
            required
            error={errors.source}
            helperText={
              initialExercise?.source === 'ai'
                ? 'AI 生成题的来源不可伪装为手工内容。'
                : '例如：static、教材、课程组。'
            }
          >
            <Input
              id="exercise-source"
              value={form.source}
              maxLength={20}
              disabled={initialExercise?.source === 'ai'}
              invalid={Boolean(errors.source)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
            />
          </Field>
        </div>

        <Field
          label="知识点"
          htmlFor="exercise-knowledge"
          required
          error={errors.knowledge}
        >
          <Input
            id="exercise-knowledge"
            value={form.knowledge}
            invalid={Boolean(errors.knowledge)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                knowledge: event.target.value,
              }))
            }
          />
        </Field>

        <Field
          label="题目描述"
          htmlFor="exercise-content"
          required
          error={errors.content}
        >
          <Textarea
            id="exercise-content"
            rows={4}
            value={form.content}
            invalid={Boolean(errors.content)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
          />
        </Field>

        {form.type === 'single_choice' ? (
          <fieldset className="grid gap-3 border-2 border-zinc-950 bg-blue-50 p-4">
            <legend className="px-2 font-black">选择题选项</legend>
            {form.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct-option"
                  aria-label={`将选项 ${String.fromCharCode(65 + index)} 设为正确答案`}
                  checked={form.answer === option && Boolean(option)}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      answer: option,
                    }))
                  }
                  className="size-5 accent-green-600"
                />
                <span className="w-6 font-black">
                  {String.fromCharCode(65 + index)}
                </span>
                <Input
                  value={option}
                  aria-label={`选项 ${String.fromCharCode(65 + index)}`}
                  onChange={(event) => updateOption(index, event.target.value)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={form.options.length <= 2}
                  aria-label={`删除选项 ${String.fromCharCode(65 + index)}`}
                  onClick={() => removeOption(index)}
                >
                  <FiTrash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
            {errors.options ? (
              <p className="text-sm font-bold text-red-600">{errors.options}</p>
            ) : null}
            <Button
              size="sm"
              className="justify-self-start"
              disabled={form.options.length >= 6}
              leftIcon={<FiPlus aria-hidden="true" />}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  options: [...current.options, ''],
                }))
              }
            >
              添加选项
            </Button>
          </fieldset>
        ) : (
          <div className="grid gap-4 border-2 border-zinc-950 bg-orange-50 p-4">
            <Field label="语言" htmlFor="exercise-language" required>
              <Input
                id="exercise-language"
                value={form.language}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    language: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="代码模板" htmlFor="exercise-template">
              <Textarea
                id="exercise-template"
                rows={6}
                className="font-mono text-sm"
                value={form.codeTemplate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    codeTemplate: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        )}

        <Field
          label="正确答案"
          htmlFor="exercise-answer"
          required
          error={errors.answer}
          helperText={
            form.type === 'single_choice'
              ? '通过上方单选按钮指定正确答案。'
              : '编程题填写可读的参考实现。'
          }
        >
          <Textarea
            id="exercise-answer"
            rows={form.type === 'code' ? 8 : 2}
            className={form.type === 'code' ? 'font-mono text-sm' : ''}
            value={form.answer}
            readOnly={form.type === 'single_choice'}
            invalid={Boolean(errors.answer)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                answer: event.target.value,
              }))
            }
          />
        </Field>

        <Field
          label="题目解析"
          htmlFor="exercise-analysis"
          required
          error={errors.analysis}
        >
          <Textarea
            id="exercise-analysis"
            rows={5}
            value={form.analysis}
            invalid={Boolean(errors.analysis)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                analysis: event.target.value,
              }))
            }
          />
        </Field>
      </div>
    </Dialog>
  );
}
