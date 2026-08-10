'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FiMessageCircle,
  FiSend,
  FiSquare,
  FiTrash2,
} from 'react-icons/fi';
import {
  advanceGuidedLearning,
  clearLessonChatHistory,
  getLessonChatHistory,
  resumeGuidedLearning,
  startGuidedLearning,
  streamLessonChat,
  type GuidedLearningState,
} from '@/app/api/ai/chat';
import { AlertDialog } from '@/components/ui';
import { showToast } from '@/utils/toast';
import ChatMessageBubble from './chat/ChatMessageBubble';
import GuidedPanel from './chat/GuidedPanel';
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

const GUIDED_PHASE_LABELS: Record<GuidedLearningState['phase'], string> = {
  INIT: '准备中',
  EXPLAIN: '讲解中',
  QUESTION: '出题中',
  WAIT_ANSWER: '等待作答',
  EVALUATE: '批改中',
  HINT: '给出提示',
  REVIEW: '本轮结束',
  COMPLETE: '已完成',
  EMPTY: '暂无可用题目',
  RESTART_REQUIRED: '需重新开始',
};

function createWelcomeMessage(lessonTitle: string): ChatMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: 'assistant',
    messageType: 'system',
    content: `我是本节学习助手。你可以问我关于“${lessonTitle}”的知识点或当前练习。`,
  };
}

function createMessageId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `message-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
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
  const [guidedAvailable, setGuidedAvailable] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedState, setGuidedState] =
    useState<GuidedLearningState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const welcomeMessage = createWelcomeMessage(lessonTitle);

    getLessonChatHistory({ lessonId, signal: controller.signal })
      .then(async (bootstrap) => {
        if (controller.signal.aborted) return;
        if (bootstrap.guidedRun) {
          try {
            const restored = await resumeGuidedLearning({
              lessonId,
              runId: bootstrap.guidedRun.runId,
            });
            if (!controller.signal.aborted) {
              setGuidedState(restored);
            }
          } catch {
            // 旧图或已结束运行不影响自由对话。
          }
        }
        // 必须等 resume 落定再放出切换控件：否则这段窗口里点「引导」会因为
        // guidedState 还是 null 而另起一轮，把进行中的运行连同提示等级丢掉。
        if (controller.signal.aborted) return;
        setGuidedAvailable(bootstrap.guidedModeAvailable);
        if (bootstrap.messages.length === 0) return;
        setMessages([
          welcomeMessage,
          ...bootstrap.messages.map((message) => ({
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
      hintRequest?: boolean;
    }
  ) => {
    const hintRequest = retryContext?.hintRequest === true;
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isStreaming) return;
    // 引导模式独占界面：输入即作答，只推进状态机，不写入自由问答的消息流。
    if (guidedMode && guidedState) {
      setIsStreaming(true);
      setInput('');
      try {
        setGuidedState(
          await advanceGuidedLearning({
            lessonId,
            runId: guidedState.runId,
            expectedStateVersion: guidedState.stateVersion,
            answer: trimmedQuestion,
          })
        );
      } catch (error) {
        showToast.error(
          error instanceof Error ? error.message : '推进失败'
        );
      } finally {
        setIsStreaming(false);
      }
      return;
    }

    const outgoingMessageType =
      retryContext?.messageType ||
      resolveOutgoingMessageType(
        trimmedQuestion,
        Boolean(exerciseId),
        Boolean(currentCode?.trim()),
        hintRequest
      );
    const attachedCurrentCode =
      outgoingMessageType === 'code_analysis'
        ? retryContext?.currentCode ?? currentCode
        : undefined;
    const retryCurrentCode =
      outgoingMessageType === 'code_analysis'
        ? attachedCurrentCode ?? null
        : null;
    const assistantMessageId = createMessageId();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    setInput('');
    setMessages((previous) => [
      ...previous,
      {
        id: createMessageId(),
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
        hintRequest,
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
      hintRequest: message.retryMessageType === 'hint',
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
  const inGuidedView = guidedMode && Boolean(guidedState);
  // 只有停在 WAIT_ANSWER 才收作答；其余相位输入框不接受输入，避免向已结束的运行提交。
  const canAnswer = guidedState?.phase === 'WAIT_ANSWER';
  const guidedEnded = inGuidedView && !canAnswer;
  // 选择题在选项按钮上作答（提交的是字母），不再给一个只会判错的打字框。
  const guidedChoice =
    inGuidedView && (guidedState?.exerciseOptions?.length ?? 0) > 0;

  const beginGuidedLearning = async () => {
    if (isStreaming) return;
    try {
      setIsStreaming(true);
      setGuidedState(await startGuidedLearning(lessonId));
      setGuidedMode(true);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : '启动失败'
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FiMessageCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold">AI 助手</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {guidedAvailable && (
              <div
                role="group"
                aria-label="问答模式"
                className="flex border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
              >
                <button
                  type="button"
                  onClick={() => setGuidedMode(false)}
                  disabled={isStreaming}
                  aria-pressed={!guidedMode}
                  className={`min-h-8 px-2 text-xs font-black disabled:opacity-50 ${
                    guidedMode ? 'bg-white text-black' : 'bg-yellow-300 text-black'
                  }`}
                >
                  自由
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!guidedState) {
                      void beginGuidedLearning();
                      return;
                    }
                    setGuidedMode(true);
                  }}
                  disabled={isStreaming}
                  aria-pressed={guidedMode}
                  className={`min-h-8 border-l-2 border-black px-2 text-xs font-black disabled:opacity-50 ${
                    guidedMode ? 'bg-yellow-300 text-black' : 'bg-white text-black'
                  }`}
                >
                  引导
                </button>
              </div>
            )}
            {hasChatHistory && !inGuidedView && (
              <button
                type="button"
                onClick={() => setClearDialogOpen(true)}
                disabled={isStreaming || isClearing}
                aria-label="清空对话"
                className="inline-flex min-h-8 items-center gap-1 border-2 border-black bg-white px-2 text-xs font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiTrash2 className="size-3.5" aria-hidden="true" />
                <span className="hidden lg:inline">清空</span>
              </button>
            )}
          </div>
        </div>

        {(exerciseId || inGuidedView) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-black bg-yellow-100 px-4 py-2 text-xs font-bold text-black">
            {inGuidedView && guidedState && (
              <span>状态：{GUIDED_PHASE_LABELS[guidedState.phase] ?? guidedState.phase}</span>
            )}
            {inGuidedView && guidedState && guidedState.hintLevel > 0 && (
              <span>本轮提示 {guidedState.hintLevel}/3</span>
            )}
            {exerciseId && <span>已关联练习</span>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {inGuidedView && guidedState ? (
            <GuidedPanel
              state={guidedState}
              canAnswer={Boolean(canAnswer) && !isStreaming}
              onAnswer={(answer) => void sendMessage(answer)}
            />
          ) : (
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
          )}
        </div>

        <div className="bg-white p-3">
          {/* 快捷按钮走的是自由问答通道，引导模式下点它们会被当成作答，所以整排隐藏 */}
          {!inGuidedView && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {visibleQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() =>
                    void sendMessage(action.prompt, {
                      hintRequest: action.hintRequest,
                    })
                  }
                  disabled={isStreaming}
                  className="flex flex-shrink-0 items-center gap-1 rounded-full border-2 border-black bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all hover:bg-yellow-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
          )}
          {guidedChoice && !guidedEnded ? (
            <p className="text-xs text-gray-500">
              点上面的选项直接提交，答错会自动给提示。
            </p>
          ) : guidedEnded ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void beginGuidedLearning()}
                disabled={isStreaming}
                className="w-full border-2 border-black bg-yellow-300 px-3 py-2 text-sm font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                重新开始一轮
              </button>
              <p className="text-xs text-gray-500">
                想自由提问，点右上角「自由」。
              </p>
            </div>
          ) : (
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
              placeholder={
                inGuidedView
                  ? '输入你的答案...'
                  : exerciseId
                    ? '询问当前练习或小节内容...'
                    : '询问当前小节内容...'
              }
              maxLength={2000}
              rows={1}
              disabled={isStreaming}
              className="w-full resize-none px-4 pt-3 pb-1 text-sm outline-none disabled:bg-gray-50"
            />
            <div className="flex items-center justify-between gap-2 px-3 pb-2">
              <span className="min-w-0 truncate text-xs text-gray-400">
                {inGuidedView
                  ? 'Enter 提交答案，答错会自动给提示'
                  : 'Enter 发送，Shift + Enter 换行'}
              </span>
              {/* 引导模式没有流式响应可中断，只禁用提交，不给一个点了没反应的停止键 */}
              {isStreaming && !inGuidedView ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <FiSquare className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          )}
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
