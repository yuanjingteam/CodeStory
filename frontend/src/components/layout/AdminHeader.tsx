import Link from 'next/link';
import React from 'react';
import { IoArrowBack } from 'react-icons/io5';

const AdminHeader: React.FC = () => {
  return (
    <header className="h-[62px] relative z-5 flex-shrink-0">
      <div className="h-full border-b-2 border-black bg-purple-400">
        <div className="h-full bg-gradient-to-r from-purple-300 to-purple-700">
          <div className="h-full max-w-7xl mx-auto flex items-center justify-between px-6">
            <div className="flex items-center space-x-10">
              <Link
                href="/"
                className="flex items-center space-x-3 font-black text-black"
              >
                <div className="rounded-sm border-2 border-black px-2 py-1 bg-white shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100">
                  <IoArrowBack size={28} />
                </div>
                <span className="text-lg tracking-wide">后台管理</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
