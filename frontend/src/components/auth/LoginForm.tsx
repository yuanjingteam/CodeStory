'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LoginRequest } from '@/types/auth';
import { getAuthErrorDetails, login } from '@/api/auth/auth';
import CaptchaImage, { type CaptchaImageHandle } from './CaptchaImageForm';
import type { ValidateResult } from '@/utils/validate';
import {
  validateEmail,
  validatePassword,
  validateImageCaptcha,
} from '@/utils/validate';
import FormInput from './FormInput';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import {
  getSafeRedirectPath,
  publishAuthSessionChange,
} from '@/utils/auth-session';

const STORAGE_KEY = 'loginfrom';

interface LoginStorage {
  email: string;
  rememberMe: boolean;
}

type FieldStatus = 'success' | 'error' | null;

export default function LoginForm() {
  const { addUser: setUserLogin } = useUserStore();
  const captchaRef = useRef<CaptchaImageHandle>(null);

  const getInitialLoginInput = (): LoginRequest => {
    try {
      if (typeof window === 'undefined') return defaultLoginInput;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: LoginStorage = JSON.parse(stored);
        return {
          email: parsed.email || '',
          password: '',
          captchaCode: '',
          captchaId: '',
          rememberMe: parsed.rememberMe || false,
        };
      }
    } catch (e) {
      console.error('Failed to parse login storage:', e);
    }
    return defaultLoginInput;
  };

  const defaultLoginInput: LoginRequest = {
    email: '',
    password: '',
    captchaCode: '',
    captchaId: '',
    rememberMe: false,
  };

  const [loginInput, setLoginInput] =
    useState<LoginRequest>(getInitialLoginInput);

  useEffect(() => {
    if (loginInput.rememberMe) {
      const storageData: LoginStorage = {
        email: loginInput.email,
        rememberMe: loginInput.rememberMe,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [loginInput.email, loginInput.rememberMe]);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    captcha: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({
    email: '',
    password: '',
    captcha: '',
  });

  const getFieldStatus = (
    field: keyof typeof touched,
    value: string,
    validator: (value: string) => ValidateResult
  ): FieldStatus => {
    if (!touched[field]) return null;
    const result = validator(value);
    return result.isValid ? 'success' : 'error';
  };

  const emailStatus = getFieldStatus('email', loginInput.email, validateEmail);
  const passwordStatus = getFieldStatus(
    'password',
    loginInput.password,
    validatePassword
  );

  const validateForm = () => {
    const emailResult = validateEmail(loginInput.email);
    const passwordResult = validatePassword(loginInput.password);
    const captchaResult = validateImageCaptcha(loginInput.captchaCode);
    const newErrors = {
      email: emailResult.isValid ? '' : emailResult.message,
      password: passwordResult.isValid ? '' : passwordResult.message,
      captcha: captchaResult.isValid ? '' : captchaResult.message,
    };
    setErrors(newErrors);
    setTouched({ email: true, password: true, captcha: true });
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      setLoading(true);
      const res = await login(loginInput);
      if (res.code === 200) {
        if (!loginInput.rememberMe) {
          localStorage.removeItem(STORAGE_KEY);
        }
        localStorage.removeItem('registerfrom');
        localStorage.removeItem('forgotpasswordfrom');
        toast.success('登录成功');
        await setUserLogin(res.data);
        publishAuthSessionChange({ type: 'signed-in', session: res.data });
        setTimeout(() => {
          const redirect = getSafeRedirectPath(
            new URLSearchParams(window.location.search).get('redirect')
          );
          router.push(redirect);
        }, 500);
        return;
      }
    } catch (error) {
      console.error(error);
      const details = getAuthErrorDetails(error, '登录失败，请稍后重试');
      toast.error(details.message);

      if (details.errorCode?.includes('IMAGE_CAPTCHA')) {
        setTouched((prev) => ({ ...prev, captcha: true }));
        setErrors((prev) => ({ ...prev, captcha: details.message }));
        await captchaRef.current?.refresh();
      } else if (
        details.errorCode === 'AUTH_CREDENTIALS_INVALID' ||
        details.errorCode === 'AUTH_ACCOUNT_DELETED'
      ) {
        setTouched((prev) => ({ ...prev, password: true }));
        setErrors((prev) => ({ ...prev, password: details.message }));
        await captchaRef.current?.refresh();
      } else if (details.status && details.status >= 500) {
        await captchaRef.current?.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <form onSubmit={handleSubmit} className={'space-y-4'}>
        {/* 邮箱 */}
        <FormInput
          label="邮箱"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={loginInput.email}
          placeholder="请输入邮箱地址"
          touched={touched.email}
          error={errors.email}
          success={emailStatus === 'success'}
          onChange={(value) => {
            setLoginInput((prev) => ({ ...prev, email: value }));
            setErrors((prev) => ({ ...prev, email: '' }));
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, email: true }));
            const result = validateEmail(loginInput.email);
            setErrors((prev) => ({
              ...prev,
              email: result.isValid ? '' : result.message,
            }));
          }}
        />
        {/* 密码 */}
        <FormInput
          label="密码"
          name="password"
          autoComplete="current-password"
          required
          value={loginInput.password}
          placeholder="请输入密码"
          touched={touched.password}
          error={errors.password}
          success={passwordStatus === 'success'}
          showPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          onChange={(value) => {
            setLoginInput((prev) => ({ ...prev, password: value }));
            setErrors((prev) => ({ ...prev, password: '' }));
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, password: true }));
            const result = validatePassword(loginInput.password);
            setErrors((prev) => ({
              ...prev,
              password: result.isValid ? '' : result.message,
            }));
          }}
        />

        <div>
          <CaptchaImage
            ref={captchaRef}
            value={loginInput.captchaCode}
            error={errors.captcha}
            onChange={({ captchaCode, captchaId }) => {
              setLoginInput((prev) => ({ ...prev, captchaCode, captchaId }));
              setErrors((prev) => ({ ...prev, captcha: '' }));
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={loginInput.rememberMe}
              onChange={(e) =>
                setLoginInput((prev) => ({
                  ...prev,
                  rememberMe: e.target.checked,
                }))
              }
              className="
                w-4 h-4
                border-2 border-black
                rounded-none
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-yellow-300
                focus-visible:ring-offset-2
              "
            />
            <span className="text-sm font-bold text-gray-700">记住我</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-black text-zinc-800 underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
          >
            忘记密码？
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          loadingText="登录中..."
          fullWidth
        >
          登录
        </Button>
      </form>
    </section>
  );
}
