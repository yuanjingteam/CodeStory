import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { getAiConfig } from '../../config/ai';

export interface ExerciseHintInput {
  hintLevel: number;
  exerciseType: string;
  knowledge: string;
  content: string;
  lessonContent?: string;
  adminHints: string[];
}

const exerciseHintPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是 CodeStory 的编程学习导师，负责给学生分级提示，而不是直接给答案。

你必须遵守：
1. 如果提供了管理员提示，必须以管理员提示为依据，不要偏离出题人意图。
2. 如果没有管理员提示，才可以根据题目、知识点和小节内容生成兜底提示。
3. hintLevel=1：只给方向和相关知识点，不给代码、不泄露答案。
4. hintLevel=2：给解题步骤、关键语法或关键判断，但不直接给完整答案。
5. hintLevel=3：可以给局部关键表达式或更接近答案的线索，但仍不要直接给完整答案。
6. 回复要简洁，使用中文，最多 120 字。

题型：{exerciseType}
知识点：{knowledge}
当前提示等级：{hintLevel}

小节正文：
{lessonContent}

题目：
{content}

管理员提示：
{adminHints}`,
  ],
  ['human', '请生成当前等级的学习提示。'],
]);

function createModel(): ChatOpenAI {
  const config = getAiConfig();

  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: 0.2,
    timeout: config.timeoutMs,
    maxTokens: Math.min(config.maxTokens, 300),
    configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
  });
}

function getMessageText(content: unknown): string {
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

export async function generateExerciseHint(input: ExerciseHintInput): Promise<string> {
  const chain = exerciseHintPrompt.pipe(createModel());
  const response = await chain.invoke({
    hintLevel: input.hintLevel,
    exerciseType: input.exerciseType,
    knowledge: input.knowledge || '未标注',
    content: input.content,
    lessonContent: input.lessonContent || '暂无小节正文',
    adminHints:
      input.adminHints.length > 0
        ? input.adminHints.map((hint, index) => `提示${index + 1}：${hint}`).join('\n')
        : '无管理员提示，请使用兜底提示模式。',
  });

  return getMessageText(response.content).trim();
}
