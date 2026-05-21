'use client';
import Link from 'next/link';
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from 'next/navigation';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { FiUser, FiLogOut } from 'react-icons/fi';
import Img from 'next/image';
const Header: React.FC = () => {
  const router = useRouter();
  const { user, clearUser, isLoading } = useUserStore();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === 1;
  const handleProfile = () => {
    router.push('/profile');
  };
  const handleLogout = async () => {
    clearUser();
    router.push('/auth/login');
  };
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <header className="bg-[#f5f5f5] p-3 relative z-20">
      <div className="border-4 border-black bg-yellow-400 shadow-[6px_6px_0px_#000]">
        <div className="bg-gradient-to-r from-yellow-300 to-yellow-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-10">
              <Link
                href="/"
                className="flex items-center space-x-2 font-black text-black"
              >
                <div className="border-2 border-black px-2 py-1 bg-yellow-200 shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 cursor-pointer">
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
                {isAdmin && (
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
                {/* 用户按钮 */}
                <button
                  className="flex items-center space-x-2 px-2 py-1 border-2 border-black bg-purple-500 shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 cursor-pointer"
                  onClick={() => setOpen(!open)}
                >
                  <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden bg-gray-300 flex items-center justify-center">
                    {isLoading ? (
                      <span className="text-xs text-gray-500">...</span>
                    ) : (
                      <Img
                        src={user?.avatar || '/default-avatar.png'}
                        alt="avatar"
                        className="h-full w-full object-cover"
                        width={28}
                        height={28}
                        priority
                      />
                    )}
                  </div>

                  <span className="font-bold text-black text-sm min-w-[60px]">
                    {isLoading ? '...' : user?.nickname || 'UserName'}
                  </span>

                  {open ? (
                    <IoChevronUp className="h-3 w-3 text-black" />
                  ) : (
                    <IoChevronDown className="h-3 w-3 text-black" />
                  )}
                </button>

                {/* 下拉菜单 */}
                {open && (
                  <div className="absolute top-full right-0 mt-2 w-44 border-2 border-black bg-white shadow-[4px_4px_0px_#000] z-50 hover:translate-y-[2px] hover:shadow-none transition-all duration-100">
                    <button
                      onClick={handleProfile}
                      className="w-full flex items-center gap-2 px-4 py-3 border-b-2 border-black hover:bg-yellow-300 cursor-pointer transition-all font-bold text-black"
                    >
                      <FiUser />
                      个人中心
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-300 cursor-pointer transition-all font-bold text-black"
                    >
                      <FiLogOut />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
