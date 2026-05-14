'use client';
import { LuArrowRight } from 'react-icons/lu';
import HomeHero from '@/components/home/HomeHero';
import HomeCourses from '@/components/home/HomeCourses';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const courses = [
  {
    id: 1,
    title: 'Python 入门到精通',
    description: '从零基础到项目实战',
    icon: 'python',
    level: '初级',
    levelColor: 'bg-green-500',
    progress: 65,
  },
  {
    id: 2,
    title: 'JavaScript 核心进阶',
    description: '深入理解 JS 核心概念',
    icon: 'javascript',
    level: '中级',
    levelColor: 'bg-green-500',
    progress: 40,
  },
  {
    id: 3,
    title: 'React 实战开发',
    description: '构建现代化 React 应用',
    icon: 'react',
    level: '中级',
    levelColor: 'bg-green-500',
    progress: 20,
  },
  {
    id: 4,
    title: 'Node.js 后端开发',
    description: '从基础到企业级应用',
    icon: 'nodejs',
    level: '高级',
    levelColor: 'bg-red-500',
    progress: 10,
  },
];

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    const token = localStorage.getItem('code-story-token');
  if(!token) {
    return router.replace('/auth/login');
  }
}, []);
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HomeHero />
      {/* Courses Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-black">热门课程</h2>
            <button className="flex items-center gap-2 text-purple-600 font-bold hover:underline">
              查看全部 <LuArrowRight className="w-4 h-4" />
            </button>
          </div>
          <HomeCourses courses={courses} />
        </div>
      </section>
    </main>
  );
}
