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
                {canManage && (
                  <Link
                    href="/users-manage"
                    className="hover:underline underline-offset-4 decoration-2 decoration-black"
                  >
                    后台管理
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center ">
              <div className="relative" ref={dropdownRef}>
                <div className="px-2 py-1 ">
                  {isLoggedIn ? (
                    <div className="flex  justify-center items-center  gap-2">
                      <div className=" relative w-8 h-8 rounded-full overflow-hidden border-1 border-purple-300">
                        <Img
                          src={user?.avatar || '/default-avatar.png'}
                          alt="avatar"
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="font-bold text-black text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-[60px] max-w-[100px] mr-2">
                        {isLoading ? '...' : user?.nickname || 'UserName'}
                      </div>
                      <Link href="/profile" className="font-bold text-purple-700 hover:underline">个人中心</Link>
                      <button
                        onClick={handleLogout}
                        className=" flex justify-end items-center  hover:text-purple-500 cursor-pointer transition-all font-bold text-purple-700 "
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
