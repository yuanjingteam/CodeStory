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
      <div className="absolute top-1/3 left-10 w-20 h-20 bg-yellow-300 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[8px] hover:translate-y-[8px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute bottom-1/3 right-10 w-16 h-16 bg-green-500 border-4 border-black rotate-45 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[8px] hover:translate-y-[8px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute top-20 right-1/4 w-6 h-6 bg-purple-500 border-2 border-black rounded-full shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute bottom-20 left-1/4 w-8 h-8 bg-green-400 border-2 border-black rounded-full shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute top-1/2 right-20 w-4 h-4 bg-yellow-400 border-2 border-black rounded-full shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute top-28 left-1/4 w-12 h-12 bg-yellow-400 border-4 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="absolute bottom-28 right-1/4 w-10 h-10 bg-purple-500 border-4 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none transition-all duration-300 cursor-pointer" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {children}
      </div>
    </div>
  );
}
