'use client';
import { useState, useEffect } from 'react';
import FormInput from './FormInput';
import { getEmailCaptcha, forgetPassword } from '@/api/auth/auth';
import { useEmailCode } from '@/hooks/auth/useEmailCode';
import type { ValidateResult } from '@/utils/validate';
import { useRouter } from 'next/navigation';
import {
  validateEmail,
  validateCode,
  validatePassword,
  validateConfirmPassword,
} from '@/utils/validate';
import { toast } from 'sonner';

const STORAGE_KEY = 'forgotpasswordfrom';

type FieldStatus = 'success' | 'error' | null;

interface ForgotPasswordErrors {
  email?: string;
  emailCode?: string;
  password?: string;
  confirmPassword?: string;
}

export default function ForgotPasswordForm() {
  const getInitialFormData = () => {
    if (typeof window === 'undefined') {
      return {
        email: '',
        emailCode: '',
        password: '',
      };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return {
          email: stored,
          emailCode: '',
          password: '',
        };
      }
    } catch (e) {
      console.error('Failed to parse forgot password storage:', e);
    }
    return {
      email: '',
      emailCode: '',
      password: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, formData.email);
  }, [formData.email]);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    emailCode: false,
    password: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const getFieldStatus = (
    field: keyof typeof touched,
    value: string,
    validator: (value: string) => ValidateResult
  ): FieldStatus => {
    if (!touched[field]) return null;
    const result = validator(value);
    return result.isValid ? 'success' : 'error';
  };
  const router = useRouter();
  const emailStatus = getFieldStatus('email', formData.email, validateEmail);
  const emailCodeStatus = getFieldStatus(
    'emailCode',
    formData.emailCode,
    validateCode
  );
  const passwordStatus = getFieldStatus(
    'password',
    formData.password,
    validatePassword
  );

  const confirmPasswordStatus = touched.confirmPassword
    ? validateConfirmPassword(formData.password, confirmPassword).isValid
      ? 'success'
      : 'error'
    : null;

  const {
    countdown,
    loading: sendingCode,
    sendCode,
    isCounting,
  } = useEmailCode({
    duration: 60,
    onSend: async () => {
      const emailResult = validateEmail(formData.email);
      if (!emailResult.isValid) {
        setErrors((prev) => ({ ...prev, email: emailResult.message }));
        setTouched((prev) => ({ ...prev, email: true }));
        throw new Error(emailResult.message);
      }
      try {
        const res = await getEmailCaptcha({
          email: formData.email,
        });
        if (res.code === 200) {
          toast.success('验证码发送成功');
        } 
      } catch (error) {
        toast.error('获取验证码失败');
        console.error(error);
      }
    },
  });

  const validateForm = () => {
    const emailResult = validateEmail(formData.email);
    const codeResult = validateCode(formData.emailCode);
    const passwordResult = validatePassword(formData.password);
    const confirmPasswordResult = validateConfirmPassword(
      formData.password,
      confirmPassword
    );
    const newErrors: ForgotPasswordErrors = {
      email: emailResult.isValid ? '' : emailResult.message,
      emailCode: codeResult.isValid ? '' : codeResult.message,
      password: passwordResult.isValid ? '' : passwordResult.message,
      confirmPassword: confirmPasswordResult.isValid
        ? ''
        : confirmPasswordResult.message,
    };
    setErrors(newErrors);
    setTouched({
      email: true,
      emailCode: true,
      password: true,
      confirmPassword: true,
    });
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      setLoading(true);
      const res = await forgetPassword({
        email: formData.email,
        emailCode: formData.emailCode,
        password: formData.password,
      });

      if (res.code === 200) {
        localStorage.removeItem(STORAGE_KEY);
        toast.success('如果该邮箱已注册，密码已重置');
        setTimeout(() => {
          router.push('/auth/login');
        }, 500);
      }
    } catch (error) {
      toast.error('密码重置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 邮箱 */}
      <FormInput
        label="邮箱"
        type="email"
        value={formData.email}
        placeholder="请输入邮箱地址"
        touched={touched.email}
        error={errors.email}
        success={emailStatus === 'success'}
        onChange={(value) => {
          setFormData((prev) => ({ ...prev, email: value }));
          setErrors((prev) => ({ ...prev, email: '' }));
        }}
        onBlur={() => {
          setTouched((prev) => ({ ...prev, email: true }));
          const result = validateEmail(formData.email);
          setErrors((prev) => ({
            ...prev,
            email: result.isValid ? '' : result.message,
          }));
        }}
      />

      {/* 邮箱验证码 */}
      <div>
        <div className="flex  gap-3 items-end">
          <div className="flex-1">
            <FormInput
              label="邮箱验证码"
              value={formData.emailCode}
              placeholder="请输入邮箱验证码"
              touched={touched.emailCode}
              error={errors.emailCode}
              success={emailCodeStatus === 'success'}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, emailCode: value }));
                setErrors((prev) => ({ ...prev, emailCode: '' }));
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, emailCode: true }));
                const result = validateCode(formData.emailCode);
                setErrors((prev) => ({
                  ...prev,
                  emailCode: result.isValid ? '' : result.message,
                }));
              }}
            />
          </div>

          {/* 发送验证码 */}
          <button
            type="button"
            disabled={sendingCode || isCounting}
            onClick={sendCode}
            className="
              h-[51px]
              px-4
              whitespace-nowrap
              font-black 
              text-sm
              bg-yellow-400
              border-2 
              rounded-sm
              border-black
              shadow-[2px_2px_0_0_rgba(0,0,0,1)]
              hover:translate-x-[2px]
              hover:translate-y-[2px]
              hover:shadow-none
              transition-all
              disabled:opacity-50
              disabled:cursor-not-allowed
              disabled:hover:translate-x-0
              disabled:hover:translate-y-0
            "
          >
            {countdown > 0
              ? `${countdown}s`
              : sendingCode
                ? '发送中...'
                : '发送验证码'}
          </button>
        </div>
      </div>

      {/* 新密码 */}
      <FormInput
        label="新密码"
        value={formData.password}
        placeholder="请输入新密码"
        touched={touched.password}
        error={errors.password}
        success={passwordStatus === 'success'}
        showPasswordToggle
        showPassword={showConfirmPassword}
        onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        onChange={(value) => {
          setFormData((prev) => ({ ...prev, password: value }));
          setErrors((prev) => ({ ...prev, password: '' }));
        }}
        onBlur={() => {
          setTouched((prev) => ({ ...prev, password: true }));
          const result = validatePassword(formData.password);
          setErrors((prev) => ({
            ...prev,
            password: result.isValid ? '' : result.message,
          }));
        }}
      />

      {/* 确认密码 */}
      <FormInput
        label="确认密码"
        value={confirmPassword}
        placeholder="请再次输入密码"
        touched={touched.confirmPassword}
        error={errors.confirmPassword}
        success={confirmPasswordStatus === 'success'}
        showPasswordToggle
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        onChange={(value) => {
          setConfirmPassword(value);
          setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }}
        onBlur={() => {
          setTouched((prev) => ({ ...prev, confirmPassword: true }));
          const result = validateConfirmPassword(
            formData.password,
            confirmPassword
          );
          setErrors((prev) => ({
            ...prev,
            confirmPassword: result.isValid ? '' : result.message,
          }));
        }}
      />

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3
          font-black text-white
          bg-yellow-500
          border-2 border-black
          shadow-[4px_4px_0_0_rgba(0,0,0,1)]
          hover:translate-x-[4px]
          hover:translate-y-[4px]
          hover:shadow-none
          transition-all duration-200
          disabled:opacity-50
          disabled:cursor-not-allowed
          disabled:hover:translate-x-0
          disabled:hover:translate-y-0
        "
      >
        {loading ? '重置中...' : '重置密码'}
      </button>
    </form>
  );
}
