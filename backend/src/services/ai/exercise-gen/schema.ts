import { z } from 'zod';

const nonEmptyText = z.string().trim().min(1);
const difficultySchema = z.number().int().min(0).max(2);

const selfCheckSchema = z
  .object({
    formatValid: z.literal(true),
    answerExists: z.literal(true),
    difficultyMatch: z.literal(true),
    notes: z.array(nonEmptyText).max(5),
  })
  .strict();

const singleChoiceCandidateSchema = z
  .object({
    type: z.literal('single_choice'),
    content: nonEmptyText,
    answer: nonEmptyText,
    analysis: nonEmptyText,
    knowledge: nonEmptyText,
    difficulty: difficultySchema,
    metadata: z
      .object({
        options: z.array(nonEmptyText).min(2).max(6),
      })
      .strict(),
    selfCheck: selfCheckSchema,
  })
  .strict()
  .superRefine((candidate, context) => {
    const uniqueOptions = new Set(candidate.metadata.options);
    if (uniqueOptions.size !== candidate.metadata.options.length) {
      context.addIssue({
        code: 'custom',
        path: ['metadata', 'options'],
        message: '选项不能重复',
      });
    }
    if (!candidate.metadata.options.includes(candidate.answer)) {
      context.addIssue({
        code: 'custom',
        path: ['answer'],
        message: '答案必须与一个选项完全一致',
      });
    }
  });

const codeCandidateSchema = z
  .object({
    type: z.literal('code'),
    content: nonEmptyText,
    answer: nonEmptyText,
    analysis: nonEmptyText,
    knowledge: nonEmptyText,
    difficulty: difficultySchema,
    metadata: z
      .object({
        codeTemplate: z.string(),
        language: z.string().trim().min(1).max(30),
        testCases: z
          .array(
            z
              .object({
                input: z.string(),
                output: z.string(),
              })
              .strict()
          )
          .max(8),
      })
      .strict(),
    selfCheck: selfCheckSchema,
  })
  .strict();

export const generatedExerciseCandidateSchema = z.union([
  singleChoiceCandidateSchema,
  codeCandidateSchema,
]);

export const generatedExerciseBatchSchema = z
  .object({
    candidates: z.array(generatedExerciseCandidateSchema).min(1).max(5),
  })
  .strict();

export const exerciseGenerationInputSchema = z
  .object({
    lessonId: nonEmptyText,
    knowledge: nonEmptyText.max(300),
    type: z.enum(['single_choice', 'code']),
    difficulty: difficultySchema,
    count: z.number().int().min(1).max(5),
  })
  .strict();

export type GeneratedExerciseCandidate = z.infer<
  typeof generatedExerciseCandidateSchema
>;
export type ExerciseGenerationInput = z.infer<
  typeof exerciseGenerationInputSchema
>;
