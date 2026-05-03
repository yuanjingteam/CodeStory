// d:\learningforever\front-end\agent\CodeStory\frontend\src\components\layout\Header.tsx
import Link from 'next/link';
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-yellow-400 border-b-4 border-black shadow-neo-brutalism relative z-10">
      <div className="container mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 p-2 border-2 border-black bg-white shadow-neo-brutalism-sm">
          <span className="text-2xl font-bold text-black">{'</>'}</span>
          <span className="text-xl font-bold text-black">CODE LEARN</span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex space-x-8">
          <Link href="/" className="text-lg font-bold text-black hover:underline underline-offset-4 decoration-4 decoration-black">
            首页
          </Link>
          <Link href="/courses" className="text-lg font-bold text-black hover:underline underline-offset-4 decoration-4 decoration-black">
            课程
          </Link>
          <Link href="/about" className="text-lg font-bold text-black hover:underline underline-offset-4 decoration-4 decoration-black">
            关于我们
          </Link>
        </nav>

        {/* Right Section: Notifications and User */}
        <div className="flex items-center space-x-6">
          {/* Notification Icon */}
          <div className="relative p-2 border-2 border-black bg-white shadow-neo-brutalism-sm cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-black"
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
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-black">
              3
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-2 p-2 border-2 border-black bg-white shadow-neo-brutalism-sm cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              U
            </div>
            <span className="text-lg font-bold text-black">UserName</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;