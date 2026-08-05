import request from '@/utils/request';
import type { ApiResponse } from '@/types/auth';
import type { RecommendationFeed } from '@/types/recommendations';

export type RecommendationEventType =
  | 'impression'
  | 'clicked'
  | 'review_started'
  | 'review_completed';

// 推荐召回可能走 RAG 检索，比普通接口慢，单独放宽超时（全局默认 5s）
const RECOMMENDATION_TIMEOUT_MS = 15_000;

export function getReviewRecommendations(courseId?: string): Promise<ApiResponse<RecommendationFeed>> {
  return request.get('/recommendations/review', {
    params: courseId ? { courseId, limit: 5 } : { limit: 5 },
    timeout: RECOMMENDATION_TIMEOUT_MS,
  });
}

export function getLessonRecommendations(courseId: string, lessonId: string): Promise<ApiResponse<RecommendationFeed>> {
  return request.get(`/recommendations/lessons/${lessonId}`, {
    params: { courseId, limit: 5 },
    timeout: RECOMMENDATION_TIMEOUT_MS,
  });
}

export function recordRecommendationEvent(
  trackingToken: string,
  eventType: RecommendationEventType
) {
  return request.post('/recommendations/events', { trackingToken, eventType });
}

export function recordRecommendationEvents(
  events: Array<{
    trackingToken: string;
    eventType: RecommendationEventType;
  }>
) {
  return request.post('/recommendations/events', { events });
}
