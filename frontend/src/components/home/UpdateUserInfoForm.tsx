'use client';

import { useEffect, useState } from 'react';
import Img from 'next/image';
import type { UpdateUserInfopRequest } from '@/types/profile';
import { userSexMap } from '@/utils/constants';
import { uploadAvatar } from '@/api/profile';
import { Button, Dialog, Field, Input } from '@/components/ui';

interface UpdateUserInfoProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: UpdateUserInfopRequest;
  onSubmit: (data: UpdateUserInfopRequest) => Promise<void>;
}

export default function UpdateUserInfoForm({
  isOpen,
  onClose,
  initialData,
  onSubmit,
}: UpdateUserInfoProps) {
  const [formData, setFormData] = useState<UpdateUserInfopRequest>(initialData);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialData.avatar);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (
    field: keyof UpdateUserInfopRequest,
    value: string | number
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      let avatar = formData.avatar;
      if (avatarFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('avatar', avatarFile);
        const uploadResponse = await uploadAvatar(uploadFormData);
        avatar = uploadResponse.data.avatar;
      }
      await onSubmit({ ...formData, avatar });
      onClose();
    } catch (error) {
      console.error('更新个人信息失败:', error);
      setSubmitError('保存失败，请检查网络后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
      title="编辑个人信息"
      description="更新你的昵称、头像和个人资料。"
      closeDisabled={submitting}
      closeOnOverlay={!submitting}
      bodyClassName="p-4 sm:p-6"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
            取消
          </Button>
          <Button type="submit" form="profile-edit-form" variant="success" loading={submitting} loadingText="保存中..." className="w-full sm:w-auto">
            保存
          </Button>
        </>
      }
    >
      <form id="profile-edit-form" onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
        <Field label="昵称" htmlFor="profile-nickname" required>
          <Input
            id="profile-nickname"
            value={formData.nickname}
            onChange={(event) => handleChange('nickname', event.target.value)}
            disabled={submitting}
            required
          />
        </Field>

        <Field label="头像" htmlFor="profile-avatar" helperText="支持常见图片格式。">
          <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Img
              src={previewUrl || '/default-avatar.png'}
              alt="当前头像预览"
              width={80}
              height={80}
              className="size-20 shrink-0 rounded-full border-2 border-black object-cover"
            />
            <input
              id="profile-avatar"
              type="file"
              accept="image/*"
              disabled={submitting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setAvatarFile(file);
                setPreviewUrl(URL.createObjectURL(file));
              }}
              className="min-w-0 max-w-full text-sm file:mr-3 file:cursor-pointer file:border-2 file:border-black file:bg-yellow-300 file:px-3 file:py-2 file:font-bold disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </Field>

        <Field label="性别">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((sex) => (
              <Button
                key={sex}
                type="button"
                variant={formData.sex === sex ? 'primary' : 'secondary'}
                aria-pressed={formData.sex === sex}
                onClick={() => handleChange('sex', sex)}
                disabled={submitting}
              >
                {userSexMap[sex]}
              </Button>
            ))}
          </div>
        </Field>

        <Field label="职业" htmlFor="profile-occupation">
          <Input
            id="profile-occupation"
            value={formData.occupation}
            onChange={(event) => handleChange('occupation', event.target.value)}
            disabled={submitting}
          />
        </Field>

        {submitError ? (
          <p className="border-2 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">
            {submitError}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
