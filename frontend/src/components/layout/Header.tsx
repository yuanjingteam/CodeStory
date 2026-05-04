import Link from 'next/link';
import React from 'react';

const Header: React.FC = () => {
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
                <Link
                  href="/admin"
                  className="hover:underline underline-offset-4 decoration-2 decoration-black"
                >
                  后台管理
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-5">
              <div className="relative p-1.5 border-2 border-black bg-white shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-black">
                  3
                </span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1 border-2 border-black bg-white shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 cursor-pointer">
                <div className="h-7 w-7 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold border-2 border-black">
                  U
                </div>
                <span className="font-bold text-black text-sm">UserName</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
