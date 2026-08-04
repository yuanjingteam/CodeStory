'use client';
import Link from 'next/link';
import React from 'react';
import { useRef } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from 'next/navigation';
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import Img from 'next/image';
import { logout } from '@/api/auth/auth';

const Header: React.FC = () => {
  const router = useRouter();
  const { user, clearUser, isLoading, isLoggedIn } = useUserStore();
  const canManage = isLoggedIn && user?.role === 1;
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearUser();
      router.push('/');
    }
  };
  const dropdownRef = useRef<HTMLDivElement>(null);
  return (
    <header className="h-[62px] relative z-20 flex-shrink-0">
      <div className="h-full border-b-2 border-black bg-yellow-400">
        <div className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 md:px-6">
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
                    className="hidden hover:underline underline-offset-4 decoration-2 decoration-black lg:inline"
                  >
                    后台管理
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex shrink-0 items-center">
              <div className="relative" ref={dropdownRef}>
                <div className="px-2 py-1 ">
                  {isLoggedIn ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative h-8 w-8 overflow-hidden rounded-full border border-black">
                        <Img
                          src={user?.avatar || '/default-avatar.png'}
                          alt="avatar"
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mr-2 hidden min-w-[60px] max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-black md:block">
                        {isLoading ? '...' : user?.nickname || 'UserName'}
                      </div>
                      <Link
                        href="/profile"
                        className="hidden font-bold text-purple-700 hover:underline sm:inline"
                      >
                        个人中心
                      </Link>
                      <button
                        onClick={handleLogout}
                        aria-label="退出登录"
                        className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center font-bold text-purple-700 transition-all hover:text-purple-500"
                      >
                        <FiLogOut />
                        <span className="hidden lg:inline">退出登录</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push('/auth/login')}
                      className="w-full flex justify-end items-center  hover:text-purple-500 cursor-pointer transition-all font-bold text-purple-700 "
                    >
                      登录
                      <FiLogIn />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
