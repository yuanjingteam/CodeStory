'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProfile } from '@/api/profile';
import { getReviewRecommendations, recordRecommendationEvent } from '@/api/recommendations';
import type { UserProfileInfo } from '@/types/profile';
import type { RecommendationFeed } from '@/types/recommendations';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [feed, setFeed] = useState<RecommendationFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getProfile(), getReviewRecommendations()])
      .then(([profileResponse, feedResponse]) => {
        if (!active) return;
        setProfile(profileResponse.data || null);
        setFeed(feedResponse.data || null);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <main className="mx-auto max-w-7xl p-8"><div className="h-32 animate-pulse border-4 border-black bg-yellow-100" /></main>;
  if (error) return <main className="mx-auto max-w-7xl p-8"><p className="border-4 border-black bg-red-100 p-5 font-bold">个人中心暂时无法加载，请稍后重试。</p></main>;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-6 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.6fr)]">
      <section className="border-4 border-black bg-yellow-300 p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <p className="text-sm font-black uppercase tracking-widest">Profile</p>
        <h1 className="mt-3 text-3xl font-black">{profile?.nickname || '我的学习'}</h1>
        <p className="mt-4 text-sm">累计积分：{profile?.score ?? 0}</p>
        <p className="text-sm">学习等级：{profile?.level ?? 0}</p>
      </section>
      <section className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-end justify-between gap-4 border-b-2 border-black pb-3">
          <div><p className="text-sm font-black uppercase tracking-widest">Review queue</p><h2 className="mt-1 text-2xl font-black">复习建议</h2></div>
          <span className="text-sm font-bold">{feed?.mode === 'cold_start' ? '从基础开始' : '按你的学习记录'}</span>
        </div>
        {!feed?.items.length ? <p className="py-8 text-gray-600">暂时没有需要复习的内容。</p> : (
          <ul className="divide-y-2 divide-black">
            {feed.items.map((item) => (
              <li key={`${feed.feedId}-${item.trackingToken}`} className="py-4">
                <Link href={item.href} onClick={() => { void recordRecommendationEvent(item.trackingToken, 'clicked'); }} className="block rounded-sm p-2 outline-offset-4 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-black active:translate-x-1 active:translate-y-1">
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
