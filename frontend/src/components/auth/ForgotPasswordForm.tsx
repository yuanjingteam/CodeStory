'use client';

import { useState } from 'react';
import type { LoginRequest } from 'shared/types/auth';
import FormInput from './FormInput';
import { getEmailCaptcha, resetPassword } from '@/app/api/auth/auth';
import { useEmailCode } from '@/hooks/auth/useEmailCode';
import {
  validateEmail,
  validateCode,
  validatePassword,
  validateConfirmPassword,
  ValidateResult,
} from '@/utils/validate';

interface ForgotPasswordFormProps {
  onSubmit?: (data: LoginRequest) => void;
}

type FieldStatus = 'success' | 'error' | null;

interface ForgotPasswordErrors {
  email?: string;
  emailCode?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
}

export default function ForgotPasswordForm({
  onSubmit,
}: ForgotPasswordFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    emailCode: '',
    password: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
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
      await getEmailCaptcha({
        email: formData.email,
      });
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
      submit: '',
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
    setSuccess('');
    setErrors((prev) => ({ ...prev, submit: '' }));
    if (!validateForm()) {
      return;
    }
    try {
      setLoading(true);
      const res = await resetPassword({
        email: formData.email,
        emailCode: formData.emailCode,
        password: formData.password,
      });

      if (res?.data?.code === 200) {
        setSuccess('密码重置成功 ✓');
        await onSubmit?.(res.data);
      } else {
        setErrors((prev) => ({
          ...prev,
          submit: res?.data?.message || '密码重置失败',
        }));
      }
    } catch (error) {
      console.error(error);
      setErrors((prev) => ({
        ...prev,
        submit: '密码重置失败，请稍后重试',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`
        space-y-4
        ${errors.submit ? 'animate-shake' : ''}
      `}
    >
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
          setErrors((prev) => ({ ...prev, email: '', submit: '' }));
          setSuccess('');
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
        <div className="flex gap-3 items-end">
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
              font-black text-sm
              bg-yellow-400
              border-2 border-black
              shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
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

      {/* 提交错误 */}
      {errors.submit && (
        <div
          className="
            border-2 border-black
            bg-red-200
            px-3 py-2
            text-center
            font-black
            text-red-700
            shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
          "
        >
          {errors.submit}
        </div>
      )}

      {/* 成功 */}
      {success && (
        <div
          className="
            border-2 border-black
            bg-green-200
            px-3 py-2
            text-center
            font-black
            text-green-700
            shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
          "
        >
          {success}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3
          font-black text-white
          bg-yellow-500
          border-2 border-black
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
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
