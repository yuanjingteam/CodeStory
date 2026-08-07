'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getLessonRecommendations,
  recordRecommendationEvent,
  recordRecommendationEvents,
} from '@/api/recommendations';
import type { RecommendationItem } from '@/types/recommendations';

interface RelatedLearningProps {
  courseId: string;
  lessonId: string;
}

export default function RelatedLearning({
  courseId,
  lessonId,
}: RelatedLearningProps) {
  const router = useRouter();
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getLessonRecommendations(courseId, lessonId)
      .then((response) => {
        if (!cancelled) setItems(response.data?.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void recordRecommendationEvents(
            items.map((item) => ({
              trackingToken: item.trackingToken,
              eventType: 'impression',
            }))
          ).catch(() => undefined);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <div
      ref={containerRef}
      className="border-t-2 border-black bg-yellow-50 px-6 py-4"
    >
      <h3 className="mb-2 font-black">相关学习</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.trackingToken}
            onClick={() => {
              recordRecommendationEvent(item.trackingToken, 'clicked').catch(
                () => undefined
              );
              router.push(item.href);
            }}
            title={item.title}
            className="truncate border-2 border-black bg-white px-3 py-2 text-left font-bold hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
