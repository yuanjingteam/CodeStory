'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { FiAlertTriangle, FiCpu, FiLayers } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';
import type { LessonItem } from '@/types/lesson-manage';
import type {
  ExerciseGenerationInput,
  ExerciseGenerationResult,
  ManagedExerciseType,
} from '@/types/exercise-manage';

interface ExerciseGenerationDialogProps {
  open: boolean;
  lessons: LessonItem[];
  onClose: () => void;
  onGenerate: (
    input: ExerciseGenerationInput
  ) => Promise<ExerciseGenerationResult>;
  onOpenQueue: () => void;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : 'AI 出题失败，请稍后重试。';
}

export default function ExerciseGenerationDialog({
  open,
  lessons,
  onClose,
  onGenerate,
  onOpenQueue,
}: ExerciseGenerationDialogProps) {
  const [form, setForm] = useState<ExerciseGenerationInput>({
    lessonId: lessons[0]?.uuid || '',
    knowledge: '',
    type: 'single_choice',
    difficulty: 1,
    count: 1,
  });
  const [result, setResult] = useState<ExerciseGenerationResult | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!form.lessonId || !form.knowledge.trim()) {
      setError('请选择小节并填写知识点。');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const response = await onGenerate({
        ...form,
        knowledge: form.knowledge.trim(),
      });
      setResult(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !generating) onClose();
      }}
      title="AI 生成题目草稿"
      description="生成会先检索当前小节证据并完成结构、答案、难度和重复初筛；结果只进入待审队列，不会直接发布。"
      size="xl"
      closeDisabled={generating}
      closeOnOverlay={!generating}
      footer={
        result ? (
          <>
            <Button onClick={onClose}>稍后处理</Button>
            <Button variant="primary" onClick={onOpenQueue}>
              前往待审队列
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={generating}>
              取消
            </Button>
            <Button
              variant="primary"
              loading={generating}
              loadingText="正在检索并生成"
              leftIcon={<FiCpu aria-hidden="true" />}
              onClick={handleGenerate}
            >
              生成草稿
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="grid gap-5">
          <div
            className="border-2 border-zinc-950 bg-green-200 p-4 font-bold"
            role="status"
          >
            已完整保存 {result.drafts.length} 道草稿；模型调用{' '}
            {result.metrics.modelCallCount} 次
            {result.metrics.repaired ? '，结构经过一次修复' : '，首次结构化成功'}。
          </div>
          <div className="grid gap-4">
            {result.drafts.map((draft, index) => {
              const duplicate = draft.genMetadata?.duplicateCheck;
              return (
                <article
                  key={draft.id}
                  className="border-2 border-zinc-950 bg-white p-4 shadow-[3px_3px_0_0_#18181b]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black">候选 {index + 1}</h3>
                    <div className="flex flex-wrap gap-2 text-xs font-black">
                      <span className="border-2 border-zinc-950 bg-yellow-300 px-2 py-1">
                        草稿
                      </span>
                      <span className="border-2 border-zinc-950 bg-blue-200 px-2 py-1">
                        {draft.type === 'single_choice' ? '选择题' : '编程题'}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap font-bold text-zinc-900">
                    {draft.content}
                  </p>
                  <div className="mt-3 grid gap-2 border-t-2 border-zinc-200 pt-3 text-sm">
                    <p>
                      <span className="font-black">答案：</span>
                      <span className="whitespace-pre-wrap">{draft.answer}</span>
                    </p>
                    <p>
                      <span className="font-black">解析：</span>
                      {draft.analysis}
                    </p>
                  </div>
                  {duplicate?.matched ? (
                    <div className="mt-3 flex gap-2 border-2 border-red-700 bg-red-100 p-3 text-sm font-bold text-red-900">
                      <FiAlertTriangle className="mt-0.5 shrink-0" aria-hidden="true" />
                      机器初筛疑似重复（相似度{' '}
                      {Math.round((duplicate.similarity || 0) * 100)}%），请人工确认后再采用。
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-sm font-bold text-green-800">
                      <FiLayers aria-hidden="true" /> 未命中 0.92 重复初筛阈值
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          <Field label="所属小节" htmlFor="generation-lesson" required>
            <NativeSelect
              id="generation-lesson"
              value={form.lessonId}
              disabled={generating}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lessonId: event.target.value,
                }))
              }
            >
              <option value="">请选择小节</option>
              {lessons.map((lesson) => (
                <option key={lesson.uuid || lesson.id} value={lesson.uuid || lesson.id}>
                  {lesson.courseName} / {lesson.chapterName} / {lesson.lessonName}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="知识点"
            htmlFor="generation-knowledge"
            required
            helperText="聚焦一个可验证的知识点，例如：SQL WHERE 条件组合。"
          >
            <Input
              id="generation-knowledge"
              maxLength={300}
              value={form.knowledge}
              disabled={generating}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  knowledge: event.target.value,
                }))
              }
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="题型" htmlFor="generation-type" required>
              <NativeSelect
                id="generation-type"
                value={form.type}
                disabled={generating}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as ManagedExerciseType,
                  }))
                }
              >
                <option value="single_choice">选择题</option>
                <option value="code">编程题</option>
              </NativeSelect>
            </Field>
            <Field label="难度" htmlFor="generation-difficulty" required>
              <NativeSelect
                id="generation-difficulty"
                value={form.difficulty}
                disabled={generating}
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
            <Field label="数量" htmlFor="generation-count" required>
              <NativeSelect
                id="generation-count"
                value={form.count}
                disabled={generating}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    count: Number(event.target.value),
                  }))
                }
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count} 道
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {error ? (
            <div
              className="border-2 border-red-700 bg-red-100 p-3 font-bold text-red-900"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
