'use client';
import { useState, useEffect } from 'react';
import { userSexMap } from '@/utils/constants';
import type { UpdateUserDetailRequest } from '@/types/user-manage';
import { uploadAvatar } from '@/api/profile';
import Img from 'next/image';
import { getUserDetailById } from '@/app/api/manage/user-manage';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
      title="编辑用户"
      closeDisabled={loading || submitting || fetching}
      bodyClassName="space-y-4"
      footer={
        <>
          <Button
            onClick={handleClose}
            disabled={loading || submitting || fetching}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || fetching}
            loading={submitting}
            loadingText="保存中..."
          >
            保存修改
          </Button>
        </>
      }
    >
          {/* 加载状态 */}
          {fetching ? (
            <div
              className="grid gap-4 py-2"
              role="status"
              aria-label="正在加载用户信息"
            >
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="grid gap-2">
                  <div className="h-4 w-20 animate-pulse bg-zinc-200" />
                  <div className="h-10 w-full animate-pulse border-2 border-zinc-200 bg-zinc-100" />
                </div>
              ))}
            </div>
          ) : (
            /* Form */
            <>
              {/* 用户名 */}
              <Field label="用户名" htmlFor="user-nickname" required>
                <Input
                  id="user-nickname"
                  type="text"
                  value={formData.nickname || ''}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                  disabled={loading || submitting || fetching}
                  placeholder="请输入用户名"
                />
              </Field>

              {/* 邮箱 */}
              <Field label="邮箱" htmlFor="user-email" required>
                <Input
                  id="user-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading || submitting || fetching}
                  placeholder="请输入邮箱地址"
                />
              </Field>

              {/* 头像 */}
              <Field
                label="上传头像"
                htmlFor="avatar-upload"
                helperText="支持 JPG、PNG 格式"
              >
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
                    </div>
                  )}
                </div>
              </Field>

              {/* 性别 */}
              <Field label="性别">
                <div className="flex gap-2">
                  {[0, 1, 2].map((sex) => (
                    <Button
                      key={sex}
                      type="button"
                      variant={formData.sex === sex ? 'primary' : 'secondary'}
                      onClick={() => handleChange('sex', sex)}
                      disabled={loading || submitting || fetching}
                      className="flex-1 px-3 text-sm"
                      aria-pressed={formData.sex === sex}
                    >
                      {userSexMap[sex]}
                    </Button>
                  ))}
                </div>
              </Field>

              {/* 职业 */}
              <Field label="职业" htmlFor="user-occupation">
                <Input
                  id="user-occupation"
                  type="text"
                  value={formData.occupation || ''}
                  onChange={(e) => handleChange('occupation', e.target.value)}
                  disabled={loading || submitting || fetching}
                  placeholder="请输入职业"
                />
              </Field>

              {/* 角色 */}
              <Field label="角色" htmlFor="user-role">
                <NativeSelect
                  id="user-role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', Number(e.target.value))}
                  disabled={loading || submitting || fetching}
                >
                  <option value={0}>普通用户</option>
                  <option value={1}>管理员</option>
                  <option value={2}>讲师</option>
                </NativeSelect>
              </Field>

              {/* 等级和积分 */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="等级">
                  <div className="w-full px-3 py-2 border-2 border-gray-300 bg-gray-100 text-gray-600 font-bold">
                    {Math.floor((formData.score || 0) / 1500)}
                  </div>
                </Field>
                <Field label="积分" htmlFor="user-score">
                  <Input
                    id="user-score"
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
                  />
                </Field>
              </div>
            </>
          )}
    </Dialog>
  );
}
