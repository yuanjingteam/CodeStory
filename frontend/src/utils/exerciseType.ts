export const EXERCISE_TYPE_MAP = {
  single_choice: {
    label: '选择题',
    color: 'bg-blue-300',
    value: 'single_choice'
  },
  code: {
    label: '编程题',
    color: 'bg-orange-300',
    value: 'code'
  },
  fill: {
    label: '填空题',
    color: 'bg-green-300',
    value: 'fill'
  }
} as const;

export type ExerciseType = keyof typeof EXERCISE_TYPE_MAP;

export function getExerciseTypeLabel(type: string): string {
  return EXERCISE_TYPE_MAP[type as ExerciseType]?.label || type;
}

export function getExerciseTypeColor(type: string): string {
  return EXERCISE_TYPE_MAP[type as ExerciseType]?.color || 'bg-gray-300';
}

export function getExerciseTypeOptions(): Array<{ label: string; value: string }> {
  return Object.values(EXERCISE_TYPE_MAP).map(item => ({
    label: item.label,
    value: item.value
  }));
}
