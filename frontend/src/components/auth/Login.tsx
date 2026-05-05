'use client';
import { useState } from 'react';
import { LoginRequest } from 'shared/types/auth';
import { login } from '@/app/api/auth/auth';

interface LoginFormProps {
  onSubmit?: (data: LoginRequest) => void;
}

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [loginInput, setLoginInput] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await login(loginInput);
      if (res) {
        await onSubmit?.(res.data);
      }
      if (res.data.code === 200) {
        alert('登录成功');
      }
    } catch (error) {
      console.error(error);
      alert('登录失败');
         }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm font-bold text-gray-700 mb-1">邮箱</label>
      <div className="relative">
        <input
          type="email"
          value={loginInput.email}
          onChange={(e) =>
            setLoginInput({ ...loginInput, email: e.target.value })
          }
          placeholder="请输入邮箱地址"
          className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="relative">
        <label className="block text-sm font-bold text-gray-700 mb-1">
          密码
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={loginInput.password}
            onChange={(e) =>
              setLoginInput({ ...loginInput, password: e.target.value })
            }
            placeholder="请输入密码"
            className="w-full px-4 py-3 pr-12 border-2 border-black focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {showPassword ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              )}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 border-2 border-black rounded-none focus:ring-0"
          />
          <span className="text-sm font-bold text-gray-700">记住我</span>
        </label>
        <a
          href="#"
          className="text-sm font-bold text-purple-600 hover:underline"
        >
          忘记密码？
        </a>
      </div>
      <button
        type="submit"
        className="w-full py-3 font-black text-white bg-purple-500 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
      >
        登录
      </button>
    </form>
  );
}
