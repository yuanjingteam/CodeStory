'use client';
import Link from 'next/link';
import React from 'react';
import { IoArrowBack } from 'react-icons/io5';
import UserMenu from './UserMenu';

const AdminHeader: React.FC = () => {
  return (
    <header className="h-[62px] relative z-20 flex-shrink-0">
      <div className="h-full border-b-2 border-black bg-purple-400">
        <div className="h-full bg-gradient-to-r from-purple-300 to-purple-700">
          <div className="h-full flex items-center justify-between gap-3 px-3 md:px-6">
            <Link
              href="/"
              className="flex min-w-0 items-center space-x-3 font-black text-black"
            >
              <div className="rounded-sm border-2 border-black px-2 py-1 bg-white shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100">
                <IoArrowBack size={28} />
              </div>
              <span className="truncate text-lg tracking-wide">后台管理</span>
            </Link>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
