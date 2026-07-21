'use client';
import { useEffect, useState } from 'react';
import type { UpdateUserInfopRequest } from '@/types/profile';
import { userSexMap } from '@/utils/constants';
import { LuX } from 'react-icons/lu';
import { uploadAvatar } from '@/api/profile';
import Img from 'next/image';

interface UpdateUserInfoProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: UpdateUserInfopRequest;
  onSubmit: (data: UpdateUserInfopRequest) => void;
  loading?: boolean;
}

export default function UpdateUserInfoForm({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  loading = false,
}: UpdateUserInfoProps) {
  const [formData, setFormData] = useState<UpdateUserInfopRequest>(initialData);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialData.avatar);

  const handleChange = (
    field: keyof UpdateUserInfopRequest,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let avatarUrl = formData.avatar;
      if (avatarFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('avatar', avatarFile);
        const uploadRes = await uploadAvatar(uploadFormData);
        avatarUrl = uploadRes.data.avatar;
      }

      onSubmit({
        ...formData,
        avatar: avatarUrl,
      });
    } catch (error) {
      console.error('上传头像失败:', error);
    } finally {
      handleClose();
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleClose = () => {
    if (!loading) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center z-index-500">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] w-full max-w-md mx-4">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute -top-3 -right-3 w-8 h-8 bg-red-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-150 disabled:opacity-50"
        >
          <LuX className="w-4 h-4 text-black" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-black text-black mb-6">EDIT PROFILE</h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 昵称 */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              昵称
            </label>

            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => handleChange('nickname', e.target.value)}
              disabled={loading}
              placeholder="请输入昵称"
              className="w-full px-3 py-2 border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">
              上传头像
            </label>

            <div className="flex items-center gap-4">
              <Img
                src={previewUrl || '/default-avatar.png'}
                alt="avatar"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full border-2 border-black object-cover"
              />

              <input
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarFile(file);
                  const preview = URL.createObjectURL(file);
                  setPreviewUrl(preview);
                }}
                className="text-sm file:mr-4 file:border-2 file:border-black file:bg-purple-400 file:px-3 file:py-1 file:text-black file:font-bold hover:file:bg-purple-500"
              />
            </div>
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              性别
            </label>

            <div className="flex gap-2">
              {[1, 2].map((sex) => (
                <button
                  key={sex}
                  type="button"
                  onClick={() => handleChange('sex', sex)}
                  disabled={loading}
                  className={`flex-1 px-3 py-2 border-2 border-black font-bold text-sm transition-all duration-150 ${
                    formData.sex === sex
                      ? 'bg-purple-400 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
                      : 'bg-white text-black hover:bg-gray-100'
                  } disabled:opacity-50`}
                >
                  {userSexMap[sex]}
                </button>
              ))}
            </div>
          </div>

          {/* 职业 */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              职业
            </label>

            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => handleChange('occupation', e.target.value)}
              disabled={loading}
              placeholder="请输入职业"
              className="w-full px-3 py-2 border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-black bg-gray-200 text-black font-bold hover:bg-gray-300 transition-all duration-150 disabled:opacity-50"
            >
              取消
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-black bg-green-400 text-black font-bold hover:bg-green-500 transition-all duration-150 disabled:opacity-50 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
