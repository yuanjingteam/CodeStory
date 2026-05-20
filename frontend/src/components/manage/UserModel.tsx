'use client';
import { useState, useEffect } from 'react';
import { LuX } from 'react-icons/lu';
import { userSexMap } from '@/utils/constants';
import type { UserDetailRequest } from 'shared/types/user-manage';
import { uploadAvatar } from '@/api/profile';
import Img from 'next/image';
import { getUserDetailById } from '@/app/api/manage/user-manage';

interface UserModelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserDetailRequest & { id?: string }) => Promise<void>;
  userId?: string | null;
  loading?: boolean;
}

export default function UserModel({
  open,
  onClose,
  onSubmit,
  userId,
  loading = false,
}: UserModelProps) {
  const isEdit = !!userId;
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState<UserDetailRequest>({
    email: '',
    role: 0,
    nickname: '',
    avatar: '',
    sex: 0,
    occupation: '',
    score: 0,
    level: 0,
    id: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      email: '',
      role: 0,
      nickname: '',
      avatar: '',
      sex: 0,
      occupation: '',
      score: 0,
      level: 0,
      id: '',
    });
    setAvatarFile(null);
    setPreviewUrl('');
  };

  useEffect(() => {
    if (open && isEdit && userId) {
      const fetchUserDetail = async () => {
        setFetching(true);
        try {
          const res = await getUserDetailById(userId);
          if (res.code === 200 && res.data) {
            const userData = res.data;
            setFormData({
              email: userData.email || '',
              role: userData.role ?? 0,
              nickname: userData.nickname || '',
              avatar: userData.avatar || '',
              sex: userData.sex ?? 0,
              occupation: userData.occupation || '',
              score: userData.score ?? 0,
              level: userData.level ?? 1,
              id: userId,
            });
            setPreviewUrl(userData.avatar || '');
          }
        } catch (error) {
          console.error('获取用户详情失败:', error);
        } finally {
          setFetching(false);
        }
      };
      fetchUserDetail();
    }
  }, [open, userId, isEdit]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (
    field: keyof UserDetailRequest,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.nickname?.trim()) {
      alert('请输入用户名');
      return;
    }
    if (!formData.email.trim()) {
      alert('请输入邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('请输入有效的邮箱地址');
      return;
    }
    setSubmitting(true);
    try {
      let avatarUrl = formData.avatar;
      if (avatarFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('avatar', avatarFile);
        const uploadRes = await uploadAvatar(uploadFormData);
        avatarUrl = uploadRes.data.avatar;
      }

      await onSubmit({
        ...formData,
        avatar: avatarUrl,
        id: isEdit ? userId : undefined,
      } as UserDetailRequest & { id?: string });
    } finally {
      setSubmitting(false);
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    if (!loading && !submitting) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      resetForm();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] w-full max-w-md mx-4">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          disabled={loading || submitting || fetching}
          className="absolute -top-3 -right-3 w-8 h-8 bg-red-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-150 disabled:opacity-50"
        >
          <LuX className="w-4 h-4 text-black" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-black text-black mb-6">
          {isEdit ? 'EDIT USER' : 'ADD USER'}
        </h2>

        {/* 加载状态 */}
        {fetching ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          /* Form */
          <div className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-bold text-black mb-1">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nickname || ''}
                onChange={(e) => handleChange('nickname', e.target.value)}
                disabled={loading || submitting || fetching}
                placeholder="请输入用户名"
                className="w-full px-3 py-2 border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-bold text-black mb-1">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={loading || submitting || fetching}
                placeholder="请输入邮箱地址"
                className="w-full px-3 py-2 border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              />
            </div>

            {/* 头像 */}
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
                  disabled={loading || submitting || fetching}
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
                {[0, 1, 2].map((sex) => (
                  <button
                    key={sex}
                    type="button"
                    onClick={() => handleChange('sex', sex)}
                    disabled={loading || submitting || fetching}
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
                value={formData.occupation || ''}
                onChange={(e) => handleChange('occupation', e.target.value)}
                disabled={loading || submitting || fetching}
                placeholder="请输入职业"
                className="w-full px-3 py-2 border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              />
            </div>

            {/* 角色 */}
            <div>
              <label className="block text-sm font-bold text-black mb-1">
                角色
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', Number(e.target.value))}
                disabled={loading || submitting || fetching}
                className="w-full px-3 py-2 border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              >
                <option value={0}>普通用户</option>
                <option value={1}>管理员</option>
                <option value={2}>讲师</option>
              </select>
            </div>

            {/* 等级和积分 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  等级
                </label>
                <input
                  type="number"
                  value={formData.level}
                  onChange={(e) =>
                    handleChange('level', Number(e.target.value) || 1)
                  }
                  min={1}
                  disabled={loading || submitting || fetching}
                  className="w-full px-3 py-2 border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">
                  积分
                </label>
                <input
                  type="number"
                  value={formData.score}
                  onChange={(e) =>
                    handleChange('score', Number(e.target.value) || 0)
                  }
                  min={0}
                  disabled={loading || submitting || fetching}
                  className="w-full px-3 py-2 border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading || submitting || fetching}
                className="flex-1 px-4 py-2 border-2 border-black bg-gray-200 text-black font-bold hover:bg-gray-300 transition-all duration-150 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || submitting || fetching}
                className="flex-1 px-4 py-2 border-2 border-black bg-green-400 text-black font-bold hover:bg-green-500 transition-all duration-150 disabled:opacity-50 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                {submitting ? '保存中...' : isEdit ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
