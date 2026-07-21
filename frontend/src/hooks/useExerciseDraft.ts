'use client';

import { useCallback, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';

type ExerciseType = 'code' | 'single_choice' | 'fill';
type DraftStatus = 'idle' | 'saved' | 'error';

interface ExerciseDraft {
  version: 1;
  userId: string;
  exerciseId: string;
  exerciseType: ExerciseType;
  content: string;
  updatedAt: string;
}

interface UseExerciseDraftOptions {
  exerciseId: string;
  exerciseType: ExerciseType;
  initialValue: string;
  disabled?: boolean;
}

const DRAFT_KEY_PREFIX = 'codestory:exercise-draft:v1';

function isExerciseDraft(value: unknown): value is ExerciseDraft {
  if (!value || typeof value !== 'object') return false;

  const draft = value as Partial<ExerciseDraft>;
  return (
    draft.version === 1 &&
    typeof draft.userId === 'string' &&
    typeof draft.exerciseId === 'string' &&
    typeof draft.exerciseType === 'string' &&
    typeof draft.content === 'string' &&
    typeof draft.updatedAt === 'string'
  );
}

function loadDraft(
  storageKey: string | null,
  userId: string | undefined,
  exerciseId: string,
  exerciseType: ExerciseType,
  initialValue: string,
  disabled: boolean
): { value: string; status: DraftStatus } {
  if (typeof window === 'undefined' || !storageKey || !userId) {
    return { value: initialValue, status: 'idle' };
  }

  if (disabled) {
    localStorage.removeItem(storageKey);
    return { value: initialValue, status: 'idle' };
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return { value: initialValue, status: 'idle' };
    }

    const draft = JSON.parse(stored) as unknown;
    if (
      isExerciseDraft(draft) &&
      draft.userId === userId &&
      draft.exerciseId === exerciseId &&
      draft.exerciseType === exerciseType
    ) {
      return { value: draft.content, status: 'saved' };
    }

    localStorage.removeItem(storageKey);
    return { value: initialValue, status: 'idle' };
  } catch {
    localStorage.removeItem(storageKey);
    return { value: initialValue, status: 'error' };
  }
}

export function useExerciseDraft({
  exerciseId,
  exerciseType,
  initialValue,
  disabled = false,
}: UseExerciseDraftOptions) {
  const userId = useUserStore((state) => state.user?.id);
  const storageKey = userId
    ? `${DRAFT_KEY_PREFIX}:${userId}:${exerciseId}`
    : null;
  const [draftState, setDraftState] = useState(() =>
    loadDraft(
      storageKey,
      userId,
      exerciseId,
      exerciseType,
      initialValue,
      disabled
    )
  );

  const setValue = useCallback(
    (nextValue: string) => {
      if (!storageKey || !userId || disabled) {
        setDraftState((current) => ({ ...current, value: nextValue }));
        return;
      }

      const draft: ExerciseDraft = {
        version: 1,
        userId,
        exerciseId,
        exerciseType,
        content: nextValue,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setDraftState({ value: nextValue, status: 'saved' });
      } catch {
        setDraftState({ value: nextValue, status: 'error' });
      }
    },
    [disabled, exerciseId, exerciseType, storageKey, userId]
  );

  const clearDraft = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setDraftState((current) => ({ ...current, status: 'idle' }));
  }, [storageKey]);

  return {
    value: draftState.value,
    setValue,
    clearDraft,
    status: draftState.status,
  };
}
