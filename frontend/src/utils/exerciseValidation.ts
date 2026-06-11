import type { HintConfig } from '@/types/lesson-manage'
import type { ExerciseItem } from './exerciseHelpers'

const getHintContents = (exercise: ExerciseItem) => {
  if (typeof exercise.hints !== 'object' || exercise.hints === null) return []

  const hints = exercise.hints as HintConfig
  return Object.keys(hints)
    .filter(key => key.startsWith('level_'))
    .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]))
    .map(key => hints[key as `level_${number}`])
}

export function validateExercise(exercise: ExerciseItem): string[] {
  const errors: string[] = []

  if (!exercise.type) {
    errors.push('请选择题型')
  }
  if (!exercise.exerciseContent.trim()) {
    errors.push('请填写题目描述')
  }
  if (!exercise.answer.trim()) {
    errors.push('请填写答案')
  }

  if (exercise.type === 'single_choice') {
    const options = typeof exercise.metadata === 'object'
      && exercise.metadata !== null
      && Array.isArray(exercise.metadata.options)
      ? exercise.metadata.options
      : []
    const filledOptions = options.filter(option => option.trim())

    if (filledOptions.length < 2) {
      errors.push('选择题至少需要填写两个选项')
    }
    if (exercise.answer.trim() && !filledOptions.includes(exercise.answer.trim())) {
      errors.push('请选择一个有效选项作为正确答案')
    }
  }

  const hintContents = getHintContents(exercise)
  if (hintContents.length > 3) {
    errors.push('提示最多只能配置三级')
  }
  if (hintContents.some(content => !content.trim())) {
    errors.push('已添加的提示内容不能为空')
  }

  return errors
}
