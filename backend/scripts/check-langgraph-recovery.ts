import '../src/config/env';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  Annotation,
  Command,
  END,
  interrupt,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

const RecoveryState = Annotation.Root({
  steps: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

function createGraph(checkpointer: PostgresSaver) {
  return new StateGraph(RecoveryState)
    .addNode('prepare', () => ({ steps: ['prepared'] }))
    .addNode('resume', () => {
      interrupt({ message: '等待另一进程恢复' });
      return { steps: ['resumed'] };
    })
    .addEdge(START, 'prepare')
    .addEdge('prepare', 'resume')
    .addEdge('resume', END)
    .compile({ checkpointer });
}

async function runMode(mode: 'prepare' | 'resume', threadId: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('缺少 DATABASE_URL');

  const checkpointer = PostgresSaver.fromConnString(databaseUrl);
  const graph = createGraph(checkpointer);
  const config = {
    configurable: { thread_id: threadId },
    durability: 'sync' as const,
  };

  try {
    if (mode === 'prepare') {
      await graph.invoke({ steps: [] }, config);
      const state = await graph.getState(config);
      if (!state.values.steps.includes('prepared') || state.next[0] !== 'resume') {
        throw new Error('进程 A 未在预期节点中断');
      }
      console.log(`进程 A 已持久化中断状态：${threadId}`);
      return;
    }

    const result = await graph.invoke(new Command({ resume: true }), config);
    if (
      !result.steps.includes('prepared') ||
      !result.steps.includes('resumed')
    ) {
      throw new Error('进程 B 未恢复进程 A 的状态');
    }
    console.log(`进程 B 已跨进程恢复并完成：${threadId}`);
    await checkpointer.deleteThread(threadId);
    console.log(`验证线程已清理：${threadId}`);
  } finally {
    await checkpointer.end();
  }
}

function runChild(mode: 'prepare' | 'resume', threadId: string): void {
  const tsNodeCli = require.resolve('ts-node/dist/bin.js');
  const scriptPath = path.resolve(__filename);
  execFileSync(
    process.execPath,
    [
      tsNodeCli,
      '--files',
      '-r',
      'tsconfig-paths/register',
      scriptPath,
      mode,
      threadId,
    ],
    { stdio: 'inherit', env: process.env }
  );
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  const threadId =
    process.argv[3] ||
    `stage-0b-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  if (mode === 'prepare' || mode === 'resume') {
    await runMode(mode, threadId);
    return;
  }

  runChild('prepare', threadId);
  runChild('resume', threadId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
