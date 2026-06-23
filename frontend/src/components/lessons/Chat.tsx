'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FiBookOpen,
  FiHelpCircle,
  FiList,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiSquare,
  FiTarget,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getLessonChatHistory, streamLessonChat } from '@/app/api/ai/chat';

interface ChatProps {
  lessonId: string;
  lessonTitle: string;
  exerciseId: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'error' | 'stopped';
  retryQuestion?: string;
}

const WELCOME_MESSAGE_ID = 'welcome';

interface QuickAction {
  label: string;
  prompt: string;
  requiresExercise?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_ACTIONS: QuickAction[] = [
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

function createWelcomeMessage(lessonTitle: string): ChatMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: 'assistant',
    content: `我是本节学习助手。你可以问我关于“${lessonTitle}”的知识点或当前练习。`,
  };
}

export default function Chat({ lessonId, lessonTitle, exerciseId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(lessonTitle),
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const welcomeMessage = createWelcomeMessage(lessonTitle);

    getLessonChatHistory({ lessonId, signal: controller.signal })
      .then((history) => {
        if (controller.signal.aborted || history.length === 0) return;

        setMessages([
          welcomeMessage,
          ...history.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          })),
        ]);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn('获取 AI 对话历史失败:', error);
      });

    return () => controller.abort();
  }, [lessonId, lessonTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const sendMessage = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isStreaming) return;

    const assistantMessageId = crypto.randomUUID();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    setInput('');
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedQuestion,
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        retryQuestion: trimmedQuestion,
      },
    ]);

    try {
      await streamLessonChat({
        lessonId,
        exerciseId,
        message: trimmedQuestion,
        signal: controller.signal,
        onToken: (token) => {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: message.content + token }
                : message
            )
          );
        },
      });

      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantMessageId
            ? { ...message, status: undefined }
            : message
        )
      );
    } catch (error) {
      if (controller.signal.aborted) {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: message.content || '已停止生成。',
                  status: 'stopped',
                }
              : message
          )
        );
      } else {
        const errorMessage = error instanceof Error ? error.message : 'AI 服务调用失败';
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: message.content || errorMessage,
                  status: 'error',
                }
              : message
          )
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  const retryMessage = (message: ChatMessage) => {
    if (!message.retryQuestion) return;
    setMessages((previous) => {
      const failedIndex = previous.findIndex((item) => item.id === message.id);
      return previous.filter((item, index) => {
        const isFailedResponse = item.id === message.id;
        const isOriginalQuestion =
          index === failedIndex - 1 &&
          item.role === 'user' &&
          item.content === message.retryQuestion;
        return !isFailedResponse && !isOriginalQuestion;
      });
    });
    void sendMessage(message.retryQuestion);
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const visibleQuickActions = QUICK_ACTIONS.filter(
    (action) => !action.requiresExercise || exerciseId
  );

  return (
    <div className="h-full flex flex-col">
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FiMessageCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold">AI 学习助手</span>
        </div>
        {exerciseId && (
          <span className="text-xs bg-yellow-300 text-black border-2 border-black px-2 py-0.5 font-bold flex-shrink-0">
            已关联当前练习
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex min-w-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] min-w-0 overflow-hidden border-2 border-black rounded-lg px-3 py-2 text-sm shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                  message.role === 'user'
                    ? 'bg-yellow-300 text-black'
                    : message.status === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-white text-gray-800'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none break-words prose-p:break-words prose-li:break-words prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-gray-900 prose-pre:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content || '正在思考...'}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}

                {message.status === 'streaming' && (
                  <span className="inline-block w-2 h-4 ml-1 bg-purple-600 animate-pulse align-middle" />
                )}

                {message.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => retryMessage(message)}
                    disabled={isStreaming}
                    className="mt-2 flex items-center gap-1 font-bold text-purple-700 disabled:opacity-50"
                  >
                    <FiRefreshCw />
                    重新发送
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white p-3">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {visibleQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => void sendMessage(action.prompt)}
                disabled={isStreaming}
                className="flex flex-shrink-0 items-center gap-1 rounded-full border-2 border-black bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all hover:bg-yellow-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </button>
            );
          })}
        </div>
        <div className="border-2 border-black rounded-2xl bg-white overflow-hidden">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={exerciseId ? '询问当前练习或小节内容...' : '询问当前小节内容...'}
            maxLength={2000}
            rows={1}
            disabled={isStreaming}
            className="w-full resize-none px-4 pt-3 pb-1 text-sm outline-none disabled:bg-gray-50"
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs text-gray-400">Enter 发送，Shift + Enter 换行</span>
            {isStreaming ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
              >
                <FiSquare className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void sendMessage(input)}
                disabled={!input.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500"
              >
                <FiSend className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
