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
  const requestVersionRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const countdownRef = useRef(0);

  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  const startCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    countdownRef.current = duration;
    setCountdown(duration);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          countdownRef.current = 0;
          return 0;
        }
        countdownRef.current = prev - 1;
        return prev - 1;
      });
    }, 1000);
  }, [duration]);

  const resetCountdown = useCallback(() => {
    requestVersionRef.current += 1;
    requestInFlightRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    countdownRef.current = 0;
    setCountdown(0);
    setLoading(false);
  }, []);

  const sendCode = useCallback(async () => {
    if (requestInFlightRef.current || countdownRef.current > 0) return;

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    requestInFlightRef.current = true;
    try {
      setLoading(true);
      await onSendRef.current();
      if (requestVersion === requestVersionRef.current) {
        startCountdown();
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (requestVersion === requestVersionRef.current) {
        requestInFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [startCountdown]);

  useEffect(() => {
    return () => {
      requestVersionRef.current += 1;
      requestInFlightRef.current = false;
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
    resetCountdown,
  };
}
