import { defineConfig } from 'vitest/config';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 阶段 0A 收尾：vitest 配置
// - 集成测试与权限三态回归共用临时 PostgreSQL 夹具（globalSetup 返回 teardown）
// - setupFiles 在 worker 启动时把 DATABASE_URL 指向测试库，先于业务模块 import prisma
// - 业务代码用 path alias @/* → ./src/*，这里同步配置
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDatabaseName = [
  'codestory_vitest_test',
  process.pid,
  randomUUID().replace(/-/g, '').slice(0, 8),
].join('_');

// globalSetup 与测试 worker 通过环境变量共享本次运行的唯一数据库名。
// 每次运行使用不同数据库，避免并行 CI 或多个开发者互相删库。
process.env.CODESTORY_TEST_DB_NAME = testDatabaseName;

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    globalSetup: path.resolve(__dirname, 'test/setup/global-setup.ts'),
    setupFiles: [path.resolve(__dirname, 'test/setup/setup-env.ts')],
    // 集成测试涉及真实数据库，串行执行避免跨用例污染
    fileParallelism: false,
    pool: 'forks',
    singleFork: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
