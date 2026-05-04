import React from 'react';

export default function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">课程详情</h1>
      <p className="text-gray-600">课程ID: {params.courseId}</p>
    </div>
  );
}
