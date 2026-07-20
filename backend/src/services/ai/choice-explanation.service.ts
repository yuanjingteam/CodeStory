import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  createChatModel,
  extractJsonObject,
  getMessageText,
} from './_shared/model';

export interface ChoiceOptionExplanation {
  label: string;
  explanation: string;
  isCorrect: boolean;
}

export interface ChoiceExplanation {
  summary: string;
  correctOption: string;
  selectedOption: string;
  correctExplanation: string;
  selectedExplanation: string;
  optionExplanations: ChoiceOptionExplanation[];
  studyTip: string;
}

export interface ChoiceExplanationInput {
  exerciseContent: string;
  knowledge: string | null;
  options: Array<{ label: string; content: string; isCorrect: boolean; isSelected: boolean }>;
  correctOption: string;
  selectedOption: string;
  analysis: string | null;
}

const choiceExplanationPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是 CodeStory 的选择题讲解助手。

你的任务：
1. 解释选择题答案，不参与判分。
2. 说明正确选项为什么正确。
3. 说明学生选择的选项为什么正确或错误。
4. 简要说明其他选项的问题。
5. 不要改判题结果，不要质疑系统给出的正确选项。
6. 使用中文，表达清楚，适合初学者。
7. 只输出 JSON，不要输出 Markdown，不要输出代码块。

必须返回如下 JSON 结构：
{{
  "summary": "这道题考查 WHERE 子句的作用。",
  "correctOption": "A",
  "selectedOption": "B",
  "correctExplanation": "A 正确，因为 ...",
  "selectedExplanation": "B 不正确，因为 ...",
  "optionExplanations": [
    {{"label": "A", "explanation": "正确，因为 ...", "isCorrect": true}},
    {{"label": "B", "explanation": "不正确，因为 ...", "isCorrect": false}}
  ],
  "studyTip": "记住：WHERE 用来筛选行。"
}}`,
  ],
  [
    'human',
    `题目：
{exerciseContent}

知识点：
{knowledge}

选项：
{options}

系统判定的正确选项：
{correctOption}

学生选择的选项：
{selectedOption}

题目解析：
{analysis}`,
  ],
]);

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function validateExplanation(value: unknown): ChoiceExplanation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('CHOICE_EXPLANATION_INVALID_OBJECT');
  }

  const data = value as Record<string, unknown>;
  const optionExplanations = Array.isArray(data.optionExplanations)
    ? data.optionExplanations
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          label: toText(item.label, ''),
          explanation: toText(item.explanation, ''),
          isCorrect: Boolean(item.isCorrect),
        }))
        .filter((item) => item.label && item.explanation)
    : [];

  return {
    summary: toText(data.summary, '这道题主要考查当前知识点的理解。'),
    correctOption: toText(data.correctOption, ''),
    selectedOption: toText(data.selectedOption, ''),
    correctExplanation: toText(data.correctExplanation, '正确选项符合题目要求。'),
    selectedExplanation: toText(data.selectedExplanation, '请对照正确选项和题目要求理解差异。'),
    optionExplanations,
    studyTip: toText(data.studyTip, '建议回到题目要求，逐项核对每个选项。'),
  };
}

function formatOptions(input: ChoiceExplanationInput): string {
  return input.options
    .map((option) => {
      const tags = [
        option.isCorrect ? '正确选项' : '',
        option.isSelected ? '学生选择' : '',
      ].filter(Boolean);
      return `${option.label}. ${option.content}${tags.length > 0 ? `（${tags.join('，')}）` : ''}`;
    })
    .join('\n');
}

export async function generateChoiceExplanation(
  input: ChoiceExplanationInput
): Promise<ChoiceExplanation> {
  const chain = choiceExplanationPrompt.pipe(
    createChatModel({ temperature: 0.2, maxTokens: 800 })
  );
  const response = await chain.invoke({
    exerciseContent: input.exerciseContent,
    knowledge: input.knowledge || '未标注',
    options: formatOptions(input),
    correctOption: input.correctOption,
    selectedOption: input.selectedOption,
    analysis: input.analysis || '暂无解析',
  });

  const rawContent = getMessageText(response.content).trim();
  return validateExplanation(
    extractJsonObject(rawContent, 'CHOICE_EXPLANATION_JSON_NOT_FOUND')
  );
}
