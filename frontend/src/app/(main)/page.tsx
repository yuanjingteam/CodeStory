'use client';
import { LuArrowRight } from 'react-icons/lu';
import HomeHero from '@/components/home/HomeHero';
import HomeCourses from '@/components/home/HomeCourses';
import { useRouter } from 'next/navigation';


export default function Home() {
  const router = useRouter();


  return (
    <main>
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
