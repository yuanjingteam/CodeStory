import { Router, type Response } from 'express';
import prisma from '../config/prisma';
import {
  getRecommendations,
  RecommendationError,
  recordRecommendationEvent,
  type RecommendationEventType,
} from '../services/recommendations/service';

const router = Router();
const recommendationEventTypes = new Set<RecommendationEventType>([
  'impression',
  'clicked',
  'review_started',
  'review_completed',
]);

type RecommendationEventInput = {
  trackingToken?: unknown;
  eventType?: unknown;
};

function sendRecommendationError(
  res: Response,
  error: unknown
) {
  if (error instanceof RecommendationError) {
    if (
      error.code === 'COURSE_NOT_FOUND' ||
      error.code === 'LESSON_NOT_FOUND' ||
      error.code === 'TARGET_NOT_VISIBLE'
    ) {
      return res.status(404).json({
        code: 404,
        message: error.message,
        data: null,
      });
    }
    if (error.code === 'INVALID_RECOMMENDATION_TOKEN') {
      return res.status(400).json({
        code: 400,
        message: error.message,
        data: null,
      });
    }
  }
  console.error('推荐服务错误:', error);
  return res.status(500).json({
    code: 500,
    message: '推荐服务暂时不可用',
    data: null,
  });
}

router.get('/lessons/:lessonId', async (req, res) => {
  const courseId = String(req.query.courseId || '');
  const limit = Number(req.query.limit || 5);
  if (!courseId || !Number.isInteger(limit) || limit < 1 || limit > 5) {
    return res.status(400).json({
      code: 400,
      message: 'courseId/limit 参数无效',
      data: null,
    });
  }

  try {
    const data = await getRecommendations(req.user.id, {
      courseId,
      lessonId: req.params.lessonId,
      limit,
      scene: 'lesson',
    });
    return res.json({ code: 200, message: 'success', data });
  } catch (error) {
    return sendRecommendationError(res, error);
  }
});

router.get('/review', async (req, res) => {
  let courseId = String(req.query.courseId || '');
  const limit = Number(req.query.limit || 5);
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) {
    return res.status(400).json({
      code: 400,
      message: 'limit 参数无效',
      data: null,
    });
  }

  try {
    if (!courseId) {
      const enrolled = await prisma.courses_progress.findFirst({
        where: { user_id: req.user.id, is_delete: 0 },
        orderBy: { last_learned_at: 'desc' },
        select: { course_id: true },
      });
      courseId = enrolled?.course_id || '';
    }
    if (!courseId) {
      const firstCourse = await prisma.courses.findFirst({
        where: { is_delete: 0 },
        orderBy: [{ level: 'asc' }, { created_at: 'asc' }],
        select: { id: true },
      });
      courseId = firstCourse?.id || '';
    }
    if (!courseId) {
      return res.json({
        code: 200,
        message: 'success',
        data: {
          feedId: '',
          scene: 'review',
          mode: 'cold_start',
          items: [],
        },
      });
    }

    const data = await getRecommendations(req.user.id, {
      courseId,
      limit,
      scene: 'review',
    });
    return res.json({ code: 200, message: 'success', data });
  } catch (error) {
    return sendRecommendationError(res, error);
  }
});

router.post('/events', async (req, res) => {
  const events: RecommendationEventInput[] = Array.isArray(req.body.events)
    ? req.body.events
    : [req.body];
  if (!events.length || events.length > 20) {
    return res.status(400).json({
      code: 400,
      message: '事件数量无效',
      data: null,
    });
  }
  if (
    events.some(
      (event) =>
        typeof event.trackingToken !== 'string' ||
        typeof event.eventType !== 'string' ||
        !recommendationEventTypes.has(
          event.eventType as RecommendationEventType
        )
    )
  ) {
    return res.status(400).json({
      code: 400,
      message: '事件参数无效',
      data: null,
    });
  }

  try {
    const results = await Promise.all(
      events.map((event) =>
        recordRecommendationEvent({
          userId: req.user.id,
          token: event.trackingToken as string,
          eventType: event.eventType as RecommendationEventType,
        })
      )
    );
    return res.json({
      code: 200,
      message: 'success',
      data: {
        received: results.length,
        recorded: results.filter((result) => result.recorded).length,
      },
    });
  } catch (error) {
    return sendRecommendationError(res, error);
  }
});

export default router;
