'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  IoCloseCircleOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoInformationCircleOutline,
} from 'react-icons/io5';
import { IoIosClose } from 'react-icons/io';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface MessageProps {
  type: MessageType;
  message: string;
  id: string;
  onClose: (id: string) => void;
}

interface MessageContainerProps {
  messages: Array<{
    id: string;
    type: MessageType;
    message: string;
  }>;
  onRemove: (id: string) => void;
}

const MAX_MESSAGES = 5;

function MessageItem({ type, message, id, onClose }: MessageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // 入场动画
  useEffect(() => {
    const enterTimer = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(enterTimer);
  }, []);

  // 关闭逻辑
  const handleClose = useCallback(() => {
    setIsLeaving(true);

    setTimeout(() => {
      onClose(id);
    }, 300);
  }, [id, onClose]);

  // 自动关闭
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [handleClose]);

  const baseStyle = `
    pointer-events-auto
    flex items-center gap-3
    border-2 border-black
    px-4 py-3
    shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
    transition-all duration-300 ease-out
    will-change-transform
  `;

  const animationStyle = isLeaving
    ? 'opacity-0 translate-x-8 scale-95'
    : isVisible
      ? 'opacity-100 translate-x-0 scale-100'
      : 'opacity-0 translate-x-4 scale-95';

  const buttonStyle = `
    p-1
    border-2 border-transparent
    hover:border-black
    hover:bg-black/10
    transition-all duration-150
    active:translate-x-[2px]
    active:translate-y-[2px]
  `;

  switch (type) {
    case 'success':
      return (
        <div className={`${baseStyle} ${animationStyle} bg-green-300`}>
          <IoCheckmarkCircleOutline className="w-6 h-6 text-green-900 flex-shrink-0" />

          <span className="font-black text-green-950 flex-1">{message}</span>

          <button onClick={handleClose} className={buttonStyle}>
            <IoIosClose className="w-5 h-5 text-green-900" />
          </button>
        </div>
      );

    case 'error':
      return (
        <div className={`${baseStyle} ${animationStyle} bg-red-300`}>
          <IoCloseCircleOutline className="w-6 h-6 text-red-900 flex-shrink-0" />

          <span className="font-black text-red-950 flex-1">{message}</span>

          <button onClick={handleClose} className={buttonStyle}>
            <IoIosClose className="w-5 h-5 text-red-900" />
          </button>
        </div>
      );

    case 'warning':
      return (
        <div className={`${baseStyle} ${animationStyle} bg-yellow-300`}>
          <IoAlertCircleOutline className="w-6 h-6 text-yellow-900 flex-shrink-0" />

          <span className="font-black text-yellow-950 flex-1">{message}</span>

          <button onClick={handleClose} className={buttonStyle}>
            <IoIosClose className="w-5 h-5 text-yellow-900" />
          </button>
        </div>
      );

    case 'info':
      return (
        <div className={`${baseStyle} ${animationStyle} bg-blue-300`}>
          <IoInformationCircleOutline className="w-6 h-6 text-blue-900 flex-shrink-0" />

          <span className="font-black text-blue-950 flex-1">{message}</span>

          <button onClick={handleClose} className={buttonStyle}>
            <IoIosClose className="w-5 h-5 text-blue-900" />
          </button>
        </div>
      );

    default:
      return null;
  }
}

function MessageContainer({ messages, onRemove }: MessageContainerProps) {
  if (typeof window === 'undefined') {
    return null;
  }

  const content = (
    <div
      className="
        fixed top-4 right-4
        z-[9999]
        flex flex-col
        gap-3
        w-80
        max-w-[calc(100vw-2rem)]
        pointer-events-none
      "
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="
            transition-all
            duration-300
            ease-out
          "
        >
          <MessageItem
            id={msg.id}
            type={msg.type}
            message={msg.message}
            onClose={onRemove}
          />
        </div>
      ))}
    </div>
  );

  return createPortal(content, document.body);
}

export function useMessage() {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      type: MessageType;
      message: string;
    }>
  >([]);

  const addMessage = useCallback((type: MessageType, message: string) => {
    const newMessage = {
      id: crypto.randomUUID(),
      type,
      message,
    };

    setMessages((prev) => {
      const updated = [...prev, newMessage];

      // 超出最大数量时移除最早消息
      if (updated.length > MAX_MESSAGES) {
        return updated.slice(-MAX_MESSAGES);
      }

      return updated;
    });
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const MessageManager = useCallback(
    () => <MessageContainer messages={messages} onRemove={removeMessage} />,
    [messages, removeMessage]
  );

  return {
    addMessage,
    MessageManager,
  };
}

export default MessageContainer;
