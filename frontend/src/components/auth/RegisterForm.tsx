'use client';
import { useState } from 'react';
import type { RegisterRequest } from 'shared/types/auth';
import { register, getEmailCaptcha } from '@/api/auth/auth';
import FormInput from './FormInput';
import type { ValidateResult } from '@/utils/validate';
import {
  validateEmail,
  validatePassword,
  validateNickname,
  validateConfirmPassword,
  validateCode,
} from '@/utils/validate';
import { useEmailCode } from '@/hooks/auth/useEmailCode';
interface RegisterFormProps {
  onSubmit?: (data: RegisterRequest) => void;
}

interface RegisterErrors {
  nickname?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  emailCode?: string;
  submit?: string;
}

type FieldStatus = 'success' | 'error' | null;

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [registerInput, setRegisterInput] = useState<RegisterRequest>({
    nickname: '',
    email: '',
    password: '',
    emailCode: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmShowPassword, setConfirmShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({
    nickname: false,
    email: false,
    password: false,
    confirmPassword: false,
    emailCode: false,
  });

  const [errors, setErrors] = useState<RegisterErrors>({});
  const getFieldStatus = (
    field: keyof typeof touched,
    value: string,
    validator: (value: string) => ValidateResult
  ): FieldStatus => {
    if (!touched[field]) return null;
    const result = validator(value);
    return result.isValid ? 'success' : 'error';
  };

  const nicknameStatus = getFieldStatus(
    'nickname',
    registerInput.nickname,
    validateNickname
  );

  const emailStatus = getFieldStatus(
    'email',
    registerInput.email,
    validateEmail
  );

  const passwordStatus = getFieldStatus(
    'password',
    registerInput.password,
    validatePassword
  );

  const emailCodeStatus = getFieldStatus(
    'emailCode',
    registerInput.emailCode,
    validateCode
  );
  const {
    countdown,
    loading: sendingCode,
    sendCode,
    isCounting,
  } = useEmailCode({
    duration: 60,
    onSend: async () => {
      const emailResult = validateEmail(registerInput.email);
      if (!emailResult.isValid) {
        setErrors((prev) => ({ ...prev, email: emailResult.message }));
        setTouched((prev) => ({ ...prev, email: true }));
        throw new Error(emailResult.message);
      }
      try {
        await getEmailCaptcha({ email: registerInput.email });
      } catch (error) {
        console.error(error);
        setErrors((prev) => ({ ...prev, email: '获取验证码失败，请稍后重试' }));
        setTouched((prev) => ({ ...prev, email: true }));
        throw new Error('获取验证码失败，请稍后重试');
      }
    },
  });
  const confirmPasswordStatus = touched.confirmPassword
    ? validateConfirmPassword(registerInput.password, confirmPassword).isValid
      ? 'success'
      : 'error'
    : null;

  const validateForm = () => {
    const nicknameResult = validateNickname(registerInput.nickname);
    const emailResult = validateEmail(registerInput.email);
    const passwordResult = validatePassword(registerInput.password);
    const confirmPasswordResult = validateConfirmPassword(
      registerInput.password,
      confirmPassword
    );
    const emailCodeResult = validateCode(registerInput.emailCode);
    const newErrors: RegisterErrors = {
      nickname: nicknameResult.isValid ? '' : nicknameResult.message,
      email: emailResult.isValid ? '' : emailResult.message,
      password: passwordResult.isValid ? '' : passwordResult.message,
      confirmPassword: confirmPasswordResult.isValid
        ? ''
        : confirmPasswordResult.message,
      emailCode: emailCodeResult.isValid ? '' : emailCodeResult.message,
      submit: '',
    };
    setErrors(newErrors);
    setTouched({
      nickname: true,
      email: true,
      password: true,
      confirmPassword: true,
      emailCode: true,
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
      const res = await register(registerInput);
      if (res?.data?.code === 200 || res?.data?.code === 201) {
        setSuccess('注册成功 ✓');
        await onSubmit?.(res.data);
      } else {
        setErrors((prev) => ({
          ...prev,
          submit: res?.data?.message || '注册失败',
        }));
      }
    } catch (error) {
      console.error(error);
      setErrors((prev) => ({ ...prev, submit: '注册失败，请稍后重试' }));
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
      {/* 昵称 */}
      <FormInput
        label="昵称"
        value={registerInput.nickname}
        placeholder="请输入昵称"
        touched={touched.nickname}
        error={errors.nickname}
        success={nicknameStatus === 'success'}
        onChange={(value) => {
          setRegisterInput((prev) => ({ ...prev, nickname: value }));
          setErrors((prev) => ({ ...prev, nickname: '', submit: '' }));
          setSuccess('');
        }}
        onBlur={() => {
          setTouched((prev) => ({ ...prev, nickname: true }));
          const result = validateNickname(registerInput.nickname);
          setErrors((prev) => ({
            ...prev,
            nickname: result.isValid ? '' : result.message,
          }));
        }}
      />

      {/* 邮箱 */}
      <FormInput
        label="邮箱"
        type="email"
        value={registerInput.email}
        placeholder="请输入邮箱地址"
        touched={touched.email}
        error={errors.email}
        success={emailStatus === 'success'}
        onChange={(value) => {
          setRegisterInput((prev) => ({ ...prev, email: value }));
          setErrors((prev) => ({ ...prev, email: '', submit: '' }));
          setSuccess('');
        }}
        onBlur={() => {
          setTouched((prev) => ({ ...prev, email: true }));
          const result = validateEmail(registerInput.email);
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
              value={registerInput.emailCode}
              placeholder="请输入邮箱验证码"
              touched={touched.emailCode}
              error={errors.emailCode}
              success={emailCodeStatus === 'success'}
              onChange={(value) => {
                setRegisterInput((prev) => ({ ...prev, emailCode: value }));
                setErrors((prev) => ({ ...prev, emailCode: '' }));
              }}
            />
          </div>
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

      {/* 密码 */}
      <FormInput
        label="密码"
        value={registerInput.password}
        placeholder="请输入密码"
        touched={touched.password}
        error={errors.password}
        success={passwordStatus === 'success'}
        showPasswordToggle
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        onChange={(value) => {
          setRegisterInput((prev) => ({ ...prev, password: value }));
          setErrors((prev) => ({ ...prev, password: '', submit: '' }));
          setSuccess('');
        }}
        onBlur={() => {
          setTouched((prev) => ({ ...prev, password: true }));
          const result = validatePassword(registerInput.password);
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
        showPassword={confirmShowPassword}
        onTogglePassword={() => setConfirmShowPassword(!confirmShowPassword)}
        onChange={(value) => {
          setConfirmPassword(value);
          setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }}
        onBlur={() => {
          setTouched((prev) => ({ ...prev, confirmPassword: true }));
          const result = validateConfirmPassword(
            registerInput.password,
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

      {/* 注册成功 */}
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

      {/* 注册按钮 */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3
          font-black text-white
          bg-green-500
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
        {loading ? '注册中...' : '注册'}
      </button>
    </form>
  );
}
