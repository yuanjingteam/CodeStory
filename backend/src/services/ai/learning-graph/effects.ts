import type { Prisma } from '../../../generated/prisma';
import prisma from '../../../config/prisma';

export interface LearningRunEffectContext {
  runId: string;
  nodeName: string;
  effectType: string;
  effectKey: string;
}

export async function getAppliedLearningEffect<T>(
  effectKey: string
): Promise<T | null> {
  const effect = await prisma.learning_run_effects.findUnique({
    where: { effect_key: effectKey },
    select: { status: true, payload: true },
  });
  return effect?.status === 'applied' && effect.payload
    ? (effect.payload as T)
    : null;
}

export async function getAppliedLearningEffectInTransaction<T>(
  tx: Prisma.TransactionClient,
  effectKey: string
): Promise<T | null> {
  const effect = await tx.learning_run_effects.findUnique({
    where: { effect_key: effectKey },
    select: { status: true, payload: true },
  });
  return effect?.status === 'applied' && effect.payload
    ? (effect.payload as T)
    : null;
}

export async function markLearningEffectApplied(
  tx: Prisma.TransactionClient,
  effect: LearningRunEffectContext,
  payload: Prisma.InputJsonValue
): Promise<void> {
  await tx.learning_run_effects.upsert({
    where: { effect_key: effect.effectKey },
    create: {
      run_id: effect.runId,
      node_name: effect.nodeName,
      effect_type: effect.effectType,
      effect_key: effect.effectKey,
      payload,
      status: 'applied',
      applied_at: new Date(),
    },
    update: {
      payload,
      status: 'applied',
      error_code: null,
      applied_at: new Date(),
    },
  });
}
