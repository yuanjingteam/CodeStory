export interface RecommendationItem {
  rank: number;
  type: 'lesson' | 'exercise';
  courseId: string;
  chapterId: string;
  lessonId: string;
  exerciseId?: string;
  title: string;
  reason: string;
  source: string;
  relevanceScore: number | null;
  href: string;
  trackingToken: string;
}

export interface RecommendationFeed {
  feedId: string;
  scene: 'lesson' | 'review';
  mode: 'personalized' | 'fallback' | 'cold_start';
  items: RecommendationItem[];
}
