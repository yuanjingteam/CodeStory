'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IoLogoWechat } from 'react-icons/io5';
import Link from 'next/link';
import type { LoginRequest } from '@/types/auth';
import { login } from '@/api/auth/auth';
import CaptchaImage from './CaptchaImageForm';
import type { ValidateResult } from '@/utils/validate';
import {
  validateEmail,
  validatePassword,
  validateCode,
} from '@/utils/validate';
import FormInput from './FormInput';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';

const STORAGE_KEY = 'loginfrom';

interface LoginStorage {
  email: string;
  rememberMe: boolean;
}

type FieldStatus = 'success' | 'error' | null;

export default function LoginForm() {
  const { addUser: setUserLogin } = useUserStore();
  const captchaRef = useRef<{ refresh: () => void }>(null);

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
    const captchaResult = validateCode(loginInput.captchaCode);
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
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('registerfrom');
        localStorage.removeItem('forgotpasswordfrom');
        toast.success('登录成功');
        await setUserLogin(res.data);
        setTimeout(() => {
          router.push('/');
        }, 500);
        return;
      } else {
        setTimeout(() => {
          captchaRef.current?.refresh();
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      toast.error('登录失败');
      setLoginInput((prev) => ({ ...prev, password: '' }));
      captchaRef.current?.refresh();
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
          type="email"
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
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
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
                focus:ring-0
              "
            />
            <span className="text-sm font-bold text-gray-700">记住我</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-black text-yellow-600 hover:underline"
          >
            忘记密码？
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="
            w-full py-3
            font-black text-white
            bg-purple-500
            border-2 
            rounded-sm
            border-black
            shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
            hover:translate-x-[2px]
            hover:translate-y-[2px]
            hover:shadow-none
            transition-all duration-200
            disabled:opacity-50
            disabled:cursor-not-allowed
            disabled:hover:translate-x-0
            disabled:hover:translate-y-0
            disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          "
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <div className="my-5 flex items-center">
        <div className="flex-1 border-t-2 border-black"></div>
        <span className="px-4 text-sm font-black text-gray-500">
          或者使用以下方式登录
        </span>
        <div className="flex-1 border-t-2 border-black"></div>
      </div>
      <div className="flex gap-3">
        <button
          className="
            flex-1 py-3
            bg-white
            border-2 
            rounded-sm
            border-black
            shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
            hover:translate-x-[2px]
            hover:translate-y-[2px]
            hover:shadow-none
            transition-all duration-200
            flex items-center justify-center gap-2
          "
        >
          <IoLogoWechat className="w-5 h-5" />
          <span className="font-black text-sm">微信登录</span>
        </button>
      </div>
    </section>
  );
}
