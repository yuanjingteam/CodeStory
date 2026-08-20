'use client';
import { useState, useEffect } from 'react';
import FormInput from './FormInput';
import {
  forgetPassword,
  getAuthErrorDetails,
  getEmailCaptcha,
} from '@/api/auth/auth';
import { useEmailCode } from '@/hooks/auth/useEmailCode';
import type { ValidateResult } from '@/utils/validate';
import { useRouter } from 'next/navigation';
import {
  validateEmail,
  validateEmailCode,
  validatePassword,
  validateConfirmPassword,
} from '@/utils/validate';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

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
    validateEmailCode
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
    resetCountdown,
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
        const details = getAuthErrorDetails(error, '获取验证码失败');
        toast.error(details.message);
        console.error(error);
        throw error;
      }
    },
  });

  const validateForm = () => {
    const emailResult = validateEmail(formData.email);
    const codeResult = validateEmailCode(formData.emailCode);
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
      const details = getAuthErrorDetails(
        error,
        '密码重置失败，请稍后重试'
      );
      toast.error(details.message);
      if (details.errorCode?.includes('EMAIL_CODE')) {
        setTouched((prev) => ({ ...prev, emailCode: true }));
        setErrors((prev) => ({ ...prev, emailCode: details.message }));
      }
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
        name="email"
        type="email"
        autoComplete="username"
        required
        value={formData.email}
        placeholder="请输入邮箱地址"
        touched={touched.email}
        error={errors.email}
        success={emailStatus === 'success'}
        onChange={(value) => {
          setFormData((prev) => ({ ...prev, email: value, emailCode: '' }));
          setErrors((prev) => ({ ...prev, email: '', emailCode: '' }));
          setTouched((prev) => ({ ...prev, emailCode: false }));
          resetCountdown();
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <FormInput
              label="邮箱验证码"
              name="emailCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
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
                const result = validateEmailCode(formData.emailCode);
                setErrors((prev) => ({
                  ...prev,
                  emailCode: result.isValid ? '' : result.message,
                }));
              }}
            />
          </div>

          {/* 发送验证码 */}
          <Button
            type="button"
            variant="secondary"
            disabled={isCounting}
            loading={sendingCode}
            loadingText="发送中..."
            onClick={sendCode}
            className="h-[42px] w-full whitespace-nowrap px-3 text-sm sm:mt-[30px] sm:w-auto"
          >
            {countdown > 0 ? `${countdown}s 后重发` : '发送验证码'}
          </Button>
        </div>
      </div>

      {/* 新密码 */}
      <FormInput
        label="新密码"
        name="password"
        autoComplete="new-password"
        required
        value={formData.password}
        placeholder="请输入新密码"
        touched={touched.password}
        error={errors.password}
        success={passwordStatus === 'success'}
        showPasswordToggle
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        onChange={(value) => {
          setFormData((prev) => ({ ...prev, password: value }));
          setErrors((prev) => ({
            ...prev,
            password: '',
            confirmPassword: touched.confirmPassword
              ? validateConfirmPassword(value, confirmPassword).message
              : prev.confirmPassword,
          }));
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
        name="confirmPassword"
        autoComplete="new-password"
        required
        value={confirmPassword}
        placeholder="请再次输入密码"
        touched={touched.confirmPassword}
        error={errors.confirmPassword}
        success={confirmPasswordStatus === 'success'}
        showPasswordToggle
        showPassword={showConfirmPassword}
        onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        onChange={(value) => {
          setConfirmPassword(value);
          setErrors((prev) => ({
            ...prev,
            confirmPassword: touched.confirmPassword
              ? validateConfirmPassword(formData.password, value).message
              : '',
          }));
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
      <Button
        type="submit"
        variant="primary"
        loading={loading}
        loadingText="重置中..."
        fullWidth
      >
        重置密码
      </Button>
    </form>
  );
}
