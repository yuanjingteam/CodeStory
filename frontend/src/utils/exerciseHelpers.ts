import type { MetadataValue, HintsValue } from '@/types/lesson-manage';

export interface ExerciseItem {
  id: string;
  type: string;
  exerciseContent: string;
  answer: string;
  metadata: MetadataValue;
  hints: HintsValue;
}

export const generateExerciseId = () => `exercise_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const createEmptyExercise = (): ExerciseItem => ({
  id: generateExerciseId(),
  type: '',
  exerciseContent: '',
  answer: '',
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
