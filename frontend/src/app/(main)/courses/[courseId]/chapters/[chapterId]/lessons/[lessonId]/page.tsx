import LessonDetails from '@/components/lessons/LessonPage';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ 
    courseId: string; 
    chapterId: string;
    lessonId: string;
  }>;
}) {
  const { courseId, chapterId, lessonId } = await params;
  
  return (
    <LessonDetails courseId={courseId} chapterId={chapterId} lessonId={lessonId} />
  );
}
