import React from 'react';

export default function ChapterLearningPage({
  params,
}: {
  params: { courseId: string; chapterId: string };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">章节学习</h1>
      <p className="text-gray-600">
        课程ID: {params.courseId} | 章节ID: {params.chapterId}
      </p>
    </div>
  );
}
