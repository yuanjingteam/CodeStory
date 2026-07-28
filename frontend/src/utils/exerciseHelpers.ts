import type { ExerciseItem } from '@/types/lesson-manage';

export type { ExerciseItem } from '@/types/lesson-manage';

export const generateExerciseId = () => `exercise_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const createEmptyExercise = (): ExerciseItem => ({
  id: generateExerciseId(),
  type: '',
  exerciseContent: '',
  answer: '',
  knowledge: '',
  analysis: '',
  source: 'static',
  metadata: null,
  hints: null,
});

export const getExerciseTypeLabel = (type: string) => {
  switch (type) {
    case 'single_choice': return '选择题';
    case 'code': return '编程题';
    case 'fill': return '填空题';
    default: return '未设置';
  }
};

export const getExerciseTypeIcon = (type: string) => {
  switch (type) {
    case 'single_choice': return '📝';
    case 'code': return '💻';
    case 'fill': return '✏️';
    default: return '❓';
  }
};
