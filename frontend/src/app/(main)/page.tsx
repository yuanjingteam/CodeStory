'use client';

import HomeHero from '@/components/home/HomeHero';
import HomeCourses from '@/components/home/HomeCourses';
import HomeMyInfo from '@/components/home/HomeMyInfo';
import HomeMyCourses from '@/components/home/HomeMyCourses';
export default function Home() {
 
  return (
    <main>
      {/* Hero Section */}
      <HomeHero />
      <div className="flex justify-between items-center my-4">
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
