import { convert } from 'html-to-text';
import prisma from '../../config/prisma';
import type {
  KnowledgeSource,
  KnowledgeSourceType,
} from './types';
import {
  assessExerciseContent,
  assessLessonContent,
  type ContentReadinessResult,
} from './content-readiness';

export interface KnowledgeSourceAssessment {
  source: KnowledgeSource | null;
  readiness: ContentReadinessResult | null;
}

export function htmlToKnowledgeText(value: string | null): string {
  return convert(value || '', {
    wordwrap: false,
    selectors: [
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { ignoreHref: true } },
    ],
  })
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function loadKnowledgeSource(
  sourceType: KnowledgeSourceType,
  sourceId: string
): Promise<KnowledgeSource | null> {
  const assessment = await loadKnowledgeSourceAssessment(
    sourceType,
    sourceId
  );
  return assessment.readiness?.status === 'indexable'
    ? assessment.source
    : null;
}

export async function loadKnowledgeSourceAssessment(
  sourceType: KnowledgeSourceType,
  sourceId: string
): Promise<KnowledgeSourceAssessment> {
  if (sourceType === 'lesson') {
    const lesson = await prisma.lessons.findFirst({
      where: {
        id: sourceId,
        is_delete: 0,
        chapters: {
          is_delete: 0,
          courses: { is_delete: 0 },
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        knowledge_index_policy: true,
        updated_at: true,
        chapters: {
          select: {
            id: true,
            title: true,
            course_id: true,
            courses: { select: { title: true } },
          },
        },
      },
    });
    if (!lesson) return { source: null, readiness: null };
    const readiness = assessLessonContent({
      title: lesson.title,
      content: lesson.content,
      policy: lesson.knowledge_index_policy,
    });

    return {
      readiness,
      source: {
        sourceType,
        sourceId: lesson.id,
        courseId: lesson.chapters.course_id,
        lessonId: lesson.id,
        sourceVersion: lesson.updated_at,
        content: [
          `# ${lesson.chapters.courses.title}`,
          `## ${lesson.chapters.title}`,
          `### ${lesson.title}`,
          htmlToKnowledgeText(lesson.content),
        ]
          .filter(Boolean)
          .join('\n\n'),
        metadata: {
          courseTitle: lesson.chapters.courses.title,
          chapterId: lesson.chapters.id,
          chapterTitle: lesson.chapters.title,
          lessonTitle: lesson.title,
        },
      },
    };
  }

  if (sourceType === 'exercise') {
    const exercise = await prisma.exercises.findFirst({
      where: {
        id: sourceId,
        is_delete: 0,
        review_status: 'approved',
        lessons: {
          is_delete: 0,
          chapters: {
            is_delete: 0,
            courses: { is_delete: 0 },
          },
        },
      },
      select: {
        id: true,
        type: true,
        content: true,
        knowledge: true,
        knowledge_index_policy: true,
        updated_at: true,
        lesson_id: true,
        lessons: {
          select: {
            title: true,
            chapters: {
              select: {
                title: true,
                course_id: true,
                courses: { select: { title: true } },
              },
            },
          },
        },
      },
    });
    if (!exercise) return { source: null, readiness: null };
    const readiness = assessExerciseContent({
      content: exercise.content,
      knowledge: exercise.knowledge,
      policy: exercise.knowledge_index_policy,
    });

    return {
      readiness,
      source: {
        sourceType,
        sourceId: exercise.id,
        courseId: exercise.lessons.chapters.course_id,
        lessonId: exercise.lesson_id,
        sourceVersion: exercise.updated_at,
        content: [
          `# ${exercise.lessons.chapters.courses.title}`,
          `## ${exercise.lessons.chapters.title}`,
          `### ${exercise.lessons.title}`,
          `题型：${exercise.type}`,
          exercise.knowledge
            ? `知识点：${exercise.knowledge}`
            : '',
          `题目：${htmlToKnowledgeText(exercise.content)}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        metadata: {
          lessonTitle: exercise.lessons.title,
          exerciseType: exercise.type,
          knowledge: exercise.knowledge,
        },
      },
    };
  }

  return { source: null, readiness: null };
}
