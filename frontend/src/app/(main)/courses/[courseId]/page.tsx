import CourseDetails from '@/components/courses-details/CoursePage';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  
  return (
    <CourseDetails courseId={courseId} />
  );
}
