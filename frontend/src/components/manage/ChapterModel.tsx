'use client';
import { useState, useEffect } from 'react';
import type { CreateChapterRequest, UpdateChapterRequest } from '@/types/chapter-manage';
import courseApi from '@/app/api/courses/courses';
import type { Course } from '@/types/course';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';

interface ChapterModelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: (CreateChapterRequest | UpdateChapterRequest) & { id?: string }) => Promise<void>;
  initialData?: {
    id: string;
    courseId: string;
    chapterName: string;
    sortOrder: number;
  };
}

const getInitialFormData = (initialData?: ChapterModelProps['initialData']) => ({
  courseId: initialData?.courseId || '',
  chapterName: initialData?.chapterName || '',
  sortOrder: initialData?.sortOrder ?? 0,
});

export default function ChapterModel({ open, onClose, onSubmit, initialData }: ChapterModelProps) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState<{
    courseId: string;
    chapterName: string;
    sortOrder: number;
  }>(() => getInitialFormData(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await courseApi.getList({
        page: 1,
        size: 100,
      });
      setCourses(res.records || []);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

 useEffect(() => {
  if (open) {
    const load = async () => {
      try {
        await fetchCourses();
      } catch (err) {
        console.error('加载课程失败：', err);
      }
    };
    load();
  }
}, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!formData.courseId) {
      alert('请选择课程');
      return;
    }
    if (!formData.chapterName.trim()) {
      alert('请输入章节名称');
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) {
          onClose();
        }
      }}
      title={isEdit ? '编辑章节' : '新建章节'}
      closeDisabled={submitting}
      bodyClassName="space-y-4"
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            取消
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
          <Field label="所属课程" htmlFor="chapter-course" required>
            <NativeSelect
              id="chapter-course"
              value={formData.courseId}
              onChange={e => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
              disabled={isEdit}
            >
              <option value="">{loadingCourses ? '加载中...' : '请选择课程'}</option>
              {courses.map(course => (
                <option key={course.id} value={String(course.id)}>
                  {course.title}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="章节名称" htmlFor="chapter-name" required>
            <Input
              id="chapter-name"
              type="text"
              value={formData.chapterName}
              onChange={e => setFormData(prev => ({ ...prev, chapterName: e.target.value }))}
              placeholder="请输入章节名称，例如：第一章：变量与数据类型"
            />
          </Field>
    </Dialog>
  );
}
