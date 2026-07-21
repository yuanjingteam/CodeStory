import type { ComponentType } from 'react';
import {
  FiBookOpen,
  FiCode,
  FiHelpCircle,
  FiList,
  FiSearch,
  FiTarget,
} from 'react-icons/fi';
import type { ChatMessageType } from './chatTypes';

export interface QuickAction {
  label: string;
  prompt: string;
  requiresExercise?: boolean;
  requiresCode?: boolean;
  icon: ComponentType<{ className?: string }>;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: '解释知识点',
    prompt: '请用通俗的话解释本节的核心知识点，并结合一个小例子。',
    icon: FiBookOpen,
  },
  {
    label: '给我提示',
    prompt: '给我一点提示，不要直接给完整答案。',
    requiresExercise: true,
    icon: FiHelpCircle,
  },
  {
    label: '分析我的代码',
    prompt: '请分析我当前编辑器里的代码，指出可能的问题和修改方向，不要直接给完整答案。',
    requiresExercise: true,
    requiresCode: true,
    icon: FiCode,
  },
  {
    label: '分析练习',
    prompt: '请分析当前练习的解题思路，不要直接给完整答案。',
    requiresExercise: true,
    icon: FiSearch,
  },
  {
    label: '解释题目',
    prompt: '请解释当前练习题目在考什么，以及我应该怎么理解题干。',
    requiresExercise: true,
    icon: FiTarget,
  },
  {
    label: '总结本节',
    prompt: '请总结本节重点，并列出我需要掌握的 3 个要点。',
    icon: FiList,
  },
];

function isCodeAnalysisIntent(question: string): boolean {
  return /代码|程序|报错|错误|bug|运行|不通过|哪里有问题|帮我看|分析我的代码|current code|code/i.test(
    question
  );
}

export function resolveOutgoingMessageType(
  question: string,
  hasExercise: boolean,
  hasCurrentCode: boolean
): ChatMessageType {
  if (hasExercise && /提示|给点思路|给.*思路|没思路|不会做|卡住|hint|clue/i.test(question)) {
    return 'hint';
  }

  if (hasExercise && hasCurrentCode && isCodeAnalysisIntent(question)) {
    return 'code_analysis';
  }

  return 'chat';
}
