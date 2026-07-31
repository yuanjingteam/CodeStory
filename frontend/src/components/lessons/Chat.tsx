'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FiMessageCircle,
  FiSend,
  FiSquare,
  FiTrash2,
} from 'react-icons/fi';
import {
  clearLessonChatHistory,
  getLessonChatHistory,
  streamLessonChat,
} from '@/app/api/ai/chat';
import { AlertDialog } from '@/components/ui';
import { showToast } from '@/utils/toast';
import ChatMessageBubble from './chat/ChatMessageBubble';
import { QUICK_ACTIONS, resolveOutgoingMessageType } from './chat/chatActions';
import { getAiErrorMessage } from './chat/chatErrors';
import type { ChatMessage, ChatMessageType } from './chat/chatTypes';

interface ChatProps {
  lessonId: string;
  lessonTitle: string;
  exerciseId: string | null;
  currentCode?: string | null;
}

const WELCOME_MESSAGE_ID = 'welcome';

function createWelcomeMessage(lessonTitle: string): ChatMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: 'assistant',
    messageType: 'system',
    content: `我是本节学习助手。你可以问我关于“${lessonTitle}”的知识点或当前练习。`,
  };
}

export default function Chat({
  lessonId,
  lessonTitle,
  exerciseId,
  currentCode,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(lessonTitle),
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
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
            messageType: message.messageType || 'chat',
            content: message.content,
            answerScope: message.answerScope,
            promptVersion: message.promptVersion,
            promptRevision: message.promptRevision,
            evidenceQuality: message.evidenceQuality,
            sources: message.sources,
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

  const sendMessage = async (
    question: string,
    retryContext?: {
      messageType?: ChatMessageType;
      currentCode?: string | null;
    }
  ) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isStreaming) return;

    const outgoingMessageType =
      retryContext?.messageType ||
      resolveOutgoingMessageType(
        trimmedQuestion,
        Boolean(exerciseId),
        Boolean(currentCode?.trim())
      );
    const attachedCurrentCode =
      outgoingMessageType === 'code_analysis'
        ? retryContext?.currentCode ?? currentCode
        : undefined;
    const retryCurrentCode =
      outgoingMessageType === 'code_analysis'
        ? attachedCurrentCode ?? null
        : null;
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
        messageType: outgoingMessageType,
        content: trimmedQuestion,
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        messageType: outgoingMessageType,
        content: '',
        status: 'streaming',
        retryQuestion: trimmedQuestion,
        retryMessageType: outgoingMessageType,
        retryCurrentCode,
      },
    ]);

    try {
      await streamLessonChat({
        lessonId,
        exerciseId,
        currentCode: attachedCurrentCode,
        message: trimmedQuestion,
        answerScope: 'auto',
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
        onContext: (context) => {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantMessageId
                ? { ...message, ...context }
                : message
            )
          );
        },
        onFinal: (content) => {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content }
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
                  errorCode: undefined,
                  status: 'stopped',
                }
              : message
          )
        );
      } else {
        const errorPayload = getAiErrorMessage(error);
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: message.content || errorPayload.message,
                  errorCode: errorPayload.code,
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
    void sendMessage(message.retryQuestion, {
      messageType: message.retryMessageType,
      currentCode: message.retryCurrentCode,
    });
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const clearHistory = async () => {
    if (isStreaming || isClearing) return;

    try {
      setIsClearing(true);
      await clearLessonChatHistory({ lessonId });
      setMessages([createWelcomeMessage(lessonTitle)]);
      setClearDialogOpen(false);
      showToast.success('本节对话已清空');
    } catch (error) {
      const errorPayload = getAiErrorMessage(error);
      showToast.error(errorPayload.message);
    } finally {
      setIsClearing(false);
    }
  };

  const visibleQuickActions = QUICK_ACTIONS.filter(
    (action) =>
      (!action.requiresExercise || exerciseId) &&
      (!action.requiresCode || currentCode?.trim())
  );
  const hasChatHistory = messages.some(
    (message) => message.id !== WELCOME_MESSAGE_ID
  );

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FiMessageCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold">AI 学习助手</span>
          </div>
          <div className="flex items-center gap-2">
            {exerciseId && (
              <span className="text-xs bg-yellow-300 text-black border-2 border-black px-2 py-0.5 font-bold flex-shrink-0">
                已关联当前练习
              </span>
            )}
            {hasChatHistory && (
              <button
                type="button"
                onClick={() => setClearDialogOpen(true)}
                disabled={isStreaming || isClearing}
                aria-label="清空对话"
                className="inline-flex min-h-8 items-center gap-1 border-2 border-black bg-white px-2 text-xs font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiTrash2 className="size-3.5" aria-hidden="true" />
                清空
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                isStreaming={isStreaming}
                onRetry={retryMessage}
              />
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
      <AlertDialog
        open={clearDialogOpen}
        title="清空本节对话？"
        description="将删除当前小节的对话历史，练习进度和已使用的提示不会受影响。"
        confirmText="清空"
        cancelText="取消"
        variant="danger"
        loading={isClearing}
        onConfirm={() => void clearHistory()}
        onOpenChange={(open) => {
          if (!isClearing) setClearDialogOpen(open);
        }}
      />
    </>
  );
}
