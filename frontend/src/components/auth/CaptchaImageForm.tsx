'use client';
import {
  useEffect,
  useEffectEvent,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { getImageCaptcha } from '@/api/auth/auth';
import type { ImageCaptchaData } from '@/types/auth';
import { toast } from 'sonner';

interface CaptchaImageProps {
  value: string;
  onChange: (data: { captchaCode: string; captchaId: string }) => void;
  error?: string;
}

export default forwardRef<{ refresh: () => void }, CaptchaImageProps>(
  function CaptchaImage({ value, onChange, error }, ref) {
    const [loading, setLoading] = useState(true);
    const [captchaData, setCaptchaData] = useState<ImageCaptchaData | null>(
      null
    );
    const notifyCaptchaChange = useEffectEvent(onChange);

    const fetchCaptcha = async () => {
      try {
        setLoading(true);
        const res = await getImageCaptcha();
        if (res.code === 200 && res.data?.captchaId && res.data?.image) {
          setCaptchaData(res.data);
          onChange({
            captchaCode: '',
            captchaId: res.data.captchaId || '',
          });
        } else {
          toast.error(res.message || '获取验证码失败');
        }
      } catch (error) {
        console.error(error);
        toast.error('获取验证码失败');
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      refresh: fetchCaptcha,
    }));

    useEffect(() => {
      let cancelled = false;

      getImageCaptcha()
        .then((res) => {
          if (cancelled) return;
          if (res.code === 200 && res.data?.captchaId && res.data?.image) {
            setCaptchaData(res.data);
            notifyCaptchaChange({
              captchaCode: '',
              captchaId: res.data.captchaId,
            });
          } else {
            toast.error(res.message || '获取验证码失败');
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error(error);
            toast.error('获取验证码失败');
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
    }, []);

    const handleRefresh = async () => {
      await fetchCaptcha();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const code = e.target.value.replace(/\s/g, '');
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
        <div className="flex items-center gap-1">
          {/* 输入框 */}
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder="请输入验证码（大写字母）"
            maxLength={4}
            className={`
              flex-1 px-4 py-3
              border-2
              rounded-sm
              border-gray-500
              bg-white
              uppercase
              font-black
              outline-none
              transition-all 
              duration-200
              ${error ? 'border-red-500' : 'focus:border-purple-500'}
            `}
          />
          {/* 验证码图片 */}
          <div className="relative">
            {loading ? (
              <div
                className="
                  w-32 h-12
                  border-2 
                  border-black
                  bg-gray-100
                  flex items-center justify-center
                  font-black text-xs
                "
              >
                加载中...
              </div>
            ) : error ? (
              <button
                type="button"
                onClick={handleRefresh}
                className="
                  w-32 h-12
                  border-2 
                  rounded-sm
                  border-black
                  bg-red-200
                  text-red-700
                  text-xs font-black
                  shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  active:translate-x-[2px]
                  active:translate-y-[2px]
                  active:shadow-none
                  transition-all
                "
              >
                点击重试
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRefresh}
                className="
                  w-32 h-12
                  border-2 border-black
                  bg-white
                  flex items-center justify-center
                  cursor-pointer
                  shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  active:translate-x-[2px]
                  active:translate-y-[2px]
                  active:shadow-none
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
);
