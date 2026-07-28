'use client';
import { useState, useRef } from 'react';
import { FiUpload } from 'react-icons/fi';
import Image from 'next/image';
import type { CourseFormData } from '@/types/course-manage';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';
import Textarea from '@/components/ui/Textarea';

interface CourseModelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CourseFormData & { id?: string }) => Promise<void>;
  initialData?: CourseFormData & { id: string; cover_url?: string };
}

const levelOptions = [
  { label: '初级', value: 0 },
  { label: '中级', value: 1 },
  { label: '高级', value: 2 },
];

const getInitialFormData = (initialData?: CourseModelProps['initialData']): CourseFormData => ({
  title: initialData?.title || '',
  description: initialData?.description || '',
  level: initialData?.level ?? 0,
  coverImage: undefined,
});

export default function CourseModel({ open, onClose, onSubmit, initialData }: CourseModelProps) {
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState<CourseFormData>(() => getInitialFormData(initialData));
  const [previewUrl, setPreviewUrl] = useState<string>(() => initialData?.cover_url || '');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, coverImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('请输入课程名称');
      return;
    }
    if (!formData.description.trim()) {
      alert('请输入课程描述');
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
      title={isEdit ? '编辑课程' : '新建课程'}
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
          <Field label="课程名称" htmlFor="course-title" required>
            <Input
              id="course-title"
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入课程名称"
            />
          </Field>

          <Field label="课程描述" htmlFor="course-description" required>
            <Textarea
              id="course-description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请输入课程描述"
              rows={3}
              className="resize-none"
            />
          </Field>

          <Field label="等级" htmlFor="course-level">
            <NativeSelect
              id="course-level"
              value={formData.level}
              onChange={e => setFormData(prev => ({ ...prev, level: Number(e.target.value) }))}
            >
              {levelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="课程封面"
            htmlFor="course-cover"
            helperText="支持 JPG、PNG 格式"
          >
            <input
              id="course-cover"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-black p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="课程封面预览"
                  width={320}
                  height={160}
                  unoptimized
                  className="max-h-40 w-auto mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <FiUpload className="w-10 h-10" />
                  <span className="text-sm">点击上传封面图片</span>
                </div>
              )}
            </div>
          </Field>
    </Dialog>
  );
}
