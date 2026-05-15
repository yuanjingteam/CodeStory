'use client';
import React from 'react';
import Header from '@/components/layout/Header';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
  }) {
    const router = useRouter();
    const { initUser, isLoggedIn, isLoading } = useUserStore();
  
    useEffect(() => {
      initUser();
    }, [initUser]);
  
    useEffect(() => {
      if (!isLoading && !isLoggedIn) {
        router.replace('/auth/login');
      }
    }, [isLoggedIn, isLoading, router]);
  
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      );
    }
    if (!isLoggedIn) {
      return null;
    }
  
  
  return (
    < >
      <Header />
      {children}
    </>
  );
}
