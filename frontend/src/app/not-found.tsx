'use client';
import Link from 'next/link';
import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-black text-black mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">页面未找到</h2>
        <p className="text-gray-600 mb-8">抱歉，您访问的页面不存在</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-yellow-400 border-4 border-black font-bold shadow-[4px_4px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-100 relative z-10"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
