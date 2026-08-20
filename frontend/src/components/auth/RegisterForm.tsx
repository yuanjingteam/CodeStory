'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { RegisterRequest } from '@/types/auth';
import {
  getAuthErrorDetails,
  getEmailCaptcha,
  register,
} from '@/api/auth/auth';
import FormInput from './FormInput';
import type { ValidateResult } from '@/utils/validate';
import {
  validateEmail,
  validatePassword,
  validateNickname,
  validateConfirmPassword,
  validateEmailCode,
} from '@/utils/validate';
import { useEmailCode } from '@/hooks/auth/useEmailCode';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

const STORAGE_KEY = 'registerfrom';

interface RegisterStorage {
  email: string;
  nickname: string;
}
interface RegisterErrors {
  nickname?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  emailCode?: string;
}

type FieldStatus = 'success' | 'error' | null;

export default function RegisterForm() {
  const getInitialRegisterInput = (): RegisterRequest => {
    if (typeof window === 'undefined') {
      return {
        nickname: '',
        email: '',
        password: '',
        emailCode: '',
      };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: RegisterStorage = JSON.parse(stored);
        return {
          nickname: parsed.nickname || '',
          email: parsed.email || '',
          password: '',
          emailCode: '',
        };
      }
    } catch (e) {
      console.error('Failed to parse register storage:', e);
    }
    return {
      nickname: '',
      email: '',
      password: '',
      emailCode: '',
    };
  };

  const [registerInput, setRegisterInput] = useState<RegisterRequest>(
    getInitialRegisterInput
  );

  useEffect(() => {
    const storageData: RegisterStorage = {
      email: registerInput.email,
      nickname: registerInput.nickname,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
  }, [registerInput.email, registerInput.nickname]);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmShowPassword, setConfirmShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const router = useRouter();

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
    validateEmailCode
  );
  const {
    countdown,
    loading: sendingCode,
    sendCode,
    isCounting,
    resetCountdown,
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
        const res = await getEmailCaptcha({ email: registerInput.email });
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
    const emailCodeResult = validateEmailCode(registerInput.emailCode);
    const newErrors: RegisterErrors = {
      nickname: nicknameResult.isValid ? '' : nicknameResult.message,
      email: emailResult.isValid ? '' : emailResult.message,
      password: passwordResult.isValid ? '' : passwordResult.message,
      confirmPassword: confirmPasswordResult.isValid
        ? ''
        : confirmPasswordResult.message,
      emailCode: emailCodeResult.isValid ? '' : emailCodeResult.message,
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
    if (!validateForm()) {
      return;
    }
    try {
      setLoading(true);
      const res = await register(registerInput);
      if (res.code === 200) {
        localStorage.removeItem(STORAGE_KEY);
        toast.success('注册成功');
        router.push('/auth/login');
      } 
    } catch (error) {
      const details = getAuthErrorDetails(error, '注册失败，请稍后重试');
      toast.error(details.message);
      if (details.errorCode === 'AUTH_EMAIL_EXISTS') {
        setTouched((prev) => ({ ...prev, email: true }));
        setErrors((prev) => ({ ...prev, email: details.message }));
      } else if (details.errorCode?.includes('EMAIL_CODE')) {
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
      {/* 昵称 */}
      <FormInput
        label="昵称"
        name="nickname"
        autoComplete="nickname"
        required
        value={registerInput.nickname}
        placeholder="请输入昵称"
        touched={touched.nickname}
        error={errors.nickname}
        success={nicknameStatus === 'success'}
        onChange={(value) => {
          setRegisterInput((prev) => ({ ...prev, nickname: value }));
          setErrors((prev) => ({ ...prev, nickname: '' }));
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
        name="email"
        type="email"
        autoComplete="username"
        required
        value={registerInput.email}
        placeholder="请输入邮箱地址"
        touched={touched.email}
        error={errors.email}
        success={emailStatus === 'success'}
        onChange={(value) => {
          setRegisterInput((prev) => ({
            ...prev,
            email: value,
            emailCode: '',
          }));
          setErrors((prev) => ({ ...prev, email: '', emailCode: '' }));
          setTouched((prev) => ({ ...prev, emailCode: false }));
          resetCountdown();
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <FormInput
              label="邮箱验证码"
              name="emailCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={registerInput.emailCode}
              placeholder="请输入邮箱验证码"
              touched={touched.emailCode}
              error={errors.emailCode}
              success={emailCodeStatus === 'success'}
              onChange={(value) => {
                setRegisterInput((prev) => ({ ...prev, emailCode: value }));
                setErrors((prev) => ({ ...prev, emailCode: '' }));
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, emailCode: true }));
                const result = validateEmailCode(registerInput.emailCode);
                setErrors((prev) => ({
                  ...prev,
                  emailCode: result.isValid ? '' : result.message,
                }));
              }}
            />
          </div>
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

      {/* 密码 */}
      <FormInput
        label="密码"
        name="password"
        autoComplete="new-password"
        required
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
        name="confirmPassword"
        autoComplete="new-password"
        required
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
          setErrors((prev) => ({
            ...prev,
            confirmPassword: touched.confirmPassword
              ? validateConfirmPassword(registerInput.password, value).message
              : '',
          }));
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

      {/* 注册按钮 */}
      <Button
        type="submit"
        variant="primary"
        loading={loading}
        loadingText="注册中..."
        fullWidth
      >
        注册
      </Button>
    </form>
  );
}
