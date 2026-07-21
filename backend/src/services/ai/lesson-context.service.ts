// 课程上下文服务 让ai知道学生在学啥课程，啥章节，啥内容，啥练习
import prisma from '../../config/prisma';
import { resolveShortId } from '../../utils/idTransform';

// 课程内容最大长度
const MAX_LESSON_CONTENT_LENGTH = 20_000;
const MAX_EXERCISE_CONTENT_LENGTH = 6_000;

export interface LessonAiContext {
  lessonId: string;
  exerciseId: string | null;
  courseTitle: string;
  chapterTitle: string;
  lessonTitle: string;
  lessonContent: string;
  exercise: {
    type: string;
    content: string;
    knowledge: string;
  } | null;
}

function htmlToPlainText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeContent(value: string | null, maxLength: number): string {
  const content = htmlToPlainText(value || '');
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}\n[内容过长，已截断]`;
}

export async function getLessonAiContext(
  lessonId: string,
  exerciseId?: string
): Promise<LessonAiContext | null> {
  const resolvedLessonId = await resolveShortId('lessons', lessonId);
  if (!resolvedLessonId) return null;

  const lesson = await prisma.lessons.findFirst({
    where: { id: resolvedLessonId, is_delete: 0 },
    select: {
      title: true,
      content: true,
      chapters: {
        select: {
          title: true,
          courses: {
            select: { title: true },
          },
        },
      },
    },
  });

  if (!lesson) return null;

  let exercise: LessonAiContext['exercise'] = null;
  let resolvedCurrentExerciseId: string | null = null;
  if (exerciseId) {
    const resolvedExerciseId = await resolveShortId('exercises', exerciseId);
    if (!resolvedExerciseId) {
      throw new Error('当前练习不存在');
    }
    resolvedCurrentExerciseId = resolvedExerciseId;

    const exerciseRecord = await prisma.exercises.findFirst({
      where: {
        id: resolvedExerciseId,
        lesson_id: resolvedLessonId,
        is_delete: 0,
      },
      select: {
        type: true,
        content: true,
        knowledge: true,
      },
    });

    if (!exerciseRecord) {
      throw new Error('当前练习不属于该小节');
    }

    exercise = {
      type: exerciseRecord.type,
      content: normalizeContent(exerciseRecord.content, MAX_EXERCISE_CONTENT_LENGTH),
      knowledge: exerciseRecord.knowledge || '未标注',
    };
  }

  return {
    lessonId: resolvedLessonId,
    exerciseId: resolvedCurrentExerciseId,
    courseTitle: lesson.chapters.courses.title,
    chapterTitle: lesson.chapters.title,
    lessonTitle: lesson.title,
    lessonContent: normalizeContent(lesson.content, MAX_LESSON_CONTENT_LENGTH) || '暂无正文',
    exercise,
  };
}
