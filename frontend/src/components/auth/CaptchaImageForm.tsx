'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { getImageCaptcha } from '@/api/auth/auth';
import type { ImageCaptchaData } from '@/types/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface CaptchaImageProps {
  value: string;
  onChange: (data: { captchaCode: string; captchaId: string }) => void;
  error?: string;
}

type CaptchaStatus = 'loading' | 'ready' | 'error';

export interface CaptchaImageHandle {
  refresh: () => Promise<void>;
}

export default forwardRef<CaptchaImageHandle, CaptchaImageProps>(
  function CaptchaImage({ value, onChange, error }, ref) {
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const statusId = `${inputId}-status`;
    const [status, setStatus] = useState<CaptchaStatus>('loading');
    const [captchaData, setCaptchaData] = useState<ImageCaptchaData | null>(null);
    const onChangeRef = useRef(onChange);
    const requestIdRef = useRef(0);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    const fetchCaptcha = useCallback(async () => {
      const requestId = ++requestIdRef.current;
      setStatus('loading');
      setCaptchaData(null);
      onChangeRef.current({ captchaCode: '', captchaId: '' });

      try {
        const res = await getImageCaptcha();
        if (requestId !== requestIdRef.current) return;
        if (res.code !== 200 || !res.data?.captchaId || !res.data?.image) {
          throw new Error(res.message || '图片验证码加载失败');
        }

        setCaptchaData(res.data);
        setStatus('ready');
        onChangeRef.current({
          captchaCode: '',
          captchaId: res.data.captchaId,
        });
      } catch (fetchError) {
        if (requestId !== requestIdRef.current) return;
        console.error(fetchError);
        setStatus('error');
      }
    }, []);

    useImperativeHandle(ref, () => ({ refresh: fetchCaptcha }), [fetchCaptcha]);

    useEffect(() => {
      void fetchCaptcha();
      return () => {
        requestIdRef.current += 1;
      };
    }, [fetchCaptcha]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const captchaCode = event.target.value.replace(/\s/g, '').toUpperCase();
      onChange({
        captchaCode,
        captchaId: captchaData?.captchaId || '',
      });
    };

    return (
      <div className="grid gap-2">
        <label htmlFor={inputId} className="text-sm font-bold text-zinc-800">
          图片验证码
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Input
            id={inputId}
            name="captchaCode"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            required
            value={value}
            onChange={handleInputChange}
            placeholder="4位验证码"
            maxLength={4}
            invalid={Boolean(error)}
            aria-describedby={error ? errorId : statusId}
            className="min-w-0 uppercase font-black tracking-[0.2em]"
          />

          {status === 'ready' ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void fetchCaptcha()}
              aria-label="刷新图片验证码"
              className="h-full min-h-11 overflow-hidden px-1 py-0"
            >
              <span
                className="flex h-full w-full items-center justify-center"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: captchaData?.image || '' }}
              />
            </Button>
          ) : status === 'loading' ? (
            <Button
              type="button"
              variant="secondary"
              disabled
              loading
              loadingText="加载中"
              aria-label="图片验证码加载中"
              className="h-full min-h-11 px-2 text-xs"
            >
              加载中
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => void fetchCaptcha()}
              aria-label="重新加载图片验证码"
              className="h-full min-h-11 px-2 text-xs"
            >
              重新加载
            </Button>
          )}
        </div>
        {error ? (
          <p id={errorId} className="text-sm font-bold text-red-600">
            {error}
          </p>
        ) : (
          <p id={statusId} className="text-xs text-zinc-600" aria-live="polite">
            {status === 'error'
              ? '图片验证码加载失败，请重试'
              : '验证码不区分大小写，点击图片可刷新'}
          </p>
        )}
      </div>
    );
  }
);
