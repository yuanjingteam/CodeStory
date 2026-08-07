import { z } from 'zod';

export const evalScenarioSchema = z.enum([
  'answer_grounding',
  'question_generation',
  'code_grading',
]);

export const evalCaseSchema = z.object({
  id: z.string().min(1),
  scenario: evalScenarioSchema,
  input: z.record(z.string(), z.unknown()),
  expected: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()).default([]),
});

export const evalDatasetSchema = z.object({
  datasetVersion: z.string().min(1),
  promptVersion: z.string().min(1),
  defaultModel: z.string().min(1),
  cases: z.array(evalCaseSchema),
});

export type EvalDataset = z.infer<typeof evalDatasetSchema>;
