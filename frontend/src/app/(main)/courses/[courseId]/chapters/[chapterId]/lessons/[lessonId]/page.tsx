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
  const { lessonId } = await params;
  
  return (
    <LessonDetails lessonId={lessonId} />
  );
}
