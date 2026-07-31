'use client';
import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import { showKnowledgeIndexResult } from '@/utils/knowledgeIndex';
import { SearchFilter, DataTable, Pagination, ConfirmDialog } from '@/components/common';
import type { FilterField, Column } from '@/components/common';
import lessonManageApi from '@/app/api/manage/lesson-manage';
import courseApi from '@/app/api/courses/courses';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import type {
  CreateLessonRequest,
  LessonItem,
  UpdateLessonRequest,
} from '@/types/lesson-manage';
import type {
  KnowledgeIndexStatus,
  KnowledgeIndexSummary,
} from '@/types/knowledge-index';
import type { Course } from '@/types/course';
import type { ChapterItem } from '@/types/chapter-manage';
import LessonModel from '@/components/manage/LessonModel';

interface LessonQuery {
  courseId?: string;
  chapterId?: string;
  keyword?: string;
  difficulty?: number;
  status: 'active' | 'deleted';
  page: number;
  size: number;
}

const INDEX_STATUS_CONFIG: Record<
  KnowledgeIndexStatus,
  { label: string; className: string }
> = {
  ready: { label: '已同步', className: 'bg-green-300' },
  pending: { label: '待同步', className: 'bg-blue-300' },
  partial: { label: '部分失败', className: 'bg-yellow-300' },
  failed: { label: '同步失败', className: 'bg-red-300' },
  needs_content: { label: '内容不足', className: 'bg-orange-300' },
  needs_review: { label: '待内容审核', className: 'bg-yellow-200' },
  excluded: { label: '已排除', className: 'bg-zinc-300' },
  not_indexed: { label: '未索引', className: 'bg-gray-300' },
};

function IndexStatusBadge({
  summary,
}: {
  summary: KnowledgeIndexSummary;
}) {
  const config = INDEX_STATUS_CONFIG[summary.status];
  const detail = [
    `共 ${summary.totalSources} 个来源`,
    `成功 ${summary.readySources}`,
    `待同步 ${summary.pendingSources}`,
    `失败 ${summary.failedSources}`,
    `内容不足 ${summary.needsContentSources}`,
    `待审核 ${summary.needsReviewSources}`,
    `已排除 ${summary.excludedSources}`,
    `未索引 ${summary.notIndexedSources}`,
  ].join('，');

  return (
    <span
      className={`inline-flex items-center gap-2 border-2 border-black px-2.5 py-1 text-xs font-black ${config.className}`}
      title={detail}
      aria-label={`${config.label}，${detail}`}
    >
      <span
        className={`h-2.5 w-2.5 border border-black bg-white ${
          summary.status === 'pending' ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

export default function LessonManage() {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<LessonQuery>({
    status: 'active',
    page: 1,
    size: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterField[]>([
    {
      id: 'status',
      label: '数据状态',
      type: 'select',
      value: 'active',
      options: [
        { label: '有效内容', value: 'active' },
        { label: '回收站', value: 'deleted' },
      ],
    },
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
  const [reindexingLessonId, setReindexingLessonId] = useState<
    string | null
  >(null);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchIndexing, setBatchIndexing] = useState(false);
  const [restoringLessonId, setRestoringLessonId] = useState<
    string | null
  >(null);

  const refreshLessons = async () => {
    setLoading(true);
    try {
      const res = await lessonManageApi.getList(query);
      setLessons(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      courseApi.getList({ page: 1, size: 100 }),
      chapterManageApi.getList({ page: 1, size: 100 }),
    ])
      .then(([courseResponse, chapterResponse]) => {
        if (cancelled) return;
        const courseOptions = (courseResponse.records || []).map(
          (course: Course) => ({
            label: course.title,
            value: String(course.id),
          })
        );
        const chapterOptions = (chapterResponse.data || []).map(
          (chapter: ChapterItem) => ({
            label: chapter.chapterName,
            value: String(chapter.id),
          })
        );

        setFilters((current) =>
          current.map((filter) => {
            if (filter.id === 'course') {
              return {
                ...filter,
                options: [
                  { label: '全部课程', value: '' },
                  ...courseOptions,
                ],
              };
            }
            if (filter.id === 'chapter') {
              return {
                ...filter,
                options: [
                  { label: '全部章节', value: '' },
                  ...chapterOptions,
                ],
              };
            }
            return filter;
          })
        );
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('获取课程或章节列表失败:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    lessonManageApi
      .getList(query)
      .then((res) => {
        if (cancelled) return;
        setLessons(res.data);
        setTotal(res.total);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('获取小节列表失败:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleOpenCreate = () => {
    setEditingLesson(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: LessonItem) => {
    setEditingLesson(item);
    setModalOpen(true);
  };

  const handleSubmit = async (
    data: (CreateLessonRequest | UpdateLessonRequest) & { id?: string }
  ) => {
    try {
      if (data.id) {
        const response = await lessonManageApi.update(
          data.id,
          data as UpdateLessonRequest
        );
        showKnowledgeIndexResult(
          '小节更新成功',
          response.indexSummary
        );
      } else {
        const response = await lessonManageApi.create(
          data as CreateLessonRequest
        );
        showKnowledgeIndexResult(
          '小节创建成功',
          response.indexSummary
        );
      }
      await refreshLessons();
    } catch (error: unknown) {
      console.error('保存小节失败:', error);
      const message = error instanceof Error ? error.message : '保存小节失败，请重试';
      showToast.error(message);
      throw error;
    }
  };

  const handleReindexLesson = async (item: LessonItem) => {
    setReindexingLessonId(item.id);
    try {
      const response = await lessonManageApi.reindex(item.id);
      showKnowledgeIndexResult(
        `小节「${item.lessonName}」索引完成`,
        response.indexSummary
      );
      await refreshLessons();
    } catch (error) {
      console.error('重新索引小节失败:', error);
      showToast.error('重新索引失败，请稍后重试');
    } finally {
      setReindexingLessonId(null);
    }
  };

  const handleReindexBatch = async () => {
    setBatchConfirmOpen(false);
    setBatchIndexing(true);
    try {
      const response = await lessonManageApi.reindexBatch({
        courseId: query.courseId,
        chapterId: query.chapterId,
        keyword: query.keyword,
        difficulty: query.difficulty,
      });
      showKnowledgeIndexResult(
        `已处理 ${response.lessonCount} 个小节、${response.sourceCount} 个知识来源`,
        response.indexSummary
      );
      await refreshLessons();
    } catch (error) {
      console.error('批量重新索引失败:', error);
      showToast.error('批量重新索引失败，请稍后重试');
    } finally {
      setBatchIndexing(false);
    }
  };

  const handleRestoreLesson = async (item: LessonItem) => {
    setRestoringLessonId(item.id);
    try {
      await lessonManageApi.restore(item.id);
      showToast.success(`小节「${item.lessonName}」已恢复`);
      await refreshLessons();
    } catch (error) {
      console.error('恢复小节失败:', error);
      showToast.error('恢复失败，请确认所属课程和章节已恢复');
    } finally {
      setRestoringLessonId(null);
    }
  };

  const handleRestoreExercise = async (
    lesson: LessonItem,
    exerciseId: string
  ) => {
    try {
      await lessonManageApi.restoreExercise(lesson.id, exerciseId);
      showToast.success('题目已恢复');
      setModalOpen(false);
      setEditingLesson(undefined);
      await refreshLessons();
    } catch (error) {
      console.error('恢复题目失败:', error);
      showToast.error('恢复题目失败，请稍后重试');
      throw error;
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
        await refreshLessons();
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
      id: 'exerciseCount',
      key: 'exerciseCount',
      header: '题目数',
      flex: 1.5,
      align: 'center',
      render: (_, item) => (
        <span className="px-3 py-1 font-bold border-2 border-black rounded-md bg-purple-300 inline-block">
          {item.exerciseCount || 0} 道
        </span>
      ),
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
      id: 'indexStatus',
      header: 'AI 索引',
      flex: 1.8,
      align: 'center',
      render: (_, item) => (
        <IndexStatusBadge summary={item.indexSummary} />
      ),
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
      flex: 4,
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          {query.status === 'deleted' ? (
            <button
              onClick={() => handleRestoreLesson(item)}
              disabled={restoringLessonId === item.id}
              className="border-2 border-black bg-green-300 px-3 py-1 text-xs font-bold text-zinc-950 shadow-[2px_2px_0_0_rgba(24,24,27,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {restoringLessonId === item.id ? '恢复中' : '恢复'}
            </button>
          ) : (
            <>
          <button
            onClick={() => handleReindexLesson(item)}
            disabled={
              reindexingLessonId === item.id ||
              item.indexStatus === 'needs_content' ||
              item.indexStatus === 'needs_review' ||
              item.indexStatus === 'excluded'
            }
            aria-label={`重新索引小节 ${item.lessonName}`}
            className="flex items-center gap-1 border-2 border-black bg-yellow-300 px-3 py-1 text-xs font-bold text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 disabled:shadow-none"
          >
            <span
              className={`h-2.5 w-2.5 border border-black bg-white ${
                reindexingLessonId === item.id
                  ? 'animate-pulse'
                  : ''
              }`}
              aria-hidden="true"
            />
            {reindexingLessonId === item.id
              ? '同步中'
              : '重新索引'}
          </button>
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
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col gap-4">
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="搜索小节名称..."
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={() => {
          const courseIdValue = filters.find(
            (filter) => filter.id === 'course'
          )?.value;
          const chapterIdValue = filters.find(
            (filter) => filter.id === 'chapter'
          )?.value;
          const difficultyValue = filters.find(
            (filter) => filter.id === 'difficulty'
          )?.value;
          const statusValue = filters.find(
            (filter) => filter.id === 'status'
          )?.value;
          setLoading(true);
          setQuery((current) => ({
            courseId:
              courseIdValue !== '' && courseIdValue !== undefined
                ? String(courseIdValue)
                : undefined,
            chapterId:
              chapterIdValue !== '' && chapterIdValue !== undefined
                ? String(chapterIdValue)
                : undefined,
            keyword: searchTerm || undefined,
            difficulty:
              difficultyValue !== '' && difficultyValue !== undefined
                ? Number(difficultyValue)
                : undefined,
            status:
              statusValue === 'deleted' ? 'deleted' : 'active',
            page: 1,
            size: current.size,
          }));
        }}
        actionSlot={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={() => setBatchConfirmOpen(true)}
              disabled={
                batchIndexing ||
                query.status === 'deleted' ||
                (!query.courseId && !query.chapterId)
              }
              title={
                query.courseId || query.chapterId
                  ? '重新索引当前课程或章节筛选范围'
                  : '请先应用课程或章节筛选'
              }
              className="border-2 border-black bg-yellow-300 px-4 py-2 font-bold text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none"
            >
              {batchIndexing ? '正在同步知识库' : '同步当前筛选'}
            </button>
            <button
              onClick={handleOpenCreate}
              disabled={query.status === 'deleted'}
              className="rounded-sm border-2 border-black bg-purple-500 px-6 py-2 font-bold text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none active:scale-[0.98]"
            >
              + 新建小节
            </button>
          </div>
        }
      />

      <DataTable<LessonItem>
        columns={columns}
        data={lessons}
        loading={loading}
      />

      <Pagination
        currentPage={query.page}
        totalPages={Math.ceil(total / query.size) || 1}
        totalItems={total}
        pageSize={query.size}
        onPageChange={(newPage) => {
          setLoading(true);
          setQuery((current) => ({ ...current, page: newPage }));
        }}
        onPageSizeChange={(newSize) => {
          setLoading(true);
          setQuery((current) => ({ ...current, page: 1, size: newSize }));
        }}
      />

      <ConfirmDialog
        open={batchConfirmOpen}
        title="同步当前筛选"
        message={`将重新索引当前筛选范围内的 ${total} 个小节，并调用 Embedding 服务。是否继续？`}
        confirmText="开始同步"
        cancelText="取消"
        variant="warning"
        onConfirm={handleReindexBatch}
        onCancel={() => setBatchConfirmOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除小节"
        message={`确定删除「${deleteTarget?.lessonName}」吗？删除后保留 30 天，可在回收站恢复。`}
        confirmText="确认"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {modalOpen && (
        <LessonModel
          key={editingLesson?.id ?? 'create'}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          onRestoreExercise={(exerciseId) =>
            editingLesson
              ? handleRestoreExercise(editingLesson, exerciseId)
              : Promise.resolve()
          }
          initialData={editingLesson}
        />
      )}
    </div>
  );
}
