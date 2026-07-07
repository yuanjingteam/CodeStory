import { FiRefreshCw } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getMessageTypeClass,
  getMessageTypeLabel,
  type ChatMessage,
} from './chatTypes';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming: boolean;
  onRetry: (message: ChatMessage) => void;
}

export default function ChatMessageBubble({
  message,
  isStreaming,
  onRetry,
}: ChatMessageBubbleProps) {
  return (
    <div
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
        {message.role === 'assistant' && (
          <div className="mb-1">
            <span
              className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${getMessageTypeClass(message.messageType)}`}
            >
              {getMessageTypeLabel(message.messageType)}
            </span>
          </div>
        )}

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
          <div className="mt-2 space-y-1">
            {message.errorCode && (
              <div className="text-xs font-bold text-red-600">
                错误码：{message.errorCode}
              </div>
            )}
            <button
              type="button"
              onClick={() => onRetry(message)}
              disabled={isStreaming}
              className="flex items-center gap-1 font-bold text-purple-700 disabled:opacity-50"
            >
              <FiRefreshCw />
              重新发送
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
