'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getProfile } from '@/api/profile';
import {
  getReviewRecommendations,
  recordRecommendationEvent,
  recordRecommendationEvents,
} from '@/api/recommendations';
import type { UserProfileInfo } from '@/types/profile';
import type { RecommendationFeed } from '@/types/recommendations';
import Button from '@/components/ui/Button';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [feed, setFeed] = useState<RecommendationFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reviewQueueRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getProfile(), getReviewRecommendations()])
      .then(([profileResult, feedResult]) => {
        if (!active) return;
        if (profileResult.status === 'rejected') {
          setError(true);
          return;
        }
        if (!profileResult.value.data) {
          setError(true);
          return;
        }
        setProfile(profileResult.value.data);
        if (feedResult.status === 'fulfilled') {
          setFeed(feedResult.value.data || null);
        } else {
          setFeedError(true);
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    const node = reviewQueueRef.current;
    if (!node || !feed?.items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void recordRecommendationEvents(
            feed.items.map((item) => ({
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
  }, [feed]);

  if (loading) return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 p-4 sm:p-6 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.6fr)]" role="status">
      <div className="h-48 animate-pulse border-4 border-black bg-yellow-100 motion-reduce:animate-none" />
      <div className="h-72 animate-pulse border-4 border-black bg-zinc-100 motion-reduce:animate-none" />
      <span className="sr-only">正在加载个人中心...</span>
    </main>
  );
  if (error) return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-8">
      <div className="border-4 border-black bg-red-100 p-5" role="alert">
        <p className="font-bold">个人中心暂时无法加载，请稍后重试。</p>
        <Button className="mt-4" onClick={() => {
          setLoading(true);
          setError(false);
          setFeedError(false);
          setReloadKey((key) => key + 1);
        }}>重试</Button>
      </div>
    </main>
  );

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 p-4 sm:p-6 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.6fr)]">
      <section className="border-4 border-black bg-yellow-300 p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <p className="text-sm font-black uppercase tracking-widest">Profile</p>
        <h1 className="mt-3 text-3xl font-black">{profile?.nickname || '我的学习'}</h1>
        <p className="mt-4 text-sm">累计积分：{profile?.score ?? 0}</p>
        <p className="text-sm">学习等级：{profile?.level ?? 0}</p>
      </section>
      <section ref={reviewQueueRef} className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-end justify-between gap-4 border-b-2 border-black pb-3">
          <div><p className="text-sm font-black uppercase tracking-widest">Review queue</p><h2 className="mt-1 text-2xl font-black">复习建议</h2></div>
          <span className="text-sm font-bold">{feed?.mode === 'cold_start' ? '从基础开始' : '按你的学习记录'}</span>
        </div>
        {feedError ? (
          <p className="py-8 font-bold text-gray-600">
            复习建议暂时不可用，不影响其他个人信息。
          </p>
        ) : !feed?.items.length ? (
          <div className="py-8 text-gray-600">
            <p>暂时没有需要复习的内容。</p>
            <Link href="/courses" className="mt-4 inline-flex min-h-10 items-center font-bold text-black underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2">
              浏览课程
            </Link>
          </div>
        ) : (
          <ul className="divide-y-2 divide-black">
            {feed.items.map((item) => (
              <li key={`${feed.feedId}-${item.trackingToken}`} className="py-4">
                <Link href={item.href} onClick={() => { void recordRecommendationEvent(item.trackingToken, 'clicked'); }} className="block rounded-sm p-2 outline-offset-4 hover:bg-white hover:shadow-[inset_4px_0_0_0_#18181b] focus-visible:outline-2 focus-visible:outline-black active:translate-x-1 active:translate-y-1 motion-reduce:transform-none">
                  <div className="flex items-start justify-between gap-3"><span className="font-black">{item.type === 'exercise' ? '重练题目' : '学习小节'}</span><span className="text-xs font-bold">#{item.rank}</span></div>
                  <p className="mt-1 line-clamp-2 text-sm">{item.title}</p>
                  <p className="mt-2 text-xs text-gray-600">{item.reason}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
