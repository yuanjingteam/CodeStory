'use client';
import { useState, useEffect } from 'react';
import { Course } from 'shared/types/home-courses';
import { getHomeCourses } from '@/api/home';
import Img from 'next/image';
import { useRouter } from 'next/navigation';
import { courseLevelMap } from '@/utils/constants'; 

export default function HomeCourses() {
  const [homeCourses, setHomeCourses] = useState<Course[]>([]);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const router = useRouter();



  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await getHomeCourses();
        setHomeCourses(res.data);
      } catch (err) {
        console.error('获取热门课程失败', err);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {homeCourses.map((course) => (
        <div
          key={course.id}
          className={`relative bg-white border-2 border-black p-4 cursor-pointer transition-all duration-200 ${
            hoveredCourse === course.id
              ? 'translate-x-[4px] translate-y-[4px] shadow-none'
              : 'shadow-[4px_4px_0_0_rgba(0,0,0,1)]'
          }`}
          onMouseEnter={() => setHoveredCourse(course.id)}
          onClick={() => router.push(`/courses/${course.id}`)}
          onMouseLeave={() => setHoveredCourse(null)}
        >
          <div
            className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-black text-white border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${courseLevelMap[course.level].color || 'bg-gray-500 text-gray-700'}`}
          >
            {courseLevelMap[course.level].text || '未知'}
          </div>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-20 h-20 bg-gray-100 border-2 border-black  flex items-center justify-center">
              <Img
                src={course.cover_url}
                alt={course.title}
                width={50}
                height={50}
                className="w-full h-full"
                unoptimized
              />
            </div>
            <div className="flex-1 flex flex-col justify-between items-between">
              <h3 className="font-black text-black text-sm">{course.title}</h3>
              <p className="text-xs text-gray-500">{course.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-bold">
              进度{' '}
              {`${((course.completed_lessons / course.total_lessons) * 100).toFixed(2)}%`}
            </span>
          </div>

          <div className="w-full bg-gray-200 h-2 border-2 border-black rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-300`}
              style={{
                width: `${(course.completed_lessons / course.total_lessons) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
