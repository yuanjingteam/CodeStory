// 课程上下文服务 让ai知道学生在学啥课程，啥章节，啥内容，啥练习
import prisma from '../../config/prisma';
import { isRagEnabled } from '../../config/ai';
import { logger } from '../../config/logger';
import { resolveShortId } from '../../utils/idTransform';
import {
  createKnowledgeRetriever,
  htmlToKnowledgeText,
  type KnowledgeRetriever,
  type RetrievedKnowledge,
} from '../rag';

// 课程内容最大长度
const MAX_LESSON_CONTENT_LENGTH = 20_000;
const MAX_EXERCISE_CONTENT_LENGTH = 6_000;

export interface LessonAiContext {
  lessonId: string;
  exerciseId: string | null;
  courseId: string;
  courseTitle: string;
  chapterTitle: string;
  lessonTitle: string;
  lessonContent: string;
  exercise: {
    type: string;
    content: string;
    knowledge: string;
  } | null;
  retrievalMode: 'retrieved' | 'fallback';
  evidence: RetrievedKnowledge[];
}

function normalizeContent(value: string | null, maxLength: number): string {
  const content = htmlToKnowledgeText(value || '');
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}\n[内容过长，已截断]`;
}

export async function getLessonAiContext(
  lessonId: string,
  exerciseId?: string,
  retrieval?: {
    userId: string;
    query: string;
    retriever?: KnowledgeRetriever;
  }
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
            select: { id: true, title: true },
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

  let evidence: RetrievedKnowledge[] = [];
  if (retrieval && isRagEnabled()) {
    try {
      evidence = await (
        retrieval.retriever || createKnowledgeRetriever()
      ).retrieve(retrieval.query, {
        userId: retrieval.userId,
        courseId: lesson.chapters.courses.id,
        lessonId: resolvedLessonId,
        purpose: 'student_chat',
      });
      logger.info(
        {
          course_id: lesson.chapters.courses.id,
          lesson_id: resolvedLessonId,
          evidence: evidence.map((item) => ({
            source_type: item.sourceType,
            source_id: item.sourceId,
            chunk_index: item.chunkIndex,
            content_hash: item.contentHash,
            score: item.score,
          })),
        },
        'lesson RAG retrieval completed'
      );
    } catch (error) {
      logger.warn(
        {
          course_id: lesson.chapters.courses.id,
          lesson_id: resolvedLessonId,
          error_code:
            error instanceof Error
              ? error.message.split(':', 1)[0]
              : 'RAG_RETRIEVAL_FAILED',
        },
        'lesson RAG retrieval fell back'
      );
    }
  }

  return {
    lessonId: resolvedLessonId,
    exerciseId: resolvedCurrentExerciseId,
    courseId: lesson.chapters.courses.id,
    courseTitle: lesson.chapters.courses.title,
    chapterTitle: lesson.chapters.title,
    lessonTitle: lesson.title,
    lessonContent: normalizeContent(lesson.content, MAX_LESSON_CONTENT_LENGTH) || '暂无正文',
    exercise,
    retrievalMode: evidence.length > 0 ? 'retrieved' : 'fallback',
    evidence,
  };
}
