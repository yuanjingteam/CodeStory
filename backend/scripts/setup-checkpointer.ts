import '../src/config/env';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('setup-checkpointer: 缺少 DATABASE_URL');
  }

  const checkpointer = PostgresSaver.fromConnString(databaseUrl);
  try {
    await checkpointer.setup();
    console.log('LangGraph checkpoint 表已就绪');
  } finally {
    await checkpointer.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
