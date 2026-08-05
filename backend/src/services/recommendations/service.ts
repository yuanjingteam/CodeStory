import crypto from 'node:crypto';
import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import { resolveShortId } from '../../utils/idTransform';
import { isRagEnabled } from '../../config/ai';
import { createKnowledgeRetriever } from '../rag/retriever';

export type RecommendationScene = 'lesson' | 'review';
export type RecommendationMode = 'personalized' | 'fallback' | 'cold_start';
export type RecommendationEventType =
  | 'impression'
  | 'clicked'
  | 'review_started'
  | 'review_completed';

type RecommendationTargetType = 'lesson' | 'exercise';
type RecommendationSource =
  | 'rag'
  | 'learning_progress'
  | 'mastery'
  | 'course_order';

interface RecommendationItem {
  rank: number;
  type: RecommendationTargetType;
  courseId: string;
  chapterId: string;
  lessonId: string;
  exerciseId?: string;
  title: string;
  reason: string;
  source: RecommendationSource;
  relevanceScore: number | null;
  href: string;
  trackingToken?: string;
}

interface TrackingTokenPayload {
  userId: string;
  feedId: string;
  targetType: RecommendationTargetType;
  targetId: string;
  rank: number;
  exp: number;
}

export class RecommendationError extends Error {
  constructor(
    public readonly code:
      | 'COURSE_NOT_FOUND'
      | 'LESSON_NOT_FOUND'
      | 'INVALID_RECOMMENDATION_TOKEN'
      | 'TARGET_NOT_VISIBLE'
      | 'RECOMMENDATION_CONFIG_MISSING',
    message: string
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

function getRecommendationSecret(): string {
  const secret =
    process.env.RECOMMENDATION_TOKEN_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new RecommendationError(
      'RECOMMENDATION_CONFIG_MISSING',
      '推荐签名密钥未配置'
    );
  }
  return secret;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', getRecommendationSecret())
    .update(payload)
    .digest('base64url');
}

export function createTrackingToken(
  input: Omit<TrackingTokenPayload, 'exp'>
): string {
  const body = Buffer.from(
    JSON.stringify({ ...input, exp: Date.now() + 86_400_000 })
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

function invalidToken(): RecommendationError {
  return new RecommendationError(
    'INVALID_RECOMMENDATION_TOKEN',
    '推荐跟踪凭证无效'
  );
}

function verifyToken(token: string, userId: string): TrackingTokenPayload {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra) throw invalidToken();

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    throw invalidToken();
  }

  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    throw invalidToken();
  }
  if (!data || typeof data !== 'object') throw invalidToken();

  const payload = data as Partial<TrackingTokenPayload>;
  if (
    payload.userId !== userId ||
    typeof payload.feedId !== 'string' ||
    !payload.feedId ||
    (payload.targetType !== 'lesson' && payload.targetType !== 'exercise') ||
    typeof payload.targetId !== 'string' ||
    !payload.targetId ||
    !Number.isInteger(payload.rank) ||
    Number(payload.rank) < 1 ||
    typeof payload.exp !== 'number' ||
    !Number.isFinite(payload.exp) ||
    payload.exp < Date.now()
  ) {
    throw invalidToken();
  }

  return payload as TrackingTokenPayload;
}

async function assertCourseVisible(courseId: string): Promise<void> {
  const course = await prisma.courses.findFirst({
    where: { id: courseId, is_delete: 0 },
    select: { id: true },
  });
  if (!course) {
    throw new RecommendationError('COURSE_NOT_FOUND', '课程不存在');
  }
}

export async function recordRecommendationEvent(input: {
  userId: string;
  token: string;
  eventType: RecommendationEventType;
}): Promise<{ recorded: boolean }> {
  const data = verifyToken(input.token, input.userId);
  const visible =
    data.targetType === 'exercise'
      ? await prisma.exercises.findFirst({
          where: {
            id: data.targetId,
            is_delete: 0,
            review_status: 'approved',
            lessons: {
              is_delete: 0,
              chapters: {
                is_delete: 0,
                courses: { is_delete: 0 },
              },
            },
          },
          select: { id: true },
        })
      : await prisma.lessons.findFirst({
          where: {
            id: data.targetId,
            is_delete: 0,
            chapters: {
              is_delete: 0,
              courses: { is_delete: 0 },
            },
          },
          select: { id: true },
        });

  if (!visible) {
    throw new RecommendationError('TARGET_NOT_VISIBLE', '推荐目标不可见');
  }

  const dedupeKey = [
    data.feedId,
    data.targetType,
    data.targetId,
    input.eventType,
  ].join(':');

  try {
    await prisma.ai_feedback_events.create({
      data: {
        trace_id: data.feedId,
        user_id: input.userId,
        scene: 'recommendation',
        event_type: input.eventType,
        target_type: data.targetType,
        target_id: data.targetId,
        metadata: { rank: data.rank },
        dedupe_key: dedupeKey,
      },
    });
    return { recorded: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { recorded: false };
    }
    throw error;
  }
}

async function appendLearningSignals(
  items: RecommendationItem[],
  userId: string,
  courseId: string,
  limit: number,
  excludeLessonId?: string
): Promise<void> {
  const [answers, weakLessons] = await Promise.all([
    prisma.answer.findMany({
      where: {
        user_id: userId,
        is_delete: 0,
        score: { lt: 60 },
        exercises: {
          is_delete: 0,
          review_status: 'approved',
          lessons: {
            is_delete: 0,
            chapters: {
              course_id: courseId,
              is_delete: 0,
              courses: { is_delete: 0 },
            },
          },
        },
      },
      orderBy: [{ score: 'asc' }, { updated_at: 'desc' }],
      take: limit,
      include: {
        exercises: {
          include: {
            lessons: { include: { chapters: true } },
          },
        },
      },
    }),
    prisma.lessons.findMany({
      where: {
        is_delete: 0,
        chapters: {
          course_id: courseId,
          is_delete: 0,
          courses: { is_delete: 0 },
        },
        lessons_progress: {
          some: {
            user_id: userId,
            is_delete: 0,
            mastery_level: { lt: 60 },
          },
        },
      },
      orderBy: [{ difficulty: 'asc' }, { order: 'asc' }],
      take: limit,
      include: { chapters: true },
    }),
  ]);

  for (const answer of answers) {
    if (
      items.length >= limit ||
      items.some((item) => item.exerciseId === answer.exercise_id)
    ) {
      continue;
    }
    const lesson = answer.exercises.lessons;
    items.push({
      rank: items.length + 1,
      type: 'exercise',
      courseId,
      chapterId: lesson.chapter_id,
      lessonId: lesson.id,
      exerciseId: answer.exercise_id,
      title: answer.exercises.content,
      reason: '这道题此前得分较低，建议复习',
      source: 'learning_progress',
      relevanceScore: clamp((60 - answer.score) / 60),
      href: `/courses/${courseId}/chapters/${lesson.chapter_id}/lessons/${lesson.id}?exercise=open&exerciseId=${answer.exercise_id}`,
    });
  }

  for (const lesson of weakLessons) {
    if (
      items.length >= limit ||
      lesson.id === excludeLessonId ||
      items.some((item) => item.lessonId === lesson.id)
    ) {
      continue;
    }
    items.push({
      rank: items.length + 1,
      type: 'lesson',
      courseId,
      chapterId: lesson.chapter_id,
      lessonId: lesson.id,
      title: lesson.title,
      reason: '这个小节的掌握度还不够稳定',
      source: 'mastery',
      relevanceScore: 0.4,
      href: `/courses/${courseId}/chapters/${lesson.chapter_id}/lessons/${lesson.id}`,
    });
  }
}

async function appendCourseOrderFallback(
  items: RecommendationItem[],
  courseId: string,
  limit: number,
  excludedLessonId?: string
): Promise<void> {
  if (items.length >= limit) return;

  const lessons = await prisma.lessons.findMany({
    where: {
      id: excludedLessonId ? { not: excludedLessonId } : undefined,
      is_delete: 0,
      chapters: {
        course_id: courseId,
        is_delete: 0,
        courses: { is_delete: 0 },
      },
    },
    orderBy: [
      { chapters: { order: 'asc' } },
      { difficulty: 'asc' },
      { order: 'asc' },
    ],
    take: limit,
    include: { chapters: true },
  });

  for (const lesson of lessons) {
    if (
      items.length >= limit ||
      items.some((item) => item.lessonId === lesson.id)
    ) {
      continue;
    }
    items.push({
      rank: items.length + 1,
      type: 'lesson',
      courseId,
      chapterId: lesson.chapter_id,
      lessonId: lesson.id,
      title: lesson.title,
      reason: '按课程顺序继续学习',
      source: 'course_order',
      relevanceScore: null,
      href: `/courses/${courseId}/chapters/${lesson.chapter_id}/lessons/${lesson.id}`,
    });
  }
}

export async function getRecommendations(
  userId: string,
  params: {
    courseId: string;
    lessonId?: string;
    limit: number;
    scene: RecommendationScene;
  }
): Promise<{
  feedId: string;
  scene: RecommendationScene;
  mode: RecommendationMode;
  items: Array<RecommendationItem & { trackingToken: string }>;
}> {
  const limit = Math.min(5, Math.max(1, params.limit || 5));
  const feedId = crypto.randomUUID();
  const items: RecommendationItem[] = [];
  let ragFailed = false;
  const courseId = await resolveShortId('courses', params.courseId);
  const lessonId = params.lessonId
    ? (await resolveShortId('lessons', params.lessonId)) || undefined
    : undefined;

  if (!courseId) {
    throw new RecommendationError('COURSE_NOT_FOUND', '课程不存在');
  }
  await assertCourseVisible(courseId);

  if (params.scene === 'lesson' && params.lessonId) {
    if (!lessonId) {
      throw new RecommendationError('LESSON_NOT_FOUND', '小节不存在');
    }
    const current = await prisma.lessons.findFirst({
      where: {
        id: lessonId,
        is_delete: 0,
        chapters: {
          course_id: courseId,
          is_delete: 0,
          courses: { is_delete: 0 },
        },
      },
      select: { title: true, content: true },
    });
    if (!current) {
      throw new RecommendationError('LESSON_NOT_FOUND', '小节不存在');
    }

    const ragEnabled = isRagEnabled();
    if (!ragEnabled) {
      // RAG 关闭时不发起 embedding 调用，直接按回退模式走课程顺序召回
      ragFailed = true;
    }

    try {
      const hits = !ragEnabled
        ? []
        : await createKnowledgeRetriever().retrieve(
            `${current.title}\n${current.content || ''}`,
            {
              userId,
              courseId,
              purpose: 'student_recommendation',
              sourceTypes: ['lesson'],
            }
          );
      const ids = [
        ...new Set(
          hits
            .map((hit) => hit.sourceId)
            .filter((id) => id !== lessonId)
        ),
      ].slice(0, limit);
      const lessons = await prisma.lessons.findMany({
        where: {
          id: { in: ids },
          is_delete: 0,
          chapters: {
            course_id: courseId,
            is_delete: 0,
            courses: { is_delete: 0 },
          },
        },
        select: { id: true, chapter_id: true, title: true },
      });
      const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
      const hitById = new Map(hits.map((hit) => [hit.sourceId, hit]));
      for (const id of ids) {
        const lesson = lessonById.get(id);
        if (!lesson) continue;
        items.push({
          rank: items.length + 1,
          type: 'lesson',
          courseId,
          chapterId: lesson.chapter_id,
          lessonId: lesson.id,
          title: lesson.title,
          reason: '与你正在学习的小节相关',
          source: 'rag',
          relevanceScore: clamp(hitById.get(id)?.score || 0),
          href: `/courses/${courseId}/chapters/${lesson.chapter_id}/lessons/${lesson.id}`,
        });
      }
    } catch {
      ragFailed = true;
    }
  }

  if (params.scene === 'review' || items.length < limit) {
    await appendLearningSignals(
      items,
      userId,
      courseId,
      limit,
      params.scene === 'lesson' ? lessonId : undefined
    );
  }
  await appendCourseOrderFallback(
    items,
    courseId,
    limit,
    params.scene === 'lesson' ? lessonId : undefined
  );

  const hasPersonalizedItem = items.some((item) =>
    ['rag', 'learning_progress', 'mastery'].includes(item.source)
  );
  const mode: RecommendationMode = hasPersonalizedItem
    ? 'personalized'
    : ragFailed
      ? 'fallback'
      : 'cold_start';

  const result = items.slice(0, limit).map((item, index) => {
    const targetId = item.exerciseId || item.lessonId;
    const trackingToken = createTrackingToken({
      userId,
      feedId,
      targetType: item.type,
      targetId,
      rank: index + 1,
    });
    const href =
      item.type === 'exercise'
        ? `${item.href}&recommendationToken=${encodeURIComponent(trackingToken)}`
        : item.href;
    return {
      ...item,
      rank: index + 1,
      href,
      trackingToken,
    };
  });

  return {
    feedId,
    scene: params.scene,
    mode,
    items: result,
  };
}
