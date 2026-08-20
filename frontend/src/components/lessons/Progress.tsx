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
  const progress = Math.min(Math.max(course.progress, 0), 100);
  const isCompleted = progress >= 100;

  return (
    <div className="bg-purple-600 p-4 relative z-10 opacity-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold text-lg">{course.title}</h2>
        <span className="rounded-lg border-2 border-black bg-green-500 px-3 py-1 text-sm font-bold text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
          {isCompleted ? '已完成' : '学习中'}
        </span>
      </div>

      {/* 进度文字 */}
      <div className="mb-2 text-sm text-white" id={`course-progress-${course.id}`}>进度 {progress}%</div>

      {/* 进度条 */}
      <div
        className="h-5 overflow-hidden rounded-sm border-2 border-black bg-black"
        role="progressbar"
        aria-labelledby={`course-progress-${course.id}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div 
          className="h-full bg-yellow-400"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
