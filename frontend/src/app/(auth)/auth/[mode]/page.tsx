'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/auth/Login';
import RegisterForm from '@/components/auth/Register';
import { IoLogoWechat } from 'react-icons/io5';

export default function AuthPage() {
  const params = useParams();
  const router = useRouter();
  const mode = params.mode as 'login' | 'register';

  if (!['login', 'register'].includes(mode)) {
    router.push('/not-found');
    return null;
  }

  return (
    <div className="w-[420px]">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-black">
              {mode === 'login' ? 'WELCOME BACK!' : 'CREATE ACCOUNT'}
            </h1>
            <p className="text-sm text-gray-600">
              {mode === 'login'
                ? '登录你的账号，继续学习编程'
                : '加入 Code Learns，开启你的编程之旅'}
            </p>
          </div>
          <div
            className={`px-4 py-1 border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none duration-200 font-bold text-sm ${
              mode === 'login'
                ? 'bg-purple-500 text-white'
                : 'bg-green-500 text-white'
            } shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}
          >
            {mode === 'login' ? '登录' : '注册'}
          </div>
        </div>
        {mode === 'login' ? <LoginForm /> : <RegisterForm />}

        <div className="my-4 flex items-center">
          <div className="flex-1 border-t-2 border-black"></div>
          <span className="px-4 text-sm font-bold text-gray-500">
            或者使用以下方式登录
          </span>
          <div className="flex-1 border-t-2 border-black"></div>
        </div>

        <div className="flex space-x-3">
          <button className="flex-1 py-2 bg-white border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 flex items-center justify-center space-x-2">
            <IoLogoWechat className="w-5 h-5" />
            <span className="font-bold text-sm">微信</span>
          </button>
        </div>

        <p className="mt-4 text-center text-sm">
          {mode === 'login' ? (
            <>
              还没有账号？
              <Link
                href="/auth/register"
                className="font-bold text-purple-600 hover:underline ml-1"
              >
                立即注册
              </Link>
            </>
          ) : (
            <>
              已有账号？
              <Link
                href="/auth/login"
                className="font-bold text-green-600 hover:underline ml-1"
              >
                立即登录
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
