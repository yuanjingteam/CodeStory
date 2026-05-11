'use client';
import { useState } from 'react';
import { FaPython , FaReact, FaNodeJs,  } from 'react-icons/fa';
import { IoLogoJavascript, IoLogoCodepen } from 'react-icons/io';
import { HomeCoursesProps } from 'shared/types/home-courses';



const IconComponent = ({ icon }: { icon: string }) => {
  switch (icon) {
    case 'python':
      return <FaPython className="w-8 h-8 text-yellow-600" />;
    case 'javascript':
      return <IoLogoJavascript className="w-8 h-8 text-yellow-500" />;
    case 'react':
      return <FaReact className="w-8 h-8 text-cyan-500" />;
    case 'nodejs':
      return <FaNodeJs className="w-8 h-8 text-green-600" />;
    default:
      return <IoLogoCodepen className="w-8 h-8 text-gray-600" />;
  }
};

export default function HomeCourses({ courses }: HomeCoursesProps) {
  const [hoveredCourse, setHoveredCourse] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className={`relative bg-white border-2 border-black p-4 cursor-pointer transition-all duration-200 ${
            hoveredCourse === course.id
              ? 'translate-x-[4px] translate-y-[4px] shadow-none'
              : 'shadow-[4px_4px_0_0_rgba(0,0,0,1)]'
          }`}
          onMouseEnter={() => setHoveredCourse(course.id)}
          onMouseLeave={() => setHoveredCourse(null)}
        >
          <div
            className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-black text-white border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${course.levelColor}`}
          >
            {course.level}
          </div>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-100 border-2 border-black rounded-lg flex items-center justify-center">
              <IconComponent icon={course.icon} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-black text-sm">{course.title}</h3>
              <p className="text-xs text-gray-500">{course.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-bold">进度 {course.progress}%</span>
          </div>

          <div className="w-full bg-gray-200 h-2 border-2 border-black rounded overflow-hidden">
            <div
              className={`h-full ${course.levelColor} transition-all duration-300`}
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
