import { getToken } from '@/utils/jwt';
import { useUserStore } from '@/store/useUserStore';

interface StreamChatParams {
  lessonId: string;
  exerciseId?: string | null;
  message: string;
  signal: AbortSignal;
  onToken: (token: string) => void;
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

export async function streamLessonChat({
  lessonId,
  exerciseId,
  message,
  signal,
  onToken,
}: StreamChatParams): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('登录状态已失效，请重新登录');

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ai/chat/stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
        exerciseId: exerciseId || undefined,
        message,
      }),
      signal,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      const { isLoggedIn } = useUserStore.getState();
      if (isLoggedIn) {
        useUserStore.getState().clearUser();
        window.location.href = '/auth/login';
      }
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
