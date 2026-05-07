import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute top-0 left-0 w-48 h-48 bg-purple-500 border-4 border-black -rotate-6 -translate-x-1/4 -translate-y-1/4 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-x-[16px] hover:translate-y-[16px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 border-4 border-black rotate-12 translate-x-1/4 -translate-y-1/4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-[12px] hover:translate-y-[12px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute bottom-0 left-0 w-64 h-16 bg-yellow-400 border-4 border-black -rotate-3 translate-y-1/4 -translate-x-1/4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[8px] hover:translate-y-[8px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-600 border-4 border-black rotate-12 translate-x-1/4 translate-y-1/4 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-x-[16px] hover:translate-y-[16px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {children}
      </div>
    </div>
  );
}
