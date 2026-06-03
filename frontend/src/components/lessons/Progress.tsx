import type { CourseInfo } from '@/types/lesson-detail';

interface ProgressProps {
  data?: CourseInfo;
}

export default function Progress({ data }: ProgressProps) {
  const course = data || {
    id: 'course_id',
    title: 'Python入门核心课',
    progress: 45,
  };

  return (
    <div className="bg-purple-600 p-4 relative z-10 opacity-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-lg">{course.title}</h2>
        <span className="bg-green-500 rounded-lg border-2 border-black px-3 py-1 text-white text-sm font-bold rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
          学习中
        </span>
      </div>

      {/* 进度文字 */}
      <div className="text-white text-sm mb-2">进度 {course.progress}%</div>

      {/* 进度条 */}
      <div className="h-5 bg-black border-2 border-black rounded-sm overflow-hidden">
        <div 
          className="h-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${course.progress}%` }}
        />
      </div>
    </div>
  );
}
