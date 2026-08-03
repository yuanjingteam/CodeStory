import crypto from 'crypto';
import prisma from '../../config/prisma';
import { createKnowledgeRetriever } from '../rag/retriever';

const SECRET = process.env.RECOMMENDATION_TOKEN_SECRET || process.env.JWT_SECRET || 'codestory-recommendations';
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
function sign(payload: string) { return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url'); }
export function createTrackingToken(input: { userId: string; feedId: string; targetType: string; targetId: string; rank: number }) {
  const exp = Date.now() + 86400000;
  const body = Buffer.from(JSON.stringify({ ...input, exp })).toString('base64url');
  return `${body}.${sign(body)}`;
}
function verifyToken(token: string, userId: string) {
  const [body, sig] = token.split('.');
  if (!body || !sig) throw new Error('INVALID_RECOMMENDATION_TOKEN');
  const expected = Buffer.from(sign(body)); const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('INVALID_RECOMMENDATION_TOKEN');
  const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as { userId: string; exp: number; feedId: string; targetType: string; targetId: string; rank: number };
  if (data.userId !== userId || data.exp < Date.now()) throw new Error('INVALID_RECOMMENDATION_TOKEN');
  return data;
}

export async function recordRecommendationEvent(input: { userId: string; token: string; eventType: string }) {
  const data = verifyToken(input.token, input.userId);
  if (data.targetType === 'exercise') {
    const visible = await prisma.exercises.findFirst({ where: { id: data.targetId, is_delete: 0, review_status: 'approved', lessons: { is_delete: 0, chapters: { is_delete: 0 } } }, select: { id: true } });
    if (!visible) throw new Error('TARGET_NOT_VISIBLE');
  } else {
    const visible = await prisma.lessons.findFirst({ where: { id: data.targetId, is_delete: 0, chapters: { is_delete: 0 } }, select: { id: true } });
    if (!visible) throw new Error('TARGET_NOT_VISIBLE');
  }
  const dedupeKey = `${data.feedId}:${data.targetType}:${data.targetId}:${input.eventType}`;
  await prisma.$executeRaw`INSERT INTO "ai_feedback_events" ("id","trace_id","user_id","scene","event_type","target_type","target_id","metadata","dedupe_key","created_at") VALUES (${crypto.randomUUID()},${data.feedId},${input.userId},'recommendation',${input.eventType},${data.targetType},${data.targetId},${JSON.stringify({ rank: data.rank })}::jsonb,${dedupeKey},NOW()) ON CONFLICT ("dedupe_key") DO NOTHING`;
  return { recorded: true };
}

export async function getRecommendations(userId: string, params: { courseId: string; lessonId?: string; limit: number; scene: 'lesson' | 'review' }) {
  const limit = Math.min(5, Math.max(1, params.limit || 5));
  const feedId = crypto.randomUUID();
  const items: any[] = [];
  if (params.scene === 'lesson' && params.lessonId) {
    const current = await prisma.lessons.findFirst({ where: { id: params.lessonId, is_delete: 0, chapters: { course_id: params.courseId, is_delete: 0 } }, select: { title: true, content: true } });
    if (!current) throw new Error('LESSON_NOT_FOUND');
    try {
      const hits = await createKnowledgeRetriever().retrieve(`${current.title}\n${current.content || ''}`, { userId, courseId: params.courseId, purpose: 'student_recommendation', sourceTypes: ['lesson'] });
      const ids = [...new Set(hits.map(h => h.sourceId).filter(id => id !== params.lessonId))].slice(0, limit);
      const lessons = await prisma.lessons.findMany({ where: { id: { in: ids }, is_delete: 0, chapters: { course_id: params.courseId, is_delete: 0 } }, include: { chapters: true } });
      for (const [rank, lesson] of lessons.entries()) items.push({ rank: rank + 1, type: 'lesson', courseId: params.courseId, chapterId: lesson.chapter_id, lessonId: lesson.id, title: lesson.title, reason: '与你正在学习的小节相关', source: 'rag', relevanceScore: clamp(hits.find(h => h.sourceId === lesson.id)?.score || 0), href: `/courses/${params.courseId}/lessons/${lesson.id}` });
    } catch { /* fallback below */ }
  }
  if (params.scene === 'review' || items.length < limit) {
    const [answers, weakLessons] = await Promise.all([
      prisma.answer.findMany({ where: { user_id: userId, is_delete: 0, score: { lt: 60 }, exercises: { is_delete: 0, review_status: 'approved', lessons: { is_delete: 0, chapters: { course_id: params.courseId, is_delete: 0 } } } }, orderBy: { score: 'asc' }, take: limit, include: { exercises: { include: { lessons: { include: { chapters: true } } } } } }),
      prisma.lessons.findMany({ where: { is_delete: 0, chapters: { course_id: params.courseId, is_delete: 0 }, lessons_progress: { some: { user_id: userId, is_delete: 0, mastery_level: { lt: 60 } } } }, orderBy: [{ difficulty: 'asc' }, { order: 'asc' }], take: limit, include: { chapters: true } }),
    ]);
    for (const a of answers) if (!items.some(i => i.exerciseId === a.exercise_id)) items.push({ rank: items.length + 1, type: 'exercise', courseId: params.courseId, chapterId: a.exercises.lessons.chapter_id, lessonId: a.exercises.lesson_id, exerciseId: a.exercise_id, title: a.exercises.content, reason: '这道题此前得分较低，建议复习', source: 'learning_progress', relevanceScore: clamp((60 - a.score) / 60), href: `/courses/${params.courseId}/chapters/${a.exercises.lessons.chapter_id}/lessons/${a.exercises.lesson_id}?exercise=open&exerciseId=${a.exercise_id}` });
    for (const lesson of weakLessons) if (items.length < limit && !items.some(i => i.lessonId === lesson.id)) items.push({ rank: items.length + 1, type: 'lesson', courseId: params.courseId, chapterId: lesson.chapter_id, lessonId: lesson.id, title: lesson.title, reason: '这个小节的掌握度还不够稳定', source: 'mastery', relevanceScore: 0.4, href: `/courses/${params.courseId}/chapters/${lesson.chapter_id}/lessons/${lesson.id}` });
  }
  if (params.scene === 'review' && items.length < limit) {
    const foundation = await prisma.lessons.findMany({ where: { is_delete: 0, chapters: { course_id: params.courseId, is_delete: 0 } }, orderBy: [{ difficulty: 'asc' }, { order: 'asc' }], take: limit, include: { chapters: true } });
    for (const lesson of foundation) if (items.length < limit && !items.some(i => i.lessonId === lesson.id)) items.push({ rank: items.length + 1, type: 'lesson', courseId: params.courseId, chapterId: lesson.chapter_id, lessonId: lesson.id, title: lesson.title, reason: '按课程顺序开始下一段学习', source: 'course_order', relevanceScore: null, href: `/courses/${params.courseId}/chapters/${lesson.chapter_id}/lessons/${lesson.id}` });
  }
  const result = items.slice(0, limit).map((item, index) => {
    const trackingToken = createTrackingToken({ userId, feedId, targetType: item.type, targetId: item.exerciseId || item.lessonId, rank: index + 1 });
    const href = item.type === 'exercise'
      ? `${item.href}&recommendationToken=${encodeURIComponent(trackingToken)}`
      : item.href;
    return { ...item, rank: index + 1, href, trackingToken };
  });
  return { feedId, scene: params.scene, mode: result.length ? (items.some(i => i.source === 'rag') ? 'rag' : 'fallback') : 'cold_start', items: result };
}
