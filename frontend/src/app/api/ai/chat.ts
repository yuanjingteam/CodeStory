import { getToken } from '@/utils/jwt';
import {
  handleAuthenticationFailure,
  isRefreshSessionExpired,
  refreshAccessToken,
} from '@/utils/auth-session';
import {
  AiChatStreamError,
  parseAiChatErrorPayload,
  type AiChatErrorCode,
} from './chat-error';

export type LessonAnswerScope = 'course' | 'extended';
export type LessonAnswerScopeRequest =
  | 'auto'
  | LessonAnswerScope;
export type LessonEvidenceQuality = 'strong' | 'thin' | 'empty';
export type LessonTutorPromptRevision =
  | 'grounded-v2.0'
  | 'grounded-v3.1-boundary';

export interface LessonChatSourceReference {
  index: number;
  sourceType: 'lesson' | 'exercise' | 'doc';
  sourceId: string;
  title: string;
  chunkIndex: number;
  contentHash: string;
  score?: number;
}

export interface LessonChatContextEvent {
  answerScope: LessonAnswerScope;
  promptVersion: 'grounded-v2' | 'grounded-v3';
  promptRevision: LessonTutorPromptRevision;
  evidenceQuality: LessonEvidenceQuality;
  sources: LessonChatSourceReference[];
}

interface StreamChatParams {
  lessonId: string;
  exerciseId?: string | null;
  currentCode?: string | null;
  message: string;
  answerScope?: LessonAnswerScopeRequest;
  signal: AbortSignal;
  onToken: (token: string) => void;
  onContext?: (context: LessonChatContextEvent) => void;
  onFinal?: (content: string) => void;
  onState?: (state: {
    runId: string;
    stateVersion: number;
    phase: GuidedLearningPhase;
    hintLevel: number;
  }) => void;
}

interface LessonChatHistoryParams {
  lessonId: string;
  signal?: AbortSignal;
}

interface ClearLessonChatHistoryParams {
  lessonId: string;
}

export interface LessonChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  messageType?: 'chat' | 'hint' | 'code_analysis' | 'system';
  content: string;
  createdAt: string;
  answerScope?: LessonAnswerScope;
  promptVersion?: 'grounded-v2' | 'grounded-v3';
  promptRevision?: LessonTutorPromptRevision;
  evidenceQuality?: LessonEvidenceQuality;
  sources?: LessonChatSourceReference[];
}

export type GuidedLearningPhase =
  | 'INIT'
  | 'EXPLAIN'
  | 'QUESTION'
  | 'WAIT_ANSWER'
  | 'EVALUATE'
  | 'HINT'
  | 'REVIEW'
  | 'COMPLETE'
  | 'EMPTY'
  | 'RESTART_REQUIRED';

export interface GuidedLearningState {
  runId: string;
  graphVersion: string;
  stateVersion: number;
  phase: GuidedLearningPhase;
  lessonId: string;
  exerciseId: string | null;
  exerciseContent: string | null;
  exerciseType: string | null;
  explanation: string | null;
  hintLevel: number;
  hint: string | null;
  feedback: string | null;
  score: number | null;
  correct: boolean | null;
  requiresHumanReview: boolean;
}

export interface LessonChatBootstrap {
  messages: LessonChatHistoryMessage[];
  guidedModeAvailable: boolean;
  guidedRun: {
    runId: string;
    stateVersion: number;
    graphVersion: string | null;
  } | null;
}

interface StreamEvent {
  type:
    | 'start'
    | 'state'
    | 'context'
    | 'token'
    | 'done'
    | 'error';
  code?: AiChatErrorCode;
  content?: string;
  message?: string;
  answerScope?: LessonAnswerScope;
  promptVersion?: 'grounded-v2' | 'grounded-v3';
  promptRevision?: LessonTutorPromptRevision;
  evidenceQuality?: LessonEvidenceQuality;
  sources?: LessonChatSourceReference[];
  guidedState?: {
    runId: string;
    stateVersion: number;
    phase: GuidedLearningPhase;
    hintLevel: number;
  };
}

async function getErrorCode(response: Response): Promise<string | undefined> {
  try {
    const data = (await response.clone().json()) as { code?: string };
    return data.code;
  } catch {
    return undefined;
  }
}

function requestChatStream(
  token: string,
  lessonId: string,
  exerciseId: string | null | undefined,
  currentCode: string | null | undefined,
  message: string,
  answerScope: LessonAnswerScopeRequest,
  signal: AbortSignal
) {
  return fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/chat/stream`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
        exerciseId: exerciseId || undefined,
        currentCode: currentCode?.trim() || undefined,
        message,
        answerScope,
      }),
      signal,
    }
  );
}

async function getAccessTokenOrRefresh(): Promise<string> {
  const token = getToken();
  if (token) return token;

  try {
    const refreshed = await refreshAccessToken();
    return refreshed.accessToken;
  } catch (error) {
    if (isRefreshSessionExpired(error)) {
      handleAuthenticationFailure();
      throw new Error('登录已过期，请重新登录');
    }
    throw new Error('网络异常，暂时无法恢复登录状态');
  }
}

function requestChatHistory(token: string, lessonId: string, signal?: AbortSignal) {
  return fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/chat/history?lessonId=${encodeURIComponent(lessonId)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    }
  );
}

function requestClearChatHistory(token: string, lessonId: string) {
  return fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/chat/history?lessonId=${encodeURIComponent(lessonId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function getLessonChatHistory({
  lessonId,
  signal,
}: LessonChatHistoryParams): Promise<LessonChatBootstrap> {
  const token = await getAccessTokenOrRefresh();

  let response = await requestChatHistory(token, lessonId, signal);

  if (
    response.status === 401 &&
    (await getErrorCode(response)) === 'ACCESS_TOKEN_EXPIRED'
  ) {
    try {
      const refreshed = await refreshAccessToken();
      response = await requestChatHistory(refreshed.accessToken, lessonId, signal);
    } catch (error) {
      if (isRefreshSessionExpired(error)) {
        handleAuthenticationFailure();
        throw new Error('登录已过期，请重新登录');
      }
      throw new Error('网络异常，暂时无法续期登录状态');
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleAuthenticationFailure();
      throw new Error('登录已过期，请重新登录');
    }
    const payload = await parseAiChatErrorPayload(response);
    throw new AiChatStreamError(payload.message, payload.code);
  }

  const payload = (await response.json()) as {
    data?: Partial<LessonChatBootstrap>;
  };

  return {
    messages: payload.data?.messages || [],
    guidedModeAvailable:
      payload.data?.guidedModeAvailable === true,
    guidedRun: payload.data?.guidedRun || null,
  };
}

async function requestGuidedLearning(
  path: string,
  init: RequestInit
): Promise<GuidedLearningState> {
  const request = async (token: string) =>
    fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/guided/${path}`,
      {
        ...init,
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      }
    );
  let response = await request(await getAccessTokenOrRefresh());
  if (
    response.status === 401 &&
    (await getErrorCode(response)) === 'ACCESS_TOKEN_EXPIRED'
  ) {
    response = await request((await refreshAccessToken()).accessToken);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(payload.message || '引导式学习暂时不可用');
  }
  const payload = (await response.json()) as {
    data: GuidedLearningState;
  };
  return payload.data;
}

export function startGuidedLearning(lessonId: string) {
  return requestGuidedLearning('start', {
    method: 'POST',
    body: JSON.stringify({ lessonId }),
  });
}

export function advanceGuidedLearning(params: {
  lessonId: string;
  runId: string;
  expectedStateVersion: number;
  answer: string;
}) {
  return requestGuidedLearning('advance', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function resumeGuidedLearning(params: {
  lessonId: string;
  runId: string;
}) {
  const query = new URLSearchParams({
    lessonId: params.lessonId,
    runId: params.runId,
  });
  return requestGuidedLearning(`resume?${query}`, {
    method: 'GET',
  });
}

export async function clearLessonChatHistory({
  lessonId,
}: ClearLessonChatHistoryParams): Promise<number> {
  const token = await getAccessTokenOrRefresh();
  let response = await requestClearChatHistory(token, lessonId);

  if (
    response.status === 401 &&
    (await getErrorCode(response)) === 'ACCESS_TOKEN_EXPIRED'
  ) {
    try {
      const refreshed = await refreshAccessToken();
      response = await requestClearChatHistory(
        refreshed.accessToken,
        lessonId
      );
    } catch (error) {
      if (isRefreshSessionExpired(error)) {
        handleAuthenticationFailure();
        throw new Error('登录已过期，请重新登录');
      }
      throw new Error('网络异常，暂时无法续期登录状态');
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleAuthenticationFailure();
      throw new Error('登录已过期，请重新登录');
    }
    const payload = await parseAiChatErrorPayload(response);
    throw new AiChatStreamError(payload.message, payload.code);
  }

  const payload = (await response.json()) as {
    data?: { deletedCount?: number };
  };
  return payload.data?.deletedCount || 0;
}

export async function streamLessonChat({
  lessonId,
  exerciseId,
  currentCode,
  message,
  answerScope = 'auto',
  signal,
  onToken,
  onContext,
  onFinal,
  onState,
}: StreamChatParams): Promise<void> {
  const token = await getAccessTokenOrRefresh();

  let response = await requestChatStream(
    token,
    lessonId,
    exerciseId,
    currentCode,
    message,
    answerScope,
    signal
  );

  if (
    response.status === 401 &&
    (await getErrorCode(response)) === 'ACCESS_TOKEN_EXPIRED'
  ) {
    try {
      const refreshed = await refreshAccessToken();
      response = await requestChatStream(
        refreshed.accessToken,
        lessonId,
        exerciseId,
        currentCode,
        message,
        answerScope,
        signal
      );
    } catch (error) {
      if (isRefreshSessionExpired(error)) {
        handleAuthenticationFailure();
        throw new Error('登录已过期，请重新登录');
      }
      throw new Error('网络异常，暂时无法续期登录状态');
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleAuthenticationFailure();
      throw new Error('登录已过期，请重新登录');
    }
    const payload = await parseAiChatErrorPayload(response);
    throw new AiChatStreamError(payload.message, payload.code);
  }

  if (!response.body) {
    throw new Error('浏览器不支持流式响应');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    if (!line.trim()) return;

    const event = JSON.parse(line) as StreamEvent;
    if (event.type === 'token' && event.content) {
      onToken(event.content);
    } else if (event.type === 'state' && event.guidedState) {
      onState?.(event.guidedState);
    } else if (
      event.type === 'context' &&
      event.answerScope &&
      event.promptVersion &&
      event.promptRevision &&
      event.evidenceQuality
    ) {
      onContext?.({
        answerScope: event.answerScope,
        promptVersion: event.promptVersion,
        promptRevision: event.promptRevision,
        evidenceQuality: event.evidenceQuality,
        sources: event.sources || [],
      });
    } else if (event.type === 'done' && event.content) {
      onFinal?.(event.content);
    } else if (event.type === 'error') {
      throw new AiChatStreamError(
        event.message || 'AI 服务调用失败',
        event.code
      );
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(handleLine);

    if (done) break;
  }

  handleLine(buffer);
}
