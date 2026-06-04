'use client';
import Link from 'next/link';
import React from 'react';
import { useMemo, useRef } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from 'next/navigation';
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import Img from 'next/image';

const Header: React.FC = () => {
  const router = useRouter();
  const { user, clearUser, isLoading, isLoggedIn, getRoleByToken } =
    useUserStore();
  const isAdmin = useMemo(() => getRoleByToken() === 1, [getRoleByToken]);
  const handleLogout = async () => {
    clearUser();
    router.push('/');
  };
  const dropdownRef = useRef<HTMLDivElement>(null);
  return (
    <header className="h-[62px] relative z-20 flex-shrink-0">
      <div className="h-full border-b-2 border-black bg-yellow-400">
        <div className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500">
          <div className="h-full max-w-7xl mx-auto flex items-center justify-between px-6">
            <div className="flex items-center space-x-10">
              <Link
                href="/"
                className="flex items-center space-x-2 font-black text-black"
              >
                <div className="rounded-sm border-2 border-black px-2 py-1 bg-yellow-200 shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 cursor-pointer">
                  {'</>'}
                </div>
                <span className="text-lg tracking-wide">CODE STORY</span>
              </Link>
              <nav className="flex items-center space-x-8 text-black font-bold">
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
                  className="hover:underline underline-offset-4 decoration-2 decoration-black"
                >
                  关于我们
                </Link>
                {isAdmin && isLoggedIn && (
                  <Link
                    href="/users-manage"
                    className="hover:underline underline-offset-4 decoration-2 decoration-black"
                  >
                    后台管理
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center space-x-5">
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center space-x-2 px-2 py-1 ">
                  {isLoggedIn ? (
                    <div className="flex flex items-center space-x-1">
                      <div className=" rounded-full border-1 border-purple-300 overflow-hidden bg-gray-300 flex items-center justify-center">
                        {isLoading ? (
                          <span className="text-xs text-gray-500">...</span>
                        ) : (
                          <Img
                            src={user?.avatar || '/default-avatar.png'}
                            alt="avatar"
                            className="h-full w-full object-cover"
                            width={45}
                            height={45}
                            priority
                          />
                        )}
                      </div>
                      <span className="font-bold text-black text-sm min-w-[60px]">
                        {isLoading ? '...' : user?.nickname || 'UserName'}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="w-full flex justify-end items-center  hover:text-purple-500 cursor-pointer transition-all font-bold text-purple-700 "
                      >
                        <FiLogOut />
                        退出登录
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
