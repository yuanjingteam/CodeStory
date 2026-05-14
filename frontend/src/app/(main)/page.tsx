'use client';
import { LuArrowRight } from 'react-icons/lu';
import HomeHero from '@/components/home/HomeHero';
import HomeCourses from '@/components/home/HomeCourses';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export default function Home() {
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
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HomeHero />
      {/* Courses Section */}
      <section className="py-6 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-black">热门课程</h2>
            <button
              className="flex items-center gap-1 text-purple-600 font-bold hover:underline text-sm"
              onClick={() => router.push('/courses')}
            >
              查看全部 <LuArrowRight className="w-4 h-4" />
            </button>
          </div>
          <HomeCourses />
        </div>
      </section>
    </main>
  );
}
