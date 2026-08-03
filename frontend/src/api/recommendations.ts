import request from '@/utils/request';
import type { ApiResponse } from '@/types/auth';
import type { RecommendationFeed } from '@/types/recommendations';

export function getReviewRecommendations(courseId?: string): Promise<ApiResponse<RecommendationFeed>> {
  return request.get('/recommendations/review', { params: courseId ? { courseId, limit: 5 } : { limit: 5 } });
}

export function getLessonRecommendations(courseId: string, lessonId: string): Promise<ApiResponse<RecommendationFeed>> {
  return request.get(`/recommendations/lessons/${lessonId}`, { params: { courseId, limit: 5 } });
}

export function recordRecommendationEvent(trackingToken: string, eventType: 'impression' | 'clicked' | 'review_started' | 'review_completed') {
  return request.post('/recommendations/events', { trackingToken, eventType });
}
