'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/auth/Login';
import RegisterForm from '@/components/auth/Register';

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
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#07C160">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c4.801 0 8.692-3.287 8.692-7.342 0-4.054-3.891-7.339-8.692-7.339zm-3.12 4.213a.947.947 0 110-1.894.947.947 0 010 1.894zm3.12 0a.947.947 0 110-1.894.947.947 0 010 1.894zm3.12 0a.947.947 0 110-1.894.947.947 0 010 1.894z" />
            </svg>
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
