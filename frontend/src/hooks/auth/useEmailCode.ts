'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseEmailCodeOptions {
  duration?: number;
  onSend: () => Promise<void>;
}

export function useEmailCode(options: UseEmailCodeOptions) {
  const { duration = 60, onSend } = options;
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onSendRef = useRef(onSend);

  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  const startCountdown = useCallback(() => {
    setCountdown(duration);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [duration]);

  const sendCode = useCallback(async () => {
    try {
      setLoading(true);
      await onSendRef.current();
      startCountdown();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [startCountdown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    countdown,
    loading,
    sendCode,
    isCounting: countdown > 0,
  };
}
