'use client';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import AuthBackground from '@/components/auth/AuthBackground';

export default function AuthPage() {
  const params = useParams();
  const mode = params.mode as string;

  if (!['login', 'register', 'forgot-password'].includes(mode)) {
    notFound();
  }

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
          subtitle: '加入 CodeStory，开启你的编程之旅',
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
              className="ml-1 font-bold text-zinc-800 underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
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
              className="ml-1 font-bold text-zinc-800 underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
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
              className="ml-1 font-bold text-zinc-800 underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
            >
              返回登录
            </Link>
          </p>
        );
      default:
        return (
          <p className="mt-4 text-center text-sm">
            还没有账号？
            <Link
              href="/auth/register"
              className="ml-1 font-bold text-zinc-800 underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
            >
              立即注册
            </Link>
          </p>
        );
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-zinc-50 px-4 py-6 sm:px-6 md:flex md:items-center md:justify-center md:py-8">
      {/* 色块 */}
      <AuthBackground />
      {/* 表单内容（居中） */}
      <div className="relative z-10 mx-auto w-full max-w-[450px] border-2 border-black bg-white px-4 py-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:px-8 sm:py-8 md:mx-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-black">{pageInfo.title}</h1>
            <p className="text-sm text-gray-600">{pageInfo.subtitle}</p>
          </div>
          <Link
            href="/"
            className="border-2 border-black bg-white px-3 py-1 text-sm font-bold text-zinc-950 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-[transform,box-shadow,background-color] duration-150 hover:bg-zinc-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
          >
            回首页
          </Link>
        </div>
        {renderForm()}
        {renderFooter()}
      </div>
    </main>
  );
}
