import { getToken } from '@/utils/jwt';
import {
  handleAuthenticationFailure,
  isRefreshSessionExpired,
  refreshAccessToken,
} from '@/utils/auth-session';

interface StreamChatParams {
  lessonId: string;
  exerciseId?: string | null;
  currentCode?: string | null;
  message: string;
  signal: AbortSignal;
  onToken: (token: string) => void;
}

interface LessonChatHistoryParams {
  lessonId: string;
  signal?: AbortSignal;
}

export interface LessonChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface StreamEvent {
  type: 'start' | 'token' | 'done' | 'error';
  content?: string;
  message?: string;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || 'AI 服务调用失败';
  } catch {
    return 'AI 服务调用失败';
  }
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

export async function getLessonChatHistory({
  lessonId,
  signal,
}: LessonChatHistoryParams): Promise<LessonChatHistoryMessage[]> {
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
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as {
    data?: { messages?: LessonChatHistoryMessage[] };
  };

  return payload.data?.messages || [];
}

export async function streamLessonChat({
  lessonId,
  exerciseId,
  currentCode,
  message,
  signal,
  onToken,
}: StreamChatParams): Promise<void> {
  const token = await getAccessTokenOrRefresh();

  let response = await requestChatStream(
    token,
    lessonId,
    exerciseId,
    currentCode,
    message,
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
    throw new Error(await getErrorMessage(response));
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
    } else if (event.type === 'error') {
      throw new Error(event.message || 'AI 服务调用失败');
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
