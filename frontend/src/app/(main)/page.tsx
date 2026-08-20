'use client';

import HomeHero from '@/components/home/HomeHero';
import HomeCourses from '@/components/home/HomeCourses';
import HomeMyInfo from '@/components/home/HomeMyInfo';
import HomeMyCourses from '@/components/home/HomeMyCourses';
export default function Home() {
  return (
    <main className="z-10 mx-auto flex w-full max-w-[1400px] flex-col bg-white px-4 md:px-8">
      {/* Hero Section */}
      <HomeHero />
      <div className="flex flex-col items-stretch justify-between gap-6 lg:flex-row">
        {/* my Info */}
        <HomeMyInfo />
        {/* my study */}
        <HomeMyCourses />
      </div>
      {/* Courses Section */}
      <HomeCourses />
    </main>
  );
}
