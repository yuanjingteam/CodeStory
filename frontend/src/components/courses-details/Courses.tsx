'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import courseApi from '@/app/api/courses/courses';
import type { Course } from '@/types/course';
import { BsPersonFill, BsSearch } from 'react-icons/bs';
import { useUserStore } from '@/store/useUserStore';
import { courseLevelMap, courseStatusMap } from '@/utils/constants';
import { toast } from 'sonner';

const levelMap = {
  全部难度: undefined,
  初级: 0,
  中级: 1,
  高级: 2,
};

const learnStatusMap = {
  全部状态: undefined,
  未开始: 0,
  进行中: 1,
  已完成: 2,
};

const studentCountRangeMap: Record<string, { min?: number; max?: number }> = {
  全部人数: {},
  '1-50 人': { min: 1, max: 50 },
  '51-200 人': { min: 51, max: 200 },
  '201-500 人': { min: 201, max: 500 },
  '501-1000 人': { min: 501, max: 1000 },
  '1000+ 人': { min: 1001 },
};

const getLevelNumber = (level: string | number): number => {
  if (typeof level === 'number') return level;
  const num = parseInt(level);
  return isNaN(num) ? 0 : num;
};

const getLearnStatus = (
  status: number | undefined,
  progress: number | undefined
): number => {
  if (progress !== undefined && progress >= 100) {
    return 2; // 进度100%强制为"已完成"
  }
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
  const [selectedStatus, setSelectedStatus] = useState('全部状态');
  const [selectedStudentRange, setSelectedStudentRange] = useState('全部人数');
  const { isLoggedIn } = useUserStore();
  const handleCourseClick = (courseId: string | number) => {
    if (!isLoggedIn) {
      toast.error('请先登录');
      return;
    };
    router.push(`/courses/${courseId}`);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedLevel('全部难度');
    setSelectedStatus('全部状态');
    setSelectedStudentRange('全部人数');
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        keyword: searchTerm.trim() || undefined,
        level: levelMap[selectedLevel as keyof typeof levelMap],
        learnStatus:
          learnStatusMap[selectedStatus as keyof typeof learnStatusMap],
        page: 1,
        size: 999,
      };

      const range = studentCountRangeMap[selectedStudentRange];
      if (range.min !== undefined) {
        params.minStudentCount = range.min;
      }
      if (range.max !== undefined) {
        params.maxStudentCount = range.max;
      }

      console.log('📤 发送请求参数:', params);

      const res = await courseApi.getList(params);
      console.log('📥 收到响应数据:', res);
      setCourses(res.records || []);
    } catch (err) {
      console.error('获取课程失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [selectedLevel, selectedStatus, selectedStudentRange]);

  return (
    <section className="bg-white p-8 mx-8 relative z-10">
      <div className="mb-8">
        <h2 className="text-3xl font-black mb-2">全部课程</h2>
        <p className="text-gray-600">选择你感兴趣的课程，开始学习之旅</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8 items-center">
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="w-50 rounded-lg border-2 border-black px-4 py-2 font-bold bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        >
          <option value="全部难度">全部难度</option>
          <option value="初级">初级</option>
          <option value="中级">中级</option>
          <option value="高级">高级</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-50 rounded-lg border-2 border-black px-4 py-2 font-bold bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        >
          <option value="全部状态">全部状态</option>
          <option value="未开始">未开始</option>
          <option value="进行中">进行中</option>
          <option value="已完成">已完成</option>
        </select>

        <select
          value={selectedStudentRange}
          onChange={(e) => setSelectedStudentRange(e.target.value)}
          className="w-50 rounded-lg border-2 border-black px-4 py-2 font-bold bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        >
          <option value="全部人数">全部人数</option>
          <option value="1-50 人">1-50 人</option>
          <option value="51-200 人">51-200 人</option>
          <option value="201-500 人">201-500 人</option>
          <option value="501-1000 人">501-1000 人</option>
          <option value="1000+ 人">1000+ 人</option>
        </select>

        <div className="ml-auto flex gap-2">
          <input
            type="text"
            placeholder="搜索课程..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-l-lg border-2 border-black px-4 py-2 font-bold bg-white focus:outline-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] w-64"
          />
          <button
            onClick={fetchCourses}
            className="rounded-r-lg bg-purple-600 text-white px-4 py-2 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-purple-700 transition-colors flex items-center justify-center"
          >
            <BsSearch className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg bg-white text-gray-700 px-4 py-2 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-gray-50 transition-all duration-200 font-medium flex items-center gap-2"
            title="重置所有筛选条件"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            重置
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-10 font-bold">加载中...</div>}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course) => {
            const level = getLevelNumber(course.level);
            const levelConfigItem = courseLevelMap[level] || {
              text: '未知',
              color: 'bg-gray-300',
            };
            const learnStatus = getLearnStatus(
              course.learnStatus,
              course.progress
            );
            const statusConfig =
              courseStatusMap[learnStatus] || courseStatusMap[0];

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="flex flex-col rounded-xl border-1 border-black bg-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-all h-[320px] cursor-pointer overflow-hidden"
              >
                {/* 顶部图片横幅 */}
                <div className="h-40 w-full border-b-2 border-black overflow-hidden shrink-0 rounded-t-xl">
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
                  <h3
                    className="text-xl font-black mb-1 truncate"
                    title={course.title}
                  >
                    {course.title}
                  </h3>
                  <p
                    className="text-gray-600 text-sm mb-3 whitespace-nowrap overflow-hidden text-ellipsis"
                    title={course.description}
                  >
                    {course.description}
                  </p>

                  {course.progress !== undefined ? (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 border-2 border-black">
                          <div
                            className={`h-full rounded-full transition-all ${
                              learnStatus === 2 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{
                              width: `${Math.min(course.progress, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                          {course.progress}%
                        </span>
                        <span
                          className={`${statusConfig.color} border-2 border-black px-2 py-1 text-xs font-bold shrink-0`}
                        >
                          {statusConfig.text}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className={`${levelConfigItem.color} border-2 border-black px-2 py-0.5 text-xs font-bold`}
                        >
                          {levelConfigItem.text}
                        </span>
                        {course.studentCount !== undefined && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <span>
                              <BsPersonFill />
                            </span>
                            <span className="font-bold">
                              学习人数：{course.studentCount.toLocaleString()}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`${levelConfigItem.color} border-2 border-black px-3 py-1 text-xs font-bold`}
                        >
                          {levelConfigItem.text}
                        </span>
                        <span
                          className={`${statusConfig.color} border-2 border-black px-2 py-1 text-xs font-bold shrink-0`}
                        >
                          {statusConfig.text}
                        </span>
                      </div>
                      {course.studentCount !== undefined && (
                        <div className="text-right">
                          <span className="text-xs text-gray-600 flex items-center gap-1 justify-end">
                            <span>👥</span>
                            <span className="font-bold">
                              {course.studentCount.toLocaleString()}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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
