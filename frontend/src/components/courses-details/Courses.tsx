'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import courseApi from '@/app/api/courses/courses';
import type { Course } from '@/types/course';

const levelConfig: Record<number, { text: string; color: string }> = {
  0: { text: '初级', color: 'bg-green-300' },
  1: { text: '中级', color: 'bg-green-300' },
  2: { text: '高级', color: 'bg-pink-300' },
};

const learnStatusConfig: Record<number, { text: string; color: string }> = {
  0: { text: '未开始', color: 'bg-gray-300' },
  1: { text: '进行中', color: 'bg-blue-300' },
  2: { text: '已完成', color: 'bg-purple-300' },
};

const levelMap = {
  '全部难度': undefined,
  '初级': 0,
  '中级': 1,
  '高级': 2,
};

const getLevelNumber = (level: string | number): number => {
  if (typeof level === 'number') return level;
  const num = parseInt(level);
  return isNaN(num) ? 0 : num;
};

const getLearnStatus = (status: number | undefined): number => {
  if (status === undefined) return 0;
  if (status >= 2) return 2; 
  return status;
};

export default function CoursesSection() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('全部难度');

  const handleCourseClick = (courseId: string | number) => {
    router.push(`/courses/${courseId}`);
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = {
        keyword: searchTerm.trim() || undefined,
        level: levelMap[selectedLevel as keyof typeof levelMap],
        page: 1,
        size: 999,
      };

      const res = await courseApi.getList(params);
      setCourses(res.records || []);
    } catch (err) {
      console.error('获取课程失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [selectedLevel]);
  
  return (
    <section className="border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white p-8 mx-8 relative z-10">
      <div className="mb-8">
        <h2 className="text-3xl font-black mb-2">全部课程</h2>
        <p className="text-gray-600">选择你感兴趣的课程，开始学习之旅</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8 items-center">
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="border-2 border-black px-4 py-2 font-bold bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        >
          <option value="全部难度">全部难度</option>
          <option value="初级">初级</option>
          <option value="中级">中级</option>
          <option value="高级">高级</option>
        </select>

        <div className="ml-auto flex">
          <input
            type="text"
            placeholder="搜索课程..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-2 border-black px-4 py-2 font-bold bg-white focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] w-64"
          />
          <button
            onClick={fetchCourses}
            className="bg-purple-600 text-white px-4 py-2 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          >
            🔍
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-10 font-bold">加载中...</div>}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => {
            const level = getLevelNumber(course.level);
            const levelConfigItem = levelConfig[level] || { text: '未知', color: 'bg-gray-300' };
            const learnStatus = getLearnStatus(course.learnStatus);
            const statusConfig = learnStatusConfig[learnStatus] || learnStatusConfig[0];

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="flex flex-col border-2 border-black bg-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all h-[400px] cursor-pointer"
              >
                {/* 顶部图片横幅 */}
                <div className="h-40 w-full border-b-2 border-black overflow-hidden shrink-0">
                  {course.cover_url ? (
                    <img 
                      src={course.cover_url} 
                      alt={course.title} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-6xl">📚</span>
                    </div>
                  )}
                </div>

                {/* 内容区域 */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-xl font-black mb-1 truncate" title={course.title}>
                    {course.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2" title={course.description}>
                    {course.description}
                  </p>

                  {course.progress !== undefined ? (
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`${levelConfigItem.color} border-2 border-black px-2 py-0.5 text-xs font-bold shrink-0`}>
                        {levelConfigItem.text}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 border-2 border-black">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(course.progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{course.progress}%</span>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <span className={`${levelConfigItem.color} border-2 border-black px-3 py-1 text-xs font-bold`}>
                        {levelConfigItem.text}
                      </span>
                    </div>
                  )}

                  <div className="mt-auto">
                    <span className={`${statusConfig.color} border-2 border-black px-3 py-1 text-xs font-bold w-full block text-center`}>
                      {statusConfig.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div className="text-center py-16">
          <p className="text-2xl font-bold">没有找到匹配的课程</p>
        </div>
      )}
    </section>
  );
}