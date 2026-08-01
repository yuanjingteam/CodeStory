import { expect, test, type Page } from '@playwright/test';

const uuid = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

function pageSlice<T>(items: T[], url: URL): T[] {
  const page = Number(url.searchParams.get('page') || 1);
  const size = Number(url.searchParams.get('size') || 100);
  return items.slice((page - 1) * size, page * size);
}

async function mockStage2Api(page: Page) {
  const courses = Array.from({ length: 101 }, (_, index) => ({
    id: `c${index}`,
    uuid: uuid(index + 1),
    title: `课程 ${index + 1}`,
    description: '',
    level: 1,
  }));
  const chapters = Array.from({ length: 101 }, (_, index) => ({
    id: `h${index}`,
    uuid: uuid(index + 201),
    courseId: courses[0].id,
    courseUuid: courses[0].uuid,
    courseName: courses[0].title,
    chapterName: `章节 ${index + 1}`,
    sectionCount: 1,
    sortOrder: index + 1,
    createdAt: '2026-08-01 08:00:00',
    updateAt: '2026-08-01 08:00:00',
  }));
  const lessons = Array.from({ length: 101 }, (_, index) => ({
    id: `l${index}`,
    uuid: uuid(index + 401),
    lessonId: `l${index}`,
    lessonName: `小节 ${index + 1}`,
    courseId: courses[0].id,
    courseUuid: courses[0].uuid,
    courseName: courses[0].title,
    chapterId: chapters[0].id,
    chapterUuid: chapters[0].uuid,
    chapterName: chapters[0].chapterName,
    content: '',
    difficulty: 1,
    sortOrder: index + 1,
    estimatedTime: 10,
    knowledgeIndexPolicy: 'exclude',
    exercises: [],
    exerciseCount: 0,
    createdAt: '2026-08-01 08:00:00',
    updateAt: '2026-08-01 08:00:00',
    indexStatus: 'not_indexed',
    indexSummary: {},
  }));
  const managedExercise = {
    id: uuid(900),
    lessonId: lessons[0].uuid,
    lessonName: lessons[0].lessonName,
    chapterId: chapters[0].uuid,
    chapterName: chapters[0].chapterName,
    courseId: courses[0].uuid,
    courseName: courses[0].title,
    type: 'single_choice',
    content: 'WHERE 子句用于什么？',
    answer: '筛选数据',
    analysis: 'WHERE 根据条件筛选行。',
    knowledge: 'SQL WHERE',
    difficulty: 1,
    source: 'ai',
    reviewStatus: 'draft',
    metadata: { options: ['筛选数据', '排序数据'] },
    genMetadata: {
      model: 'mock-model',
      promptVersion: 'exercise-gen-v1',
      retrieval: { sources: [] },
    },
    order: 1,
    waitSeconds: 3600,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const ok = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, message: 'success', data }),
    });

    if (path.endsWith('/auth/refresh')) {
      return ok({ accessToken: 'mock-token', accessExpiresAt: '2099-01-01T00:00:00.000Z' });
    }
    if (path.endsWith('/auth/me')) {
      return ok({ id: uuid(999), email: 'admin@example.com', nickname: '管理员', role: 1 });
    }
    if (path.endsWith('/courses/list')) {
      return ok({ records: pageSlice(courses, url), total: courses.length, page: Number(url.searchParams.get('page') || 1), size: 100 });
    }
    if (path.endsWith('/admin/chapter/list')) {
      return ok({ total: chapters.length, data: pageSlice(chapters, url) });
    }
    if (path.endsWith('/admin/lessons/list')) {
      return ok({ total: lessons.length, data: pageSlice(lessons, url) });
    }
    if (path.endsWith('/admin/exercises/list')) {
      return ok({
        total: 25,
        data: [managedExercise],
        pendingCount: 4,
        oldestPendingCreatedAt: '2026-08-01T08:00:00.000Z',
      });
    }
    if (path.endsWith('/admin/exercises/generate')) {
      return ok({ drafts: [managedExercise], metrics: { firstPassStructured: true, repaired: false, modelCallCount: 1 } });
    }
    if (/\/admin\/exercises\/[0-9a-f-]+\/review$/.test(path)) {
      return ok({ exercise: { ...managedExercise, reviewStatus: 'approved' }, indexStatus: 'not_indexed' });
    }
    if (/\/admin\/exercises\/[0-9a-f-]+$/.test(path)) {
      return ok(null);
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test.beforeEach(async ({ page }) => {
  await mockStage2Api(page);
});

test('桌面端加载完整层级、筛选、溯源和多页列表', async ({ page }) => {
  await page.goto('/exercises-manage');
  await expect(page.getByRole('heading', { name: '题目管理' })).toBeVisible();
  const courseSelect = page.getByLabel('课程');
  await expect(courseSelect.locator('option')).toHaveCount(102);

  const filterRequest = page.waitForRequest((request) =>
    request.url().includes('/admin/exercises/list') && request.url().includes(`courseId=${encodeURIComponent(uuid(1))}`)
  );
  await courseSelect.selectOption(uuid(1));
  await page.getByRole('button', { name: '应用筛选' }).click();
  await filterRequest;

  await page.getByRole('button', { name: '查看 AI 生成溯源' }).click();
  await expect(page.getByText('exercise-gen-v1')).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();

  const secondPage = page.waitForRequest((request) =>
    request.url().includes('/admin/exercises/list') && request.url().includes('page=2')
  );
  await page.getByRole('button', { name: '下一页' }).click();
  await secondPage;
});

test('生成、采用、拒绝流程可复验', async ({ page }) => {
  await page.goto('/exercises-manage');
  await page.getByRole('button', { name: 'AI 生成草稿' }).click();
  await page.getByLabel('知识点').fill('SQL WHERE');
  await page.getByRole('button', { name: '生成草稿' }).click();
  await expect(page.getByText(/已完整保存 1 道草稿/)).toBeVisible();
  await page.getByRole('button', { name: '前往待审队列' }).click();

  const approve = page.waitForRequest((request) =>
    request.method() === 'PUT' && request.url().endsWith(`/admin/exercises/${uuid(900)}/review`)
  );
  await page.getByRole('button', { name: '采用', exact: true }).click();
  await approve;

  await page.getByRole('button', { name: '拒绝' }).click();
  const reject = page.waitForRequest((request) =>
    request.method() === 'PUT' && request.url().endsWith(`/admin/exercises/${uuid(900)}/review`)
  );
  await page.getByRole('button', { name: '确认拒绝' }).click();
  await reject;
});

test('390px 移动端无横向溢出且页码收敛', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exercises-manage');
  await expect(page.getByRole('heading', { name: '题目管理' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: '第 1 页' })).toBeHidden();
  await expect(page.getByRole('button', { name: '上一页' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下一页' })).toBeVisible();
});
