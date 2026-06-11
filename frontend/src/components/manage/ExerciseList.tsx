'use client';
import { useEffect, useRef, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import type { ExerciseItem } from '@/utils/exerciseHelpers';
import { createEmptyExercise } from '@/utils/exerciseHelpers';
import { validateExercise } from '@/utils/exerciseValidation';
import ExerciseCard from './ExerciseCard';

interface ExerciseListProps {
  exercises: ExerciseItem[];
  onChange: (exercises: ExerciseItem[]) => void;
}

export default function ExerciseList({ exercises, onChange }: ExerciseListProps) {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [configuredExercises, setConfiguredExercises] = useState<Set<string>>(
    () => new Set(
      exercises
        .filter(exercise => validateExercise(exercise).length === 0)
        .map(exercise => exercise.id)
    )
  );
  const knownExerciseIdsRef = useRef(new Set(exercises.map(exercise => exercise.id)));

  useEffect(() => {
    const currentIds = new Set(exercises.map(exercise => exercise.id));
    const restoredConfiguredIds = exercises
      .filter(exercise =>
        !knownExerciseIdsRef.current.has(exercise.id)
        && validateExercise(exercise).length === 0
      )
      .map(exercise => exercise.id);

    setConfiguredExercises(prev => {
      const next = new Set(
        [...prev].filter(id => currentIds.has(id))
      );
      restoredConfiguredIds.forEach(id => next.add(id));
      return next;
    });
    knownExerciseIdsRef.current = currentIds;
  }, [exercises]);

  const toggleExpand = (id: string) => {
    setExpandedExercises(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const newExercise = createEmptyExercise();
    onChange([...exercises, newExercise]);
    setExpandedExercises(prev => new Set(prev).add(newExercise.id));
  };

  const handleDelete = (id: string) => {
    onChange(exercises.filter(ex => ex.id !== id));
    setExpandedExercises(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfiguredExercises(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUpdate = (index: number, updates: Partial<ExerciseItem>) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    onChange(newExercises);
    setConfiguredExercises(prev => {
      const next = new Set(prev);
      next.delete(newExercises[index].id);
      return next;
    });
  };

  const handleComplete = (id: string) => {
    setConfiguredExercises(prev => new Set(prev).add(id));
    setExpandedExercises(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="border-2 border-purple-300 p-4 rounded-lg bg-purple-50">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold">📝 题目列表 ({exercises.length} 道)</label>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-sm font-bold border-2 border-black rounded hover:bg-purple-600 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          添加题目
        </button>
      </div>

      {exercises.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">暂无题目，点击上方按钮添加</p>
      )}

      {exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          isExpanded={expandedExercises.has(exercise.id)}
          isConfigured={configuredExercises.has(exercise.id)}
          onToggleExpand={() => toggleExpand(exercise.id)}
          onDelete={() => handleDelete(exercise.id)}
          onUpdate={updates => handleUpdate(index, updates)}
          onComplete={() => handleComplete(exercise.id)}
        />
      ))}
    </div>
  );
}
