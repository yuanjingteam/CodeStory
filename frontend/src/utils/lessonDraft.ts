const LESSON_DRAFT_KEY = 'codestory:lesson-create-draft:v1'

interface LessonDraft<T> {
  savedAt: string
  data: T
}

export function loadLessonDraft<T>(): LessonDraft<T> | null {
  if (typeof window === 'undefined') return null

  try {
    const rawDraft = window.localStorage.getItem(LESSON_DRAFT_KEY)
    return rawDraft ? JSON.parse(rawDraft) as LessonDraft<T> : null
  } catch {
    window.localStorage.removeItem(LESSON_DRAFT_KEY)
    return null
  }
}

export function saveLessonDraft<T>(data: T) {
  if (typeof window === 'undefined') return

  const draft: LessonDraft<T> = {
    savedAt: new Date().toISOString(),
    data,
  }
  window.localStorage.setItem(LESSON_DRAFT_KEY, JSON.stringify(draft))
}

export function clearLessonDraft() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LESSON_DRAFT_KEY)
}
