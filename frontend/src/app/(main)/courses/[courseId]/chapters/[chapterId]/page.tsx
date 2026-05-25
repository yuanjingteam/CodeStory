import React from 'react';

export default async function ChapterLearningPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) {
  const { courseId, chapterId } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">章节学习</h1>
      <p className="text-gray-600">
        课程ID: {courseId} | 章节ID: {chapterId}
      </p>
    </div>
  );
}
