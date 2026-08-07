import { z } from 'zod';

export const ragSourceLabelSchema = z.object({
  sourceType: z.enum(['lesson', 'exercise']),
  sourceId: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const ragEvalCaseSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  question: z.string().min(1),
  expectedSources: z.array(ragSourceLabelSchema).min(1),
  reviewStatus: z.enum(['pending', 'approved', 'rejected']),
  reviewerNote: z.string().optional(),
});

export const ragEvalDatasetSchema = z.object({
  datasetVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  reviewRequired: z.literal(true),
  cases: z.array(ragEvalCaseSchema).min(50),
});

export type RagEvalDataset = z.infer<
  typeof ragEvalDatasetSchema
>;
