import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute bottom-100 right-170 w-230 h-130 bg-green-400 border-4 border-black -rotate-8  shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-x-[8px] hover:translate-y-[8px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute bottom-95 left-170 w-230 h-130 bg-purple-500 border-4 border-black rotate-12  shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute top-105 right-170 w-230 h-130 bg-yellow-400 border-4 border-black -rotate-2  shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute top-110 left-170 w-220 h-130 bg-blue-400 border-4 border-black rotate-8  shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-x-[8px] hover:translate-y-[16px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {children}
      </div>
    </div>
  );
}
