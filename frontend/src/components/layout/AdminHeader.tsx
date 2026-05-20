import Link from 'next/link';
import React from 'react';
import { IoArrowBack } from 'react-icons/io5';

const AdminHeader: React.FC = () => {
  return (
    <header className="bg-[#f5f5f5] p-3 relative z-5">
      <div className="border-4 border-black bg-purple-400 shadow-[6px_6px_0px_#000]">
        <div className="bg-gradient-to-r from-purple-300 to-purple-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-10">
              <Link
                href="/"
                className="flex items-center space-x-3 font-black text-black"
              >
                <div className="border-2 border-black px-2 py-1 bg-white shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100">
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
