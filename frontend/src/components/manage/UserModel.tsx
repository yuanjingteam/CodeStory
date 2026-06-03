'use client';
import { useState, useEffect } from 'react';
import { LuX } from 'react-icons/lu';
import { userSexMap } from '@/utils/constants';
import type { UpdateUserDetailRequest } from '@/types/user-manage';
import { uploadAvatar } from '@/api/profile';
import Img from 'next/image';
import { getUserDetailById } from '@/app/api/manage/user-manage';

interface UserModelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateUserDetailRequest & { id?: string }) => Promise<void>;
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
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState<UpdateUserDetailRequest>({
    email: '',
    role: 0,
    nickname: '',
    avatar: '',
    sex: 0,
    occupation: '',
    score: 0,
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
      id: '',
    });
    setAvatarFile(null);
    setPreviewUrl('');
  };

  useEffect(() => {
    if (open && userId) {
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
  }, [open, userId]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (
    field: keyof UpdateUserDetailRequest,
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
        id: userId,
      } as UpdateUserDetailRequest & { id?: string });
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      {/* Modal */}
      <div
        className="bg-white border-3 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <h2 className="text-xl font-bold">{'编辑用户'}</h2>
          <button
            onClick={handleClose}
            disabled={loading || submitting || fetching}
            className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-gray-100 font-bold disabled:opacity-50"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 加载状态 */}
          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            /* Form */
            <>
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-bold mb-1">用户名 *</label>
                <input
                  type="text"
                  value={formData.nickname || ''}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                  disabled={loading || submitting || fetching}
                  placeholder="请输入用户名"
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                />
              </div>

              {/* 邮箱 */}
              <div>
                <label className="block text-sm font-bold mb-1">邮箱 *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading || submitting || fetching}
                  placeholder="请输入邮箱地址"
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                />
              </div>

              {/* 头像 */}
              <div>
                <label className="block text-sm font-bold mb-1">上传头像</label>
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
                  className="hidden"
                  id="avatar-upload"
                />
                <div
                  onClick={() =>
                    document.getElementById('avatar-upload')?.click()
                  }
                  className="border-2 border-dashed border-black p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {previewUrl ? (
                    <div className="flex items-center gap-4">
                      <Img
                        src={previewUrl}
                        alt="avatar"
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full border-2 border-black object-cover"
                      />
                      <span className="text-sm text-gray-500">
                        点击更换头像
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Img
                        src="/default-avatar.png"
                        alt="default avatar"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full border-2 border-gray-300"
                      />
                      <span className="text-sm">点击上传头像</span>
                      <span className="text-xs">支持 JPG、PNG 格式</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 性别 */}
              <div>
                <label className="block text-sm font-bold mb-1">性别</label>
                <div className="flex gap-2">
                  {[0, 1, 2].map((sex) => (
                    <button
                      key={sex}
                      type="button"
                      onClick={() => handleChange('sex', sex)}
                      disabled={loading || submitting || fetching}
                      className={`flex-1 px-3 py-2 border-2 border-black font-bold text-sm transition-all duration-150 ${
                        formData.sex === sex
                          ? 'bg-purple-500 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
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
                <label className="block text-sm font-bold mb-1">职业</label>
                <input
                  type="text"
                  value={formData.occupation || ''}
                  onChange={(e) => handleChange('occupation', e.target.value)}
                  disabled={loading || submitting || fetching}
                  placeholder="请输入职业"
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                />
              </div>

              {/* 角色 */}
              <div>
                <label className="block text-sm font-bold mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', Number(e.target.value))}
                  disabled={loading || submitting || fetching}
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                >
                  <option value={0}>普通用户</option>
                  <option value={1}>管理员</option>
                  <option value={2}>讲师</option>
                </select>
              </div>

              {/* 等级和积分 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">等级</label>
                  <div className="w-full px-3 py-2 border-2 border-gray-300 bg-gray-100 text-gray-600 font-bold">
                    {Math.floor((formData.score || 0) / 1500)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">积分</label>
                  <input
                    type="number"
                    value={formData.score}
                    onChange={(e) => {
                      const newScore = Number(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        score: newScore,
                        level: Math.floor(newScore / 1500),
                      }));
                    }}
                    min={0}
                    disabled={loading || submitting || fetching}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 按钮区域 */}
        <div className="flex gap-3 p-4 border-t-2 border-black justify-end">
          <button
            onClick={handleClose}
            disabled={loading || submitting || fetching}
            className="px-5 py-2 border-2 border-black font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || submitting || fetching}
            className="px-5 py-2 bg-purple-500 text-white font-bold border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              '保存修改'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
