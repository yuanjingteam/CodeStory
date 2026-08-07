import { describe, expect, it } from 'vitest';
import {
  assessExerciseContent,
  assessLessonContent,
  htmlToKnowledgeText,
  summarizeKnowledgeStates,
} from '../../src/services/rag';
import {
  formatKnowledgeContext,
  getAnswerScopeInstructions,
  getInvalidCitationIndexes,
  getLessonTutorPromptRevision,
  normalizeLessonChatAnswer,
  resolveAnswerScope,
} from '../../src/services/ai/lesson-chat.service';
import type { LessonAiContext } from '../../src/services/ai/lesson-context.service';
import { buildHistoryAwareRetrievalQuery } from '../../src/services/ai/lesson-context.service';

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
    ragEnabled: true,
    retrievalMode: 'fallback',
    evidenceQuality: 'empty',
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

  it('grounded-v3 无可用证据时不重新注入被排除正文', () => {
    expect(
      formatKnowledgeContext(createContext(), 'grounded-v3')
    ).toBe(
      '<no_course_evidence>当前没有可用课程证据</no_course_evidence>'
    );
  });

  it('grounded-v3 使用编号证据并识别越界引用', () => {
    const context = createContext({
      retrievalMode: 'full_context',
      evidenceQuality: 'strong',
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
          score: 1,
        },
      ],
    });

    expect(
      formatKnowledgeContext(context, 'grounded-v3')
    ).toContain('<evidence index="1"');
    expect(getInvalidCitationIndexes('结论 [1]，错误 [3]', 1)).toEqual([
      3,
    ]);
  });

  it('课程限定优先，明确举例或应用时自动进入扩展模式', () => {
    expect(resolveAnswerScope('请只按课程举一个例子')).toBe(
      'course'
    );
    expect(resolveAnswerScope('这个知识在实际项目中怎么用？')).toBe(
      'extended'
    );
    expect(resolveAnswerScope('总结本节重点')).toBe('course');
    expect(resolveAnswerScope('总结本节重点', 'extended')).toBe(
      'extended'
    );
  });

  it('grounded-v3.1 将证据未明确的应用细节限定在通用补充', () => {
    const instructions = getAnswerScopeInstructions('extended');

    expect(instructions).toContain('实际编程中如何应用');
    expect(instructions).toContain('全部移到通用补充');
    expect(instructions).toContain('不得通过添加课程引用');
    expect(getLessonTutorPromptRevision('grounded-v2')).toBe(
      'grounded-v2.0'
    );
    expect(getLessonTutorPromptRevision('grounded-v3')).toBe(
      'grounded-v3.1-boundary'
    );
  });

  it('扩展回答缺少标题时确定性分隔课程结论与通用补充', () => {
    const answer = [
      '课程只说明了 WHERE 用于过滤记录 [1]。',
      '',
      '实际项目中还应配合参数化查询。',
    ].join('\n');
    const normalized = normalizeLessonChatAnswer(
      answer,
      'extended'
    );

    expect(normalized).toContain(
      '### 课程内结论\n\n课程只说明了 WHERE 用于过滤记录 [1]。'
    );
    expect(normalized).toContain(
      '### 通用补充（非课程原文）\n\n实际项目中还应配合参数化查询。'
    );
    expect(
      normalizeLessonChatAnswer(normalized, 'extended')
    ).toBe(normalized);
  });

  it('只为指代型追问拼接最近问题且限制历史长度', () => {
    expect(
      buildHistoryAwareRetrievalQuery(
        '这个在代码里怎么用？',
        '请解释 WHERE 子句'
      )
    ).toBe(
      '请解释 WHERE 子句\n当前追问：这个在代码里怎么用？'
    );
    expect(
      buildHistoryAwareRetrievalQuery(
        '请解释 ORDER BY',
        '上一条问题'
      )
    ).toBe('请解释 ORDER BY');
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
