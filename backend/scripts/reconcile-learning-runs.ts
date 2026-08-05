import '../src/config/env';
import prisma from '../src/config/prisma';
import { reconcileGuidedLearningProjection } from '../src/services/ai/learning-graph/service';

async function main() {
  const sessions = await prisma.ai_chat_sessions.findMany({
    where: {
      current_run_id: { not: null },
      is_delete: 0,
    },
    select: {
      id: true,
      current_run_id: true,
      state_version: true,
    },
  });
  let projected = 0;
  let missingCheckpoint = 0;
  let failed = 0;
  for (const session of sessions) {
    try {
      const state = await reconcileGuidedLearningProjection({
        sessionId: session.id,
        runId: session.current_run_id!,
        stateVersion: session.state_version,
      });
      if (state) projected += 1;
      else missingCheckpoint += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[learning-reconcile] session=${session.id}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  const pendingEffects =
    await prisma.learning_run_effects.count({
      where: { status: 'pending' },
    });
  process.stdout.write(
    `${JSON.stringify({
      sessions: sessions.length,
      projected,
      missingCheckpoint,
      pendingEffects,
      failed,
    })}\n`
  );
  if (missingCheckpoint > 0 || pendingEffects > 0 || failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
