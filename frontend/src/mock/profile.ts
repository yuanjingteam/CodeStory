import type { UserCourse } from 'shared/types/profile';

export const mockUserCourses: UserCourse[] = [
  {
    id: 'course-001',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Python%20programming%20course%20cover%20with%20code%20and%20laptop&image_size=landscape_4_3',
    title: 'Python 从入门到精通',
    level: 0,
    completed_lessons: 15,
    total_lessons: 20,
    status: 1,
    last_learned_at: new Date('2024-01-15'),
  },
  {
    id: 'course-002',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=JavaScript%20web%20development%20course%20cover&image_size=landscape_4_3',
    title: 'JavaScript 高级编程',
    level: 1,
    completed_lessons: 25,
    total_lessons: 25,
    status: 2,
    last_learned_at: new Date('2024-01-10'),
  },
  {
    id: 'course-003',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=React%20framework%20course%20cover%20with%20component%20diagram&image_size=landscape_4_3',
    title: 'React 18 实战指南',
    level: 1,
    completed_lessons: 8,
    total_lessons: 30,
    status: 1,
    last_learned_at: new Date('2024-01-14'),
  },
  {
    id: 'course-004',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=TypeScript%20programming%20course%20cover%20with%20type%20annotations&image_size=landscape_4_3',
    title: 'TypeScript 类型体操',
    level: 2,
    completed_lessons: 0,
    total_lessons: 20,
    status: 0,
    last_learned_at: new Date('2024-01-01'),
  },
  {
    id: 'course-005',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Node.js%20backend%20development%20course%20cover&image_size=landscape_4_3',
    title: 'Node.js 服务端开发',
    level: 1,
    completed_lessons: 0,
    total_lessons: 25,
    status: 0,
    last_learned_at: new Date('2024-01-02'),
  },
  {
    id: 'course-006',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=SQL%20database%20course%20cover%20with%20data%20tables&image_size=landscape_4_3',
    title: 'SQL 数据库精讲',
    level: 0,
    completed_lessons: 10,
    total_lessons: 10,
    status: 2,
    last_learned_at: new Date('2024-01-08'),
  },
  {
    id: 'course-007',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Docker%20container%20course%20cover%20with%20whale%20logo&image_size=landscape_4_3',
    title: 'Docker 容器化部署',
    level: 2,
    completed_lessons: 5,
    total_lessons: 15,
    status: 1,
    last_learned_at: new Date('2024-01-13'),
  },
  {
    id: 'course-008',
    cover_url:
      'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Vue.js%20framework%20course%20cover%20with%20green%20logo&image_size=landscape_4_3',
    title: 'Vue 3 组合式 API',
    level: 1,
    completed_lessons: 0,
    total_lessons: 18,
    status: 0,
    last_learned_at: new Date('2024-01-03'),
  },
];

export const mockEmptyCourses: UserCourse[] = [];
