import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import { getTraceId } from '../../middleware/request-context';

export interface AiFeedbackEventInput {
  userId: string;
  scene: string;
  eventType: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
  dedupeKey?: string;
  client?: Prisma.TransactionClient;
}

export async function recordAiFeedbackEvent(
  input: AiFeedbackEventInput
): Promise<{ recorded: boolean; traceId: string }> {
  const traceId = getTraceId() || randomUUID();
  const dedupeKey = input.dedupeKey || [
    traceId,
    input.scene,
    input.eventType,
    input.targetType,
    input.targetId,
  ].join(':');

  const client = input.client || prisma;
  const result = await client.ai_feedback_events.createMany({
    data: [{
      trace_id: traceId,
      user_id: input.userId,
      scene: input.scene,
      event_type: input.eventType,
      target_type: input.targetType,
      target_id: input.targetId,
      metadata: input.metadata,
      dedupe_key: dedupeKey,
    }],
    skipDuplicates: true,
  });
  return { recorded: result.count === 1, traceId };
}
