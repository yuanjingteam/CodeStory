import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { getAiConfig } from '../../config/ai';
import type { LessonAiContext } from './lesson-context.service';

const lessonTutorPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是 CodeStory 当前小节的编程学习导师，不是通用聊天机器人。

你的任务：
1. 优先根据给定课程、小节正文和当前练习回答。
2. 引导学生理解和思考，除非用户明确需要核对，否则不要直接给出完整练习答案。
3. 不得泄露标准答案、隐藏测试或虚构课程中没有的信息。
4. 与当前学习无关的问题只做简短回应，然后引导回当前小节。
5. 使用简洁、清晰的中文；代码使用 Markdown 代码块。
6. 如果上下文不足，请明确说明。

课程：{courseTitle}
章节：{chapterTitle}
小节：{lessonTitle}

小节正文：
{lessonContent}

当前练习：
{exerciseContext}`,
  ],
  ['human', '{question}'],
]);

function createModel(): ChatOpenAI {
  const config = getAiConfig();

  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: 0.3,
    timeout: config.timeoutMs,
    maxTokens: config.maxTokens,
    streaming: true,
    streamUsage: false,
    configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
  });
}

function formatExercise(context: LessonAiContext): string {
  if (!context.exercise) return '当前未打开练习，仅围绕小节正文回答。';

  return [
    `题型：${context.exercise.type}`,
    `知识点：${context.exercise.knowledge}`,
    `题目：${context.exercise.content}`,
  ].join('\n');
}

function getChunkText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((block) => {
      if (typeof block === 'string') return block;
      if (
        block &&
        typeof block === 'object' &&
        'text' in block &&
        typeof block.text === 'string'
      ) {
        return block.text;
      }
      return '';
    })
    .join('');
}

export async function* streamLessonChat(
  context: LessonAiContext,
  question: string,
  signal: AbortSignal
): AsyncGenerator<string> {
  const chain = lessonTutorPrompt.pipe(createModel());
  const stream = await chain.stream(
    {
      courseTitle: context.courseTitle,
      chapterTitle: context.chapterTitle,
      lessonTitle: context.lessonTitle,
      lessonContent: context.lessonContent,
      exerciseContext: formatExercise(context),
      question,
    },
    { signal }
  );

  for await (const chunk of stream) {
    const text = getChunkText(chunk.content);
    if (text) yield text;
  }
}
