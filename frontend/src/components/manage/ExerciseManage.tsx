'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  FiCheck,
  FiClock,
  FiCpu,
  FiEdit,
  FiEye,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Pagination from '@/components/common/Pagination';
import ExerciseEditorDialog from './ExerciseEditorDialog';
import ExerciseGenerationDialog from './ExerciseGenerationDialog';
import ExerciseTraceDialog from './ExerciseTraceDialog';
import exerciseManageApi from '@/app/api/manage/exercise-manage';
import lessonManageApi from '@/app/api/manage/lesson-manage';
import courseApi from '@/app/api/courses/courses';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import { showToast } from '@/utils/toast';
import type { Course } from '@/types/course';
import type { ChapterItem } from '@/types/chapter-manage';
import type { LessonItem } from '@/types/lesson-manage';
import type {
  ExerciseManageListQuery,
  ExerciseManageWriteInput,
  ExerciseReviewStatus,
  ManagedExercise,
  ManagedExerciseType,
} from '@/types/exercise-manage';

interface FilterState {
  courseId: string;
  chapterId: string;
  lessonId: string;
  type: '' | ManagedExerciseType;
  difficulty: '' | '0' | '1' | '2';
  source: string;
  reviewStatus: '' | ExerciseReviewStatus;
  keyword: string;
}

interface EditorState {
  mode: 'create' | 'edit' | 'approve';
  exercise: ManagedExercise | null;
}

const EMPTY_FILTERS: FilterState = {
  courseId: '',
  chapterId: '',
  lessonId: '',
  type: '',
  difficulty: '',
  source: '',
  reviewStatus: '',
  keyword: '',
};

const STATUS_CONFIG: Record<
  ExerciseReviewStatus,
  { label: string; className: string }
> = {
  draft: { label: '待审核', className: 'bg-yellow-300' },
  approved: { label: '已采用', className: 'bg-green-300' },
  rejected: { label: '已拒绝', className: 'bg-red-300' },
};

const DIFFICULTY_LABELS = ['简单', '中等', '困难'];

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} 分钟`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} 小时`;
  return `${Math.floor(seconds / 86_400)} 天`;
}

function StatusBadge({ status }: { status: ExerciseReviewStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex border-2 border-zinc-950 px-2 py-1 text-xs font-black ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function uniqueById<T>(items: T[], getId: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [getId(item), item])).values()];
}

export default function ExerciseManage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [exercises, setExercises] = useState<ManagedExercise[]>([]);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [query, setQuery] = useState<ExerciseManageListQuery>({
    page: 1,
    size: 10,
  });
  const [queueMode, setQueueMode] = useState(false);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [oldestWait, setOldestWait] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [generationOpen, setGenerationOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [traceExercise, setTraceExercise] = useState<ManagedExercise | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ManagedExercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedExercise | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const listRequestId = useRef(0);

  const loadExercises = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    setLoadError('');
    try {
      const response = await exerciseManageApi.getList({
        ...query,
        queue: queueMode,
      });
      if (requestId !== listRequestId.current) return;
      setExercises(response.data);
      setTotal(response.total);
      setPendingCount(response.pendingCount);
      setOldestWait(
        response.oldestPendingCreatedAt
          ? Math.max(
              0,
              Math.floor(
                (new Date().getTime() -
                  new Date(response.oldestPendingCreatedAt).getTime()) /
                  1_000
              )
            )
          : 0
      );
    } catch (error) {
      if (requestId !== listRequestId.current) return;
      setLoadError(getErrorMessage(error));
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }, [query, queueMode]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      courseApi.getList({ page: 1, size: 100 }),
      chapterManageApi.getList({ page: 1, size: 100 }),
      lessonManageApi.getList({ page: 1, size: 100, status: 'active' }),
    ])
      .then(async ([courseResponse, chapterResponse, lessonResponse]) => {
        const coursePages = Math.ceil(courseResponse.total / 100);
        const chapterPages = Math.ceil(chapterResponse.total / 100);
        const lessonPages = Math.ceil(lessonResponse.total / 100);
        const [moreCourses, moreChapters, moreLessons] = await Promise.all([
          Promise.all(
            Array.from({ length: Math.max(0, coursePages - 1) }, (_, index) =>
              courseApi.getList({ page: index + 2, size: 100 })
            )
          ),
          Promise.all(
            Array.from({ length: Math.max(0, chapterPages - 1) }, (_, index) =>
              chapterManageApi.getList({ page: index + 2, size: 100 })
            )
          ),
          Promise.all(
            Array.from({ length: Math.max(0, lessonPages - 1) }, (_, index) =>
              lessonManageApi.getList({ page: index + 2, size: 100, status: 'active' })
            )
          ),
        ]);
        if (cancelled) return;
        setCourses(
          uniqueById(
            [courseResponse, ...moreCourses].flatMap((response) => response.records || []),
            (course) => course.uuid || String(course.id)
          )
        );
        setChapters(
          uniqueById(
            [chapterResponse, ...moreChapters].flatMap((response) => response.data || []),
            (chapter) => chapter.uuid || chapter.id
          )
        );
        setLessons(
          uniqueById(
            [lessonResponse, ...moreLessons].flatMap((response) => response.data || []),
            (lesson) => lesson.uuid || lesson.id
          )
        );
      })
      .catch((error) => {
        if (!cancelled) setOptionsError(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExercises();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      listRequestId.current += 1;
    };
  }, [loadExercises]);

  const filteredChapters = useMemo(
    () =>
      filters.courseId
        ? chapters.filter(
            (chapter) => (chapter.courseUuid || chapter.courseId) === filters.courseId
          )
        : chapters,
    [chapters, filters.courseId]
  );
  const filteredLessons = useMemo(
    () =>
      lessons.filter(
        (lesson) =>
          (!filters.courseId || (lesson.courseUuid || lesson.courseId) === filters.courseId) &&
          (!filters.chapterId || (lesson.chapterUuid || lesson.chapterId) === filters.chapterId)
      ),
    [lessons, filters.chapterId, filters.courseId]
  );
  const applyFilters = () => {
    setLoading(true);
    setQuery((current) => ({
      courseId: filters.courseId || undefined,
      chapterId: filters.chapterId || undefined,
      lessonId: filters.lessonId || undefined,
      type: filters.type || undefined,
      difficulty:
        filters.difficulty === '' ? undefined : Number(filters.difficulty),
      source: filters.source.trim() || undefined,
      reviewStatus: queueMode ? undefined : filters.reviewStatus || undefined,
      keyword: filters.keyword.trim() || undefined,
      page: 1,
      size: current.size || 10,
    }));
  };

  const openQueue = () => {
    setLoading(true);
    setQueueMode(true);
    setGenerationOpen(false);
    setQuery((current) => ({
      ...current,
      reviewStatus: undefined,
      page: 1,
    }));
  };

  const handleDirectApprove = async (exercise: ManagedExercise) => {
    setActionId(exercise.id);
    try {
      await exerciseManageApi.review(exercise.id, 'approve');
      showToast.success('题目已采用并进入学习端可见范围');
      await loadExercises();
    } catch (error) {
      showToast.error(getErrorMessage(error));
      await loadExercises();
    } finally {
      setActionId(null);
    }
  };

  const handleEditorSubmit = async (input: ExerciseManageWriteInput) => {
    if (!editor) return;
    try {
      if (editor.mode === 'create') {
        await exerciseManageApi.create(input);
        showToast.success('手工题已创建并发布');
      } else if (editor.mode === 'approve' && editor.exercise) {
        await exerciseManageApi.review(
          editor.exercise.id,
          'approve',
          input
        );
        showToast.success('题目已编辑并采用');
      } else if (editor.exercise) {
        await exerciseManageApi.update(editor.exercise.id, input);
        showToast.success('题目已更新');
      }
      setEditor(null);
      await loadExercises();
    } catch (error) {
      showToast.error(getErrorMessage(error));
      throw error;
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    setActionId(target.id);
    try {
      await exerciseManageApi.review(target.id, 'reject');
      showToast.success('题目已拒绝，学习端保持不可见');
      await loadExercises();
    } catch (error) {
      showToast.error(getErrorMessage(error));
      await loadExercises();
    } finally {
      setActionId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setActionId(target.id);
    try {
      await exerciseManageApi.delete(target.id);
      showToast.success('题目已软删除');
      await loadExercises();
    } catch (error) {
      showToast.error(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-8rem)] gap-5 pb-6">
      <header className="flex flex-col gap-4 border-b-4 border-zinc-950 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-sm font-black uppercase tracking-[0.18em] text-purple-700">
            Exercise Operations
          </p>
          <h1 className="mt-1 text-3xl font-black text-zinc-950">题目管理</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            AI 内容先审后发；手工题创建后直接发布。所有学习端入口只读取已采用题目。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            leftIcon={<FiPlus aria-hidden="true" />}
            disabled={lessons.length === 0}
            onClick={() => setEditor({ mode: 'create', exercise: null })}
          >
            手工录入
          </Button>
          <Button
            variant="primary"
            leftIcon={<FiCpu aria-hidden="true" />}
            disabled={lessons.length === 0}
            onClick={() => setGenerationOpen(true)}
          >
            AI 生成草稿
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="审核概览">
        <div className="border-2 border-zinc-950 bg-yellow-300 p-4 shadow-[3px_3px_0_0_#18181b]">
          <p className="text-xs font-black uppercase tracking-wider">待审队列</p>
          <p className="mt-2 text-3xl font-black">{pendingCount}</p>
        </div>
        <div className="border-2 border-zinc-950 bg-white p-4 shadow-[3px_3px_0_0_#18181b]">
          <p className="text-xs font-black uppercase tracking-wider">当前结果</p>
          <p className="mt-2 text-3xl font-black">{total}</p>
        </div>
        <div className="border-2 border-zinc-950 bg-purple-200 p-4 shadow-[3px_3px_0_0_#18181b]">
          <p className="text-xs font-black uppercase tracking-wider">最久等待</p>
          <p className="mt-2 text-3xl font-black">
            {oldestWait ? formatWait(oldestWait) : '—'}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="题目视图">
        <Button
          role="tab"
          aria-selected={!queueMode}
          variant={!queueMode ? 'primary' : 'secondary'}
          onClick={() => {
            setLoading(true);
            setQueueMode(false);
            setQuery((current) => ({ ...current, page: 1 }));
          }}
        >
          全部题目
        </Button>
        <Button
          role="tab"
          aria-selected={queueMode}
          variant={queueMode ? 'primary' : 'secondary'}
          leftIcon={<FiClock aria-hidden="true" />}
          onClick={openQueue}
        >
          待审队列 ({pendingCount})
        </Button>
      </div>

      <section className="grid gap-4 border-2 border-zinc-400 bg-zinc-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm font-bold">
            课程
            <NativeSelect
              value={filters.courseId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  courseId: event.target.value,
                  chapterId: '',
                  lessonId: '',
                }))
              }
            >
              <option value="">全部课程</option>
              {courses.map((course) => (
                <option key={course.uuid || course.id} value={course.uuid || course.id}>
                  {course.title}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            章节
            <NativeSelect
              value={filters.chapterId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  chapterId: event.target.value,
                  lessonId: '',
                }))
              }
            >
              <option value="">全部章节</option>
              {filteredChapters.map((chapter) => (
                <option key={chapter.uuid || chapter.id} value={chapter.uuid || chapter.id}>
                  {chapter.chapterName}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            小节
            <NativeSelect
              value={filters.lessonId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  lessonId: event.target.value,
                }))
              }
            >
              <option value="">全部小节</option>
              {filteredLessons.map((lesson) => (
                <option key={lesson.uuid || lesson.id} value={lesson.uuid || lesson.id}>
                  {lesson.lessonName}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            题型
            <NativeSelect
              value={filters.type}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  type: event.target.value as FilterState['type'],
                }))
              }
            >
              <option value="">全部题型</option>
              <option value="single_choice">选择题</option>
              <option value="code">编程题</option>
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            难度
            <NativeSelect
              value={filters.difficulty}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  difficulty: event.target.value as FilterState['difficulty'],
                }))
              }
            >
              <option value="">全部难度</option>
              <option value="0">简单</option>
              <option value="1">中等</option>
              <option value="2">困难</option>
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            来源
            <Input
              value={filters.source}
              placeholder="例如 ai / static"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            审核状态
            <NativeSelect
              value={queueMode ? 'draft' : filters.reviewStatus}
              disabled={queueMode}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  reviewStatus: event.target.value as FilterState['reviewStatus'],
                }))
              }
            >
              <option value="">全部状态</option>
              <option value="draft">待审核</option>
              <option value="approved">已采用</option>
              <option value="rejected">已拒绝</option>
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            关键词
            <Input
              value={filters.keyword}
              placeholder="题干 / 知识点 / 解析"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyFilters();
              }}
            />
          </label>
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setLoading(true);
              setFilters(EMPTY_FILTERS);
              setQuery({ page: 1, size: query.size || 10 });
            }}
          >
            清空筛选
          </Button>
          <Button variant="primary" onClick={applyFilters}>
            应用筛选
          </Button>
        </div>
      </section>

      {optionsError ? (
        <div className="border-2 border-orange-700 bg-orange-100 p-3 font-bold text-orange-900" role="alert">
          层级筛选加载失败：{optionsError}。题目列表仍可继续使用。
        </div>
      ) : null}

      <section className="min-h-80 border-2 border-zinc-950 bg-white" aria-busy={loading}>
        <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_0.8fr_0.9fr_0.8fr_minmax(15rem,1.4fr)] gap-3 border-b-4 border-zinc-950 bg-zinc-200 px-4 py-3 text-sm font-black md:grid">
          <span>题目</span>
          <span>所属范围</span>
          <span>题型 / 难度</span>
          <span>来源 / 状态</span>
          <span>等待</span>
          <span className="text-right">操作</span>
        </div>

        {loading ? (
          <div className="grid gap-0" role="status" aria-label="正在加载题目">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="grid gap-3 border-b-2 border-zinc-200 p-4 md:grid-cols-4">
                <div className="h-5 animate-pulse bg-zinc-200 motion-reduce:animate-none md:col-span-2" />
                <div className="h-5 animate-pulse bg-zinc-100 motion-reduce:animate-none" />
                <div className="h-5 animate-pulse bg-zinc-100 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="grid place-items-center gap-4 p-12 text-center" role="alert">
            <p className="font-bold text-red-700">{loadError}</p>
            <Button leftIcon={<FiRefreshCw aria-hidden="true" />} onClick={loadExercises}>
              重新加载
            </Button>
          </div>
        ) : exercises.length === 0 ? (
          <div className="grid place-items-center gap-3 p-12 text-center">
            <FiFileText className="size-14 text-zinc-300" aria-hidden="true" />
            <p className="text-lg font-black">
              {queueMode ? '当前没有待审核题目' : '没有符合条件的题目'}
            </p>
            <p className="text-sm text-zinc-600">
              {queueMode
                ? 'AI 新草稿会自动出现在这里。'
                : '调整筛选条件，或手工录入一道新题。'}
            </p>
          </div>
        ) : (
          <div>
            {exercises.map((exercise) => (
              <article
                key={exercise.id}
                className="grid gap-3 border-b-2 border-zinc-300 p-4 last:border-b-0 hover:bg-yellow-50 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_0.8fr_0.9fr_0.8fr_minmax(15rem,1.4fr)] md:items-center"
              >
                <div className="min-w-0">
                  <p className="line-clamp-2 font-bold text-zinc-950">{exercise.content}</p>
                  <p className="mt-1 truncate text-xs text-zinc-600">知识点：{exercise.knowledge}</p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-bold">{exercise.courseName}</p>
                  <p className="truncate text-zinc-600">{exercise.chapterName} / {exercise.lessonName}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <span className="border-2 border-zinc-950 bg-blue-200 px-2 py-1">
                    {exercise.type === 'single_choice' ? '选择题' : '编程题'}
                  </span>
                  <span className="border-2 border-zinc-950 bg-white px-2 py-1">
                    {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <span className="border-2 border-zinc-950 bg-purple-100 px-2 py-1">{exercise.source}</span>
                  <StatusBadge status={exercise.reviewStatus} />
                </div>
                <div className="text-sm font-bold text-zinc-700">
                  {exercise.reviewStatus === 'draft' ? formatWait(exercise.waitSeconds) : '—'}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {exercise.reviewStatus === 'draft' ? (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        loading={actionId === exercise.id}
                        leftIcon={<FiCheck aria-hidden="true" />}
                        onClick={() => handleDirectApprove(exercise)}
                      >
                        采用
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<FiEdit aria-hidden="true" />}
                        disabled={actionId === exercise.id}
                        onClick={() => setEditor({ mode: 'approve', exercise })}
                      >
                        编辑后采用
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<FiX aria-hidden="true" />}
                        disabled={actionId === exercise.id}
                        onClick={() => setRejectTarget(exercise)}
                      >
                        拒绝
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      leftIcon={<FiEdit aria-hidden="true" />}
                      disabled={actionId === exercise.id}
                      onClick={() => setEditor({ mode: 'edit', exercise })}
                    >
                      编辑
                    </Button>
                  )}
                  {exercise.genMetadata ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="查看 AI 生成溯源"
                      onClick={() => setTraceExercise(exercise)}
                    >
                      <FiEye aria-hidden="true" />
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="删除题目"
                    disabled={actionId === exercise.id}
                    onClick={() => setDeleteTarget(exercise)}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Pagination
        currentPage={query.page || 1}
        totalPages={Math.ceil(total / (query.size || 10)) || 1}
        totalItems={total}
        pageSize={query.size || 10}
        compactOnMobile
        onPageChange={(page) => {
          setLoading(true);
          setQuery((current) => ({ ...current, page }));
        }}
        onPageSizeChange={(size) => {
          setLoading(true);
          setQuery((current) => ({ ...current, page: 1, size }));
        }}
      />

      {generationOpen ? (
        <ExerciseGenerationDialog
          open={generationOpen}
          lessons={lessons}
          onClose={() => setGenerationOpen(false)}
          onGenerate={async (input) => {
            const result = await exerciseManageApi.generate(input);
            await loadExercises();
            return result;
          }}
          onOpenQueue={openQueue}
        />
      ) : null}

      {editor ? (
        <ExerciseEditorDialog
          key={`${editor.mode}-${editor.exercise?.id || 'new'}`}
          open
          mode={editor.mode}
          lessons={lessons}
          initialExercise={editor.exercise}
          onClose={() => setEditor(null)}
          onSubmit={handleEditorSubmit}
        />
      ) : null}

      <ExerciseTraceDialog
        exercise={traceExercise}
        onClose={() => setTraceExercise(null)}
      />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="拒绝题目"
        message="拒绝后该题仍保留审计记录，但不会出现在学习端。重复请求不会覆盖已生效结论。"
        confirmText="确认拒绝"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmReject}
        onCancel={() => setRejectTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除题目"
        message="该操作会软删除题目并立即从学习端和知识索引中失效。"
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
