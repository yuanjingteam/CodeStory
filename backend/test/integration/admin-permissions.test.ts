// 阶段 0A 收尾 · 权限三态回归自动化测试
// 文档 5.2：未登录 / 普通用户 / 管理员分别调用各管理接口的状态码（401/403/200）
// 覆盖现有管理路由与阶段 2 的独立题目管理路由
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import prisma from '../../src/config/prisma';
import app from '../../src/app';
import { issueAccessToken } from '../../src/utils/auth-token';
import { randomUUID } from 'node:crypto';

const MARKER = `0a_perm_${Date.now()}`;
let adminUserId: string | null = null;
let normalUserId: string | null = null;
let adminToken = '';
let normalToken = '';

beforeAll(async () => {
  const admin = await prisma.users.create({
    data: {
      email: `${MARKER}_admin@example.com`,
      password: 'test-only',
      role: 1,
    },
  });
  adminUserId = admin.id;
  adminToken = issueAccessToken({
    userId: admin.id,
    email: admin.email,
    role: 1,
    sessionId: randomUUID(),
  }).token;

  const normal = await prisma.users.create({
    data: {
      email: `${MARKER}_user@example.com`,
      password: 'test-only',
      role: 0,
    },
  });
  normalUserId = normal.id;
  normalToken = issueAccessToken({
    userId: normal.id,
    email: normal.email,
    role: 0,
    sessionId: randomUUID(),
  }).token;
});

afterAll(async () => {
  // 清理管理员调用 course-manage 创建的课程（仅管理员路径会写库）
  if (adminUserId) {
    await prisma.courses.deleteMany({
      where: { title: { startsWith: `${MARKER}_course_` } },
    });
  }
  if (adminUserId) {
    await prisma.users.deleteMany({ where: { id: adminUserId } });
  }
  if (normalUserId) {
    await prisma.users.deleteMany({ where: { id: normalUserId } });
  }
  await prisma.$disconnect();
});

// 四组 *-manage 路由的测试用例定义
// course-manage 无 GET 列表端点，用 POST / 提交 multipart（无文件）触发 200，
//   multer 对无文件 multipart 放行，handler 创建课程后由 afterAll 清理
// 其余三组用只读端点（POST /list 或 GET /list），不写库
const routes = [
  {
    name: 'user-manage',
    method: 'post' as const,
    path: '/api/v1/admin/user-manage/list',
    body: { page: 1, size: 1 },
  },
  {
    name: 'course-manage',
    method: 'post' as const,
    path: '/api/v1/admin/courses',
    // multipart 提交 title 字段，无文件；multer 放行，handler 创建课程
    multipartField: { title: `${MARKER}_course_admin` },
  },
  {
    name: 'chapter-manage',
    method: 'get' as const,
    path: '/api/v1/admin/chapter/list',
  },
  {
    name: 'lesson-manage',
    method: 'get' as const,
    path: '/api/v1/admin/lessons/list',
  },
  {
    name: 'exercise-manage',
    method: 'get' as const,
    path: '/api/v1/admin/exercises/list',
  },
];

describe('权限三态回归 · 管理路由', () => {
  for (const route of routes) {
    describe(`${route.name} · ${route.method.toUpperCase()} ${route.path}`, () => {
      it('未登录 → 401', async () => {
        const req = request(app)[route.method](route.path);
        if (route.body) req.send(route.body);
        if (route.multipartField) req.field('title', route.multipartField.title);
        const res = await req;
        expect(res.status).toBe(401);
      });

      it('普通用户（role=0）→ 403', async () => {
        const req = request(app)
          [route.method](route.path)
          .set('Authorization', `Bearer ${normalToken}`);
        if (route.body) req.send(route.body);
        if (route.multipartField) req.field('title', route.multipartField.title);
        const res = await req;
        expect(res.status).toBe(403);
      });

      it('管理员（role=1）→ 200', async () => {
        const req = request(app)
          [route.method](route.path)
          .set('Authorization', `Bearer ${adminToken}`);
        if (route.body) req.send(route.body);
        if (route.multipartField) req.field('title', route.multipartField.title);
        const res = await req;
        expect(res.status).toBe(200);
      });
    });
  }
});

describe('管理员索引重建接口', () => {
  const path = '/api/v1/admin/lessons/reindex-batch';

  it('未登录返回 HTTP 401', async () => {
    const response = await request(app).post(path).send({});
    expect(response.status).toBe(401);
  });

  it('普通用户返回 HTTP 403', async () => {
    const response = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${normalToken}`)
      .send({});
    expect(response.status).toBe(403);
  });

  it('管理员缺少课程/章节范围时返回业务 code 400', async () => {
    const response = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(400);
  });
});
