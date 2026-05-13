'use client';

import { useEffect, useRef, useState } from 'react';

interface UseEmailCodeOptions {
  duration?: number;
  onSend: () => Promise<void>;
}

export function useEmailCode(options: UseEmailCodeOptions) {
  const { duration = 60, onSend } = options;
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startCountdown = () => {
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
  };

  const sendCode = async () => {
    try {
      setLoading(true);
      await onSend();
      startCountdown();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

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
