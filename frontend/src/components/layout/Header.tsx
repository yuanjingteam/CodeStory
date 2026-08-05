'use client';
import Link from 'next/link';
import React from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from 'next/navigation';
import { FiLogIn } from 'react-icons/fi';
import UserMenu from './UserMenu';

const Header: React.FC = () => {
  const router = useRouter();
  const { user, isLoggedIn } = useUserStore();
  const canManage = isLoggedIn && user?.role === 1;
  return (
    <header className="h-[62px] relative z-20 flex-shrink-0">
      <div className="h-full border-b-2 border-black bg-yellow-400">
        <div className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500">
          <div className="flex h-full items-center justify-between gap-2 px-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3 md:gap-10">
              <Link
                href="/"
                className="flex items-center space-x-2 font-black text-black"
              >
                <div className="rounded-sm border-2 border-black px-2 py-1 bg-yellow-200 shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 cursor-pointer">
                  {'</>'}
                </div>
                <span className="hidden text-lg tracking-wide sm:inline">
                  CODE STORY
                </span>
              </Link>
              <nav className="flex items-center gap-3 font-bold text-black md:gap-8">
                <Link
                  href="/"
                  className="hover:underline underline-offset-4 decoration-2 decoration-black"
                >
                  首页
                </Link>
                <Link
                  href="/courses"
                  className="hover:underline underline-offset-4 decoration-2 decoration-black"
                >
                  课程
                </Link>
                <Link
                  href="/about"
                  className="hidden hover:underline underline-offset-4 decoration-2 decoration-black md:inline"
                >
                  关于我们
                </Link>
                {canManage && (
                  <Link
                    href="/users-manage"
                    className="hidden hover:underline underline-offset-4 decoration-2 decoration-black md:inline"
                  >
                    后台管理
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex shrink-0 items-center px-2 py-1">
              {isLoggedIn ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => router.push('/auth/login')}
                  className="flex min-h-10 cursor-pointer items-center gap-1 font-bold text-purple-700 transition-all hover:text-purple-500"
                >
                  登录
                  <FiLogIn />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
