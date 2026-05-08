'use client';

import { useEffect, useState } from 'react';
import { getImageCaptcha } from '@/app/api/auth/auth';
import type { ImageCaptchaData } from 'shared/types/auth';
interface CaptchaImageProps {
  value: string;
  onChange: (data: { captchaCode: string; captchaId: string }) => void;
  error?: string;
}


export default function CaptchaImage({
  value,
  onChange,
  error,
}: CaptchaImageProps) {
  const [loading, setLoading] = useState(true);
  const [captchaData, setCaptchaData] = useState<ImageCaptchaData | null>(null);
  const [requestError, setRequestError] = useState<string>('');

  const fetchCaptcha = async () => {
    try {
      setLoading(true);
      setRequestError('');
      const res = await getImageCaptcha();
      if (res.code === 200 && res.data?.captchaId && res.data?.image) {
        setCaptchaData(res.data);
        onChange({
          captchaCode: '',
          captchaId: res.data.captchaId || '',
        });
      } else {
        setRequestError(res.message || '获取验证码失败');
      }
    } catch (error) {
      console.error(error);
      setRequestError('获取验证码失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initImageCaptcha = async () => {
      await fetchCaptcha();
    };
    initImageCaptcha();
  }, []);

  const handleRefresh = async () => {
    await fetchCaptcha();
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().replace(/\s/g, '');
    onChange({
      captchaCode: code,
      captchaId: captchaData?.captchaId || '',
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-black text-gray-700">验证码</label>
        {error && (
          <span className="text-xs font-bold text-red-500">{error}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* 输入框 */}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="请输入验证码"
          maxLength={4}
          className={`
            flex-1 px-4 py-3
            border-2 border-black
            bg-white
            uppercase
            font-black
            outline-none
            transition-all duration-200
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            focus:translate-x-[2px]
            focus:translate-y-[2px]
            focus:shadow-none
            ${error ? 'border-red-500' : 'focus:border-purple-500'}
          `}
        />
        {/* 验证码图片 */}
        <div className="relative">
          {loading ? (
            <div
              className="
                w-32 h-12
                border-2 border-black
                bg-gray-100
                flex items-center justify-center
                font-black text-xs
                shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
              "
            >
              加载中...
            </div>
          ) : requestError ? (
            <button
              type="button"
              onClick={handleRefresh}
              className="
                w-32 h-12
                border-2 border-black
                bg-red-200
                text-red-700
                text-xs font-black
                shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                hover:translate-x-[2px]
                hover:translate-y-[2px]
                hover:shadow-none
                transition-all
              "
            >
              点击重试
            </button>
          ) : (
            <div
              onClick={handleRefresh}
              className="
                w-32 h-12
                border-2 border-black
                bg-white
                flex items-center justify-center
                cursor-pointer
                shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                hover:translate-x-[2px]
                hover:translate-y-[2px]
                hover:shadow-none
                transition-all
              "
              title="点击刷新验证码"
              dangerouslySetInnerHTML={{ __html: captchaData?.image || '' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
