// 课程上下文服务 让ai知道学生在学啥课程，啥章节，啥内容，啥练习
import { createHash } from 'node:crypto';
import prisma from '../../config/prisma';
import { isRagEnabled } from '../../config/ai';
import { logger } from '../../config/logger';
import { resolveShortId } from '../../utils/idTransform';
import {
  createKnowledgeRetriever,
  htmlToKnowledgeText,
  loadKnowledgeSourceAssessment,
  type KnowledgeRetriever,
  type KnowledgeSource,
  type RetrievedKnowledge,
} from '../rag';
import type { LessonEvidenceQuality } from './lesson-chat.types';

// 课程内容最大长度
const MAX_LESSON_CONTENT_LENGTH = 20_000;
const MAX_EXERCISE_CONTENT_LENGTH = 6_000;
const FULL_CONTEXT_CHARACTER_BUDGET = 12_000;
const SCOPED_RETRIEVAL_TOP_K = 4;
const ANAPHORIC_QUERY_PATTERN =
  /这个|它|上面|刚才|前面|这里|这种|该(?:方法|概念|代码|语句|知识)/;

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
    sourceVersion: Date;
  } | null;
  ragEnabled: boolean;
  retrievalMode: 'retrieved' | 'full_context' | 'fallback';
  evidenceQuality: LessonEvidenceQuality;
  evidence: RetrievedKnowledge[];
}

function normalizeContent(value: string | null, maxLength: number): string {
  const content = htmlToKnowledgeText(value || '');
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}\n[内容过长，已截断]`;
}

function toRetrievedKnowledge(
  source: KnowledgeSource,
  score = 1
): RetrievedKnowledge {
  return {
    ...source,
    chunkIndex: 0,
    contentHash: createHash('sha256')
      .update(source.content)
      .digest('hex'),
    score,
  };
}

function getEvidenceQuality(input: {
  status?: string;
  meaningfulCharacters?: number;
}): LessonEvidenceQuality {
  if (
    input.status === 'needs_content' ||
    input.status === 'excluded' ||
    !input.status
  ) {
    return 'empty';
  }
  return (input.meaningfulCharacters || 0) >= 80
    ? 'strong'
    : 'thin';
}

function createExerciseEvidence(
  context: {
    lessonId: string;
    courseId: string;
    courseTitle: string;
    chapterTitle: string;
    lessonTitle: string;
  },
  exerciseId: string,
  exercise: NonNullable<LessonAiContext['exercise']>
): RetrievedKnowledge {
  const content = [
    `# ${context.courseTitle}`,
    `## ${context.chapterTitle}`,
    `### ${context.lessonTitle}`,
    `题型：${exercise.type}`,
    `知识点：${exercise.knowledge}`,
    `题目：${exercise.content}`,
  ].join('\n\n');

  return {
    sourceType: 'exercise',
    sourceId: exerciseId,
    courseId: context.courseId,
    lessonId: context.lessonId,
    sourceVersion: exercise.sourceVersion,
    chunkIndex: 0,
    content,
    contentHash: createHash('sha256').update(content).digest('hex'),
    metadata: {
      lessonTitle: context.lessonTitle,
      exerciseType: exercise.type,
    },
    score: 1,
  };
}

export function buildHistoryAwareRetrievalQuery(
  question: string,
  previousQuestion?: string | null
): string {
  const normalizedQuestion = question.trim();
  const normalizedPrevious = previousQuestion?.trim();
  if (
    !normalizedPrevious ||
    !ANAPHORIC_QUERY_PATTERN.test(normalizedQuestion)
  ) {
    return normalizedQuestion;
  }
  return [
    normalizedPrevious.slice(0, 300),
    `当前追问：${normalizedQuestion}`,
  ].join('\n');
}

async function getRetrievalQuery(
  userId: string,
  lessonId: string,
  question: string
): Promise<string> {
  if (!ANAPHORIC_QUERY_PATTERN.test(question)) return question;

  const session = await prisma.ai_chat_sessions.findUnique({
    where: {
      user_id_lesson_id: {
        user_id: userId,
        lesson_id: lessonId,
      },
    },
    select: { id: true },
  });
  if (!session) return question;

  const previous = await prisma.ai_chat_messages.findFirst({
    where: {
      session_id: session.id,
      role: 'user',
      is_delete: 0,
    },
    orderBy: { created_at: 'desc' },
    select: { content: true },
  });
  return buildHistoryAwareRetrievalQuery(
    question,
    previous?.content
  );
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
  const ragEnabled = isRagEnabled();
  const resolvedLessonId = await resolveShortId('lessons', lessonId);
  if (!resolvedLessonId) return null;

  const lesson = await prisma.lessons.findFirst({
    where: { id: resolvedLessonId, is_delete: 0 },
    select: {
      title: true,
      content: true,
      updated_at: true,
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
        review_status: 'approved',
      },
      select: {
        type: true,
        content: true,
        knowledge: true,
        updated_at: true,
      },
    });

    if (!exerciseRecord) {
      throw new Error('当前练习不属于该小节');
    }

    exercise = {
      type: exerciseRecord.type,
      content: normalizeContent(exerciseRecord.content, MAX_EXERCISE_CONTENT_LENGTH),
      knowledge: exerciseRecord.knowledge || '未标注',
      sourceVersion: exerciseRecord.updated_at,
    };
  }

  let evidence: RetrievedKnowledge[] = [];
  let retrievalMode: LessonAiContext['retrievalMode'] = 'fallback';
  let evidenceQuality: LessonEvidenceQuality = 'empty';
  if (retrieval && ragEnabled) {
    try {
      const assessment = await loadKnowledgeSourceAssessment(
        'lesson',
        resolvedLessonId
      );
      evidenceQuality = getEvidenceQuality({
        status: assessment.readiness?.status,
        meaningfulCharacters:
          assessment.readiness?.meaningfulCharacters,
      });

      if (
        assessment.source &&
        evidenceQuality !== 'empty' &&
        assessment.source.content.length <=
          FULL_CONTEXT_CHARACTER_BUDGET
      ) {
        evidence = [toRetrievedKnowledge(assessment.source)];
        retrievalMode = 'full_context';
      } else if (assessment.source && evidenceQuality !== 'empty') {
        const retrievalQuery = await getRetrievalQuery(
          retrieval.userId,
          resolvedLessonId,
          retrieval.query
        );
        evidence = await (
          retrieval.retriever || createKnowledgeRetriever()
        ).retrieve(retrievalQuery, {
          userId: retrieval.userId,
          courseId: lesson.chapters.courses.id,
          lessonId: resolvedLessonId,
          purpose: 'student_chat',
          topK: SCOPED_RETRIEVAL_TOP_K,
          sourceTypes: ['lesson'],
          strictLessonScope: true,
        });
        retrievalMode =
          evidence.length > 0 ? 'retrieved' : 'fallback';
      }

      if (exercise && resolvedCurrentExerciseId) {
        evidence.push(
          createExerciseEvidence(
            {
              lessonId: resolvedLessonId,
              courseId: lesson.chapters.courses.id,
              courseTitle: lesson.chapters.courses.title,
              chapterTitle: lesson.chapters.title,
              lessonTitle: lesson.title,
            },
            resolvedCurrentExerciseId,
            exercise
          )
        );
        if (retrievalMode === 'fallback') {
          retrievalMode = 'full_context';
        }
        if (evidenceQuality === 'empty') {
          evidenceQuality = 'thin';
        }
      }

      logger.info(
        {
          course_id: lesson.chapters.courses.id,
          lesson_id: resolvedLessonId,
          retrieval_mode: retrievalMode,
          evidence_quality: evidenceQuality,
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

  if (retrieval && !ragEnabled) {
    const fallbackContent = normalizeContent(
      lesson.content,
      MAX_LESSON_CONTENT_LENGTH
    );
    if (fallbackContent) {
      evidence = [
        toRetrievedKnowledge({
          sourceType: 'lesson',
          sourceId: resolvedLessonId,
          courseId: lesson.chapters.courses.id,
          lessonId: resolvedLessonId,
          sourceVersion: lesson.updated_at,
          content: [
            `# ${lesson.chapters.courses.title}`,
            `## ${lesson.chapters.title}`,
            `### ${lesson.title}`,
            fallbackContent,
          ].join('\n\n'),
          metadata: { lessonTitle: lesson.title },
        }),
      ];
      evidenceQuality =
        fallbackContent.replace(/\s+/g, '').length >= 80
          ? 'strong'
          : 'thin';
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
    ragEnabled,
    retrievalMode,
    evidenceQuality,
    evidence,
  };
}
