import { expect, test, type Page, type Route } from '@playwright/test';

const recommendationItem = {
  rank: 1,
  type: 'exercise',
  courseId: 'course-1',
  chapterId: 'chapter-1',
  lessonId: 'lesson-1',
  exerciseId: 'exercise-1',
  title: 'WHERE 条件筛选练习',
  reason: '这道题此前得分较低，建议复习',
  source: 'learning_progress',
  relevanceScore: 0.67,
  href: '/courses/course-1/chapters/chapter-1/lessons/lesson-1?exercise=open&exerciseId=exercise-1&recommendationToken=token-1',
  trackingToken: 'token-1',
};

async function fulfillSuccess(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, message: 'success', data }),
  });
}

async function mockProfileApi(
  page: Page,
  options: { recommendationFails?: boolean } = {}
) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) {
      return fulfillSuccess(route, {
        accessToken: 'mock-token',
        accessExpiresAt: '2099-01-01T00:00:00.000Z',
      });
    }
    if (path.endsWith('/auth/me')) {
      return fulfillSuccess(route, {
        id: 'user-1',
        email: 'learner@example.com',
        nickname: '学习者',
        role: 0,
      });
    }
    if (path.endsWith('/profile/user-info')) {
      return fulfillSuccess(route, {
        nickname: '学习者',
        score: 137,
        level: 4,
      });
    }
    if (path.endsWith('/recommendations/review')) {
      if (options.recommendationFails) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 500,
            message: '推荐服务暂时不可用',
            data: null,
          }),
        });
      }
      return fulfillSuccess(route, {
        feedId: 'feed-1',
        scene: 'review',
        mode: 'personalized',
        items: [recommendationItem],
      });
    }
    if (path.endsWith('/recommendations/events')) {
      return fulfillSuccess(route, { received: 1, recorded: 1 });
    }
    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: '{}',
    });
  });
}

test('个人中心展示推荐并记录曝光和点击', async ({ page }) => {
  await mockProfileApi(page);
  const eventRequests: Array<Record<string, unknown>> = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/recommendations/events')) {
      eventRequests.push(request.postDataJSON());
    }
  });

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: '复习建议' })).toBeVisible();
  await expect(page.getByText('WHERE 条件筛选练习')).toBeVisible();
  await expect
    .poll(() =>
      eventRequests.some((payload) =>
        Array.isArray(payload.events) &&
        payload.events.some(
          (event: { eventType?: string }) => event.eventType === 'impression'
        )
      )
    )
    .toBe(true);

  await page.getByText('WHERE 条件筛选练习').click();
  await expect
    .poll(() =>
      eventRequests.some(
        (payload) => payload.eventType === 'clicked'
      )
    )
    .toBe(true);
});

test('推荐失败不阻断个人信息，移动端无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProfileApi(page, { recommendationFails: true });

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: '学习者' })).toBeVisible();
  await expect(
    page.getByText('复习建议暂时不可用，不影响其他个人信息。')
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions).toEqual({ innerWidth: 390, scrollWidth: 390 });
});
