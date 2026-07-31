import { describe, expect, it } from 'vitest';
import {
  assessExerciseContent,
  assessLessonContent,
  htmlToKnowledgeText,
  summarizeKnowledgeStates,
} from '../../src/services/rag';
import { formatKnowledgeContext } from '../../src/services/ai/lesson-chat.service';
import type { LessonAiContext } from '../../src/services/ai/lesson-context.service';

function createContext(
  overrides: Partial<LessonAiContext> = {}
): LessonAiContext {
  return {
    lessonId: 'lesson-id',
    exerciseId: null,
    courseId: 'course-id',
    courseTitle: '数据库',
    chapterTitle: 'SQL',
    lessonTitle: '查询',
    lessonContent: '原始小节正文',
    exercise: null,
    retrievalMode: 'fallback',
    evidence: [],
    ...overrides,
  };
}

describe('阶段 1 · RAG 上下文', () => {
  it('使用 html-to-text 移除脚本和样式但保留正文结构', () => {
    const text = htmlToKnowledgeText(
      '<style>.x{color:red}</style><h2>标题</h2><p>正文 &amp; 示例</p><script>alert(1)</script>'
    );

    expect(text).toContain('标题');
    expect(text).toContain('正文 & 示例');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('alert(1)');
  });

  it('检索成功时只注入带边界的证据，不重复完整正文', () => {
    const value = formatKnowledgeContext(
      createContext({
        retrievalMode: 'retrieved',
        evidence: [
          {
            sourceType: 'lesson',
            sourceId: 'source-id',
            courseId: 'course-id',
            lessonId: 'lesson-id',
            sourceVersion: new Date('2026-07-30T00:00:00Z'),
            chunkIndex: 0,
            content: 'SELECT 使用 WHERE 过滤。',
            contentHash: 'a'.repeat(64),
            score: 0.95,
          },
        ],
      })
    );

    expect(value).toContain('<evidence');
    expect(value).toContain('不可信课程数据');
    expect(value).toContain('SELECT 使用 WHERE 过滤。');
    expect(value).not.toContain('原始小节正文');
  });

  it('无证据时明确回退完整小节正文', () => {
    expect(formatKnowledgeContext(createContext())).toContain(
      '<fallback_lesson_content>\n原始小节正文'
    );
  });
});

describe('阶段 1 · 管理员索引状态摘要', () => {
  const sources = [
    { sourceType: 'lesson' as const, sourceId: 'lesson-1' },
    { sourceType: 'exercise' as const, sourceId: 'exercise-1' },
  ];
  const state = (sourceId: string, status: string) => ({
    source_type:
      sourceId.startsWith('lesson') ? 'lesson' : 'exercise',
    source_id: sourceId,
    status,
    updated_at: new Date('2026-07-30T00:00:00Z'),
  });

  it.each([
    ['ready', [state('lesson-1', 'ready'), state('exercise-1', 'ready')]],
    ['pending', [state('lesson-1', 'pending'), state('exercise-1', 'pending')]],
    ['failed', [state('lesson-1', 'failed'), state('exercise-1', 'invalid')]],
    ['partial', [state('lesson-1', 'ready'), state('exercise-1', 'failed')]],
    ['needs_content', [state('lesson-1', 'needs_content')]],
    ['needs_review', [state('lesson-1', 'needs_review')]],
    ['excluded', [state('lesson-1', 'excluded'), state('exercise-1', 'excluded')]],
    ['not_indexed', []],
  ])('聚合为 %s', (expected, states) => {
    expect(summarizeKnowledgeStates(sources, states).status).toBe(
      expected
    );
  });
});

describe('阶段 1 · 内容就绪门禁', () => {
  it('阻止空正文和仅重复标题的小节进入索引', () => {
    expect(
      assessLessonContent({
        title: '变量声明',
        content: '',
      }).status
    ).toBe('needs_content');
    expect(
      assessLessonContent({
        title: '变量声明',
        content: '<h2>变量声明</h2>',
      }).status
    ).toBe('needs_content');
  });

  it('自动模式标记短内容，人工确认可纳入非空短内容', () => {
    const input = {
      title: '变量声明',
      content: '<p>使用 let 声明变量。</p>',
    };
    expect(assessLessonContent(input).status).toBe('needs_review');
    expect(
      assessLessonContent({ ...input, policy: 'include' }).status
    ).toBe('indexable');
  });

  it('人工纳入不能绕过空内容，排除策略优先', () => {
    expect(
      assessLessonContent({
        title: '空小节',
        content: '',
        policy: 'include',
      }).status
    ).toBe('needs_content');
    expect(
      assessExerciseContent({
        content: '完整的问题描述应该如何处理这个场景？',
        knowledge: '变量声明',
        policy: 'exclude',
      }).status
    ).toBe('excluded');
  });

  it('题目缺少知识点时进入待审核，人工确认后可纳入', () => {
    const input = {
      content: '请说明 JavaScript 中 let 与 const 的主要区别。',
      knowledge: '',
    };
    expect(assessExerciseContent(input).status).toBe('needs_review');
    expect(
      assessExerciseContent({ ...input, policy: 'include' }).status
    ).toBe('indexable');
  });
});
