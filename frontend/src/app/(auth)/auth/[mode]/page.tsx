'use client';
import {  useParams } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function AuthPage() {
  const params = useParams();
  const mode = params.mode as
    | 'login'
    | 'register'
    | 'forgot-password'
    | 'reset-password';

  const getPageTitle = () => {
    switch (mode) {
      case 'login':
        return {
          title: 'WELCOME BACK!',
          subtitle: '登录你的账号，继续学习编程',
          label: '登录',
          color: 'bg-purple-500',
        };
      case 'register':
        return {
          title: 'CREATE ACCOUNT',
          subtitle: '加入 Code Learns，开启你的编程之旅',
          label: '注册',
          color: 'bg-green-500',
        };
      case 'forgot-password':
        return {
          title: 'FORGOT PASSWORD',
          subtitle: '输入邮箱，找回你的密码',
          label: '找回密码',
          color: 'bg-yellow-500',
        };
      default:
        return {
          title: 'WELCOME BACK!',
          subtitle: '登录你的账号，继续学习编程',
          label: '登录',
          color: 'bg-purple-500',
        };
    }
  };

  const pageInfo = getPageTitle();
  const renderForm = () => {
    switch (mode) {
      case 'login':
        return <LoginForm />;
      case 'register':
        return <RegisterForm />;
      case 'forgot-password':
        return <ForgotPasswordForm />;
      default:
        return <LoginForm />;
    }
  };
  const renderFooter = () => {
    switch (mode) {
      case 'login':
        return (
          <p className="mt-4 text-center text-sm">
            还没有账号？
            <Link
              href="/auth/register"
              className="font-bold text-green-600 hover:underline ml-1"
            >
              立即注册
            </Link>
          </p>
        );
      case 'register':
        return (
          <p className="mt-4 text-center text-sm">
            记得密码了？
            <Link
              href="/auth/login"
              className="font-bold text-purple-600 hover:underline ml-1"
            >
              返回登录
            </Link>
          </p>
        );
      case 'forgot-password':
        return (
          <p className="mt-4 text-center text-sm">
            记得密码了？
            <Link
              href="/auth/login"
              className="font-bold text-purple-600 hover:underline ml-1"
            >
              返回登录
            </Link>
          </p>
        );
    }
  };

  return (
    <div className="w-[420px]">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-black">{pageInfo.title}</h1>
            <p className="text-sm text-gray-600">{pageInfo.subtitle}</p>
          </div>
          <div
            className={`px-4 py-1 border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-200 font-bold text-sm text-white ${pageInfo.color} shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}
          >
            {pageInfo.label}
          </div>
        </div>
        {renderForm()}
        {renderFooter()}
      </div>
    </div>
  );
}
