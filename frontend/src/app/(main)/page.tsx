'use client';

import HomeHero from '@/components/home/HomeHero';
import HomeCourses from '@/components/home/HomeCourses';
import HomeMyInfo from '@/components/home/HomeMyInfo';
import HomeMyCourses from '@/components/home/HomeMyCourses';
export default function Home() {
 
  return (
    <main className="container mx-auto px-4">
      {/* Hero Section */}
      <HomeHero />
      <div className="flex justify-between items-center my-8">
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
