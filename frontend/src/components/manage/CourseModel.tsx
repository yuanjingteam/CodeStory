'use client';
import { useState, useRef } from 'react';
import { FiX, FiUpload } from 'react-icons/fi';
import Image from 'next/image';
import type { CourseFormData } from '@/types/course-manage';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] w-full max-w-lg mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <h2 className="text-xl font-bold">{isEdit ? '编辑课程' : '新建课程'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-gray-100 font-bold"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-bold mb-1">课程名称 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入课程名称"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">课程描述 *</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请输入课程描述"
              rows={3}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">等级</label>
            <select
              value={formData.level}
              onChange={e => setFormData(prev => ({ ...prev, level: Number(e.target.value) }))}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {levelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">课程封面</label>
            <input
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
                  <span className="text-xs">支持 JPG、PNG 格式</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t-2 border-black justify-end">
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
