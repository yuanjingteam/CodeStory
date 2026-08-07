'use client';
import { useState, useEffect } from 'react';
import { FiEdit, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import { showKnowledgeIndexResult } from '@/utils/knowledgeIndex';
import {
  SearchFilter,
  DataTable,
  Pagination,
  ConfirmDialog,
} from '@/components/common';
import type { FilterField, Column } from '@/components/common';
import chapterManageApi from '@/app/api/manage/chapter-manage';
import courseApi from '@/app/api/courses/courses';
import type {
  ChapterItem,
  CreateChapterRequest,
  UpdateChapterRequest,
} from '@/types/chapter-manage';
import type { Course } from '@/types/course';
import ChapterModel from './ChapterModel';

interface ChapterQuery {
  courseId?: string;
  keyword?: string;
  status: 'active' | 'deleted';
  page: number;
  size: number;
}

export default function ChapterManage() {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<ChapterQuery>({
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
      options: [{ label: '全部课程', value: '' }],
    },
  ]);
  const [deleteTarget, setDeleteTarget] = useState<ChapterItem | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<
    ChapterItem | undefined
  >();

  useEffect(() => {
    let cancelled = false;

    courseApi
      .getList({ page: 1, size: 100 })
      .then((res) => {
        if (cancelled) return;
        const courseOptions = (res.records || []).map((course: Course) => ({
          label: course.title,
          value: String(course.id),
        }));

        setFilters((prev) =>
          prev.map((filter) =>
            filter.id === 'course'
              ? {
                  ...filter,
                  options: [
                    { label: '全部课程', value: '' },
                    ...courseOptions,
                  ],
                }
              : filter
          )
        );
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('获取课程列表失败:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshChapters = async () => {
    setLoading(true);
    try {
      const res = await chapterManageApi.getList(query);
      setChapters(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('获取章节列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    chapterManageApi
      .getList(query)
      .then((res) => {
        if (cancelled) return;
        setChapters(res.data);
        setTotal(res.total);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('获取章节列表失败:', error);
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
    setEditingChapter(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ChapterItem) => {
    setEditingChapter(item);
    setModalOpen(true);
  };

  const handleSubmit = async (
    data: (CreateChapterRequest | UpdateChapterRequest) & { id?: string }
  ) => {
    if (data.id) {
      const response = await chapterManageApi.update(
        data.id,
        data as UpdateChapterRequest
      );
      showKnowledgeIndexResult(
        '章节更新成功',
        response.indexSummary
      );
    } else {
      await chapterManageApi.create(data as CreateChapterRequest);
      showToast.success('章节创建成功');
    }
    await refreshChapters();
  };

  const handleOpenDelete = (item: ChapterItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await chapterManageApi.delete(deleteTarget.id);
        showToast.success(`章节「${deleteTarget.chapterName}」已删除`);
        await refreshChapters();
      } catch (error) {
        console.error('删除章节失败:', error);
      }
      setDeleteTarget(null);
    }
  };

  const handleRestore = async (item: ChapterItem) => {
    setRestoringId(item.id);
    try {
      await chapterManageApi.restore(item.id);
      showToast.success(`章节「${item.chapterName}」已恢复`);
      await refreshChapters();
    } catch (error) {
      console.error('恢复章节失败:', error);
      showToast.error('恢复失败，请确认所属课程已恢复');
    } finally {
      setRestoringId(null);
    }
  };

  const columns: Column<ChapterItem>[] = [
    {
      id: 'courseId',
      key: 'courseId',
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
      flex: 3,
      render: (_, item) => (
        <span className="text-gray-700">{item.chapterName}</span>
      ),
    },
    {
      id: 'sectionCount',
      key: 'sectionCount',
      header: '小节数',
      flex: 1,
      align: 'center',
      render: (value) => (
        <span className="px-3 py-1 font-bold border-2 border-black rounded-md bg-blue-300 inline-block">
          {String(value)} 节
        </span>
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
      flex: 2,
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          {query.status === 'deleted' ? (
            <button
              onClick={() => handleRestore(item)}
              disabled={restoringId === item.id}
              className="flex items-center gap-1 border-2 border-black bg-green-300 px-3 py-1 text-xs font-bold text-zinc-950 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-wait disabled:opacity-60"
            >
              <FiRotateCcw className="h-3 w-3" />
              {restoringId === item.id ? '恢复中' : '恢复'}
            </button>
          ) : (
            <>
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
        searchPlaceholder="搜索章节名称..."
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={() => {
          const courseIdValue = filters.find(
            (filter) => filter.id === 'course'
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
            keyword: searchTerm || undefined,
            status:
              statusValue === 'deleted' ? 'deleted' : 'active',
            page: 1,
            size: current.size,
          }));
        }}
        actionSlot={
          <button
            onClick={handleOpenCreate}
            disabled={query.status === 'deleted'}
            className="px-6 py-2 rounded-sm bg-purple-500 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            + 新建章节
          </button>
        }
      />
      <div className="flex-1 min-h-0  flex flex-col">
        <DataTable<ChapterItem>
          columns={columns}
          data={chapters}
          loading={loading}
        />
      </div>
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
        open={!!deleteTarget}
        title="删除章节"
        message={`确定删除「${deleteTarget?.chapterName}」吗？删除后保留 30 天，可在回收站恢复。`}
        confirmText="确认"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {modalOpen && (
        <ChapterModel
          key={editingChapter?.id ?? 'create'}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingChapter}
        />
      )}
    </div>
  );
}
