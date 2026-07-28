// 阶段 0A 收尾：vitest globalSetup
// 职责：在 vitest 主进程启动时创建本次运行独享的测试库，
//       并对该库跑 prisma migrate deploy 验证完整迁移链。
//       返回的函数作为 teardown：终止连接 + DROP DATABASE，不留垃圾。
// 复用 docker-compose.dev.yml 的 pgvector 容器，不引入额外容器或 pg 驱动。
// 注：vitest 没有独立的 globalTeardown 配置项，teardown 必须由 globalSetup 返回函数实现。
import dotenv from 'dotenv';
import { URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../../src/generated/prisma';

const TEST_DB_NAME_PATTERN = /^codestory_vitest_test_[a-z0-9_]+$/;
const LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'postgres',
  'codestory-postgres',
]);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadOriginalUrl(): string {
  dotenv.config();
  if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.local', override: true });
  }
  const original = process.env.DATABASE_URL;
  if (!original) throw new Error('globalSetup: 缺少 DATABASE_URL');
  return original;
}

function getTestDatabaseName(): string {
  const name = process.env.CODESTORY_TEST_DB_NAME;
  if (!name || !TEST_DB_NAME_PATTERN.test(name)) {
    throw new Error('globalSetup: 测试数据库名缺失或不安全');
  }
  return name;
}

function assertTestDatabaseAllowed(original: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('globalSetup: 禁止在 production 环境创建测试数据库');
  }

  const url = new URL(original);
  const isLocalDatabase = LOCAL_DATABASE_HOSTS.has(url.hostname);
  const explicitlyAllowed =
    process.env.CODESTORY_ALLOW_TEST_DATABASE === '1';
  const invokedByTestScript = process.env.npm_lifecycle_event === 'test';

  if (!invokedByTestScript && !explicitlyAllowed) {
    throw new Error(
      'globalSetup: 请通过 pnpm test 运行，或显式设置 CODESTORY_ALLOW_TEST_DATABASE=1'
    );
  }

  if (!isLocalDatabase && !explicitlyAllowed) {
    throw new Error(
      `globalSetup: 拒绝连接远程数据库主机 ${url.hostname}；确认安全后设置 CODESTORY_ALLOW_TEST_DATABASE=1`
    );
  }
}

function buildAdminUrl(original: string): string {
  // 连 postgres 维护库执行 CREATE/DROP DATABASE
  const url = new URL(original);
  url.pathname = '/postgres';
  return url.toString();
}

function buildTestUrl(original: string, testDatabaseName: string): string {
  const url = new URL(original);
  url.pathname = `/${testDatabaseName}`;
  return url.toString();
}

async function dropTestDatabase(
  adminUrl: string,
  testDatabaseName: string
): Promise<void> {
  const adminClient = new PrismaClient({
    datasources: { db: { url: adminUrl } },
  });
  try {
    await adminClient.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${testDatabaseName}' AND pid <> pg_backend_pid()
    `);
    await adminClient.$executeRawUnsafe(
      `DROP DATABASE IF EXISTS "${testDatabaseName}"`
    );
  } finally {
    await adminClient.$disconnect();
  }
}

async function globalSetup() {
  const original = loadOriginalUrl();
  assertTestDatabaseAllowed(original);
  const testDatabaseName = getTestDatabaseName();
  const adminUrl = buildAdminUrl(original);
  const testUrl = buildTestUrl(original, testDatabaseName);

  // 用 admin 连接（指向 postgres 维护库）创建测试库
  // PrismaClient 支持运行时 datasources 覆盖，不依赖额外 pg 驱动
  const adminClient = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    await adminClient.$executeRawUnsafe(
      `CREATE DATABASE "${testDatabaseName}"`
    );
  } finally {
    await adminClient.$disconnect();
  }

  // 从迁移历史创建结构，确保测试同时验证 schema.prisma 与迁移链一致。
  const prismaCliPath = path.resolve(
    __dirname,
    '../../node_modules/prisma/build/index.js'
  );
  try {
    execFileSync(process.execPath, [prismaCliPath, 'migrate', 'deploy'], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: testUrl },
      stdio: 'inherit',
    });
  } catch (error) {
    await dropTestDatabase(adminUrl, testDatabaseName);
    throw error;
  }

  console.log(`[vitest globalSetup] 测试库 ${testDatabaseName} 已就绪`);

  // 返回 teardown 函数：所有测试结束后清理测试库
  return async () => {
    // 先终止该库所有连接（含可能残留的 prisma worker 连接），否则 DROP 报错
    await dropTestDatabase(adminUrl, testDatabaseName);
    console.log(
      `[vitest globalSetup teardown] 测试库 ${testDatabaseName} 已删除`
    );
  };
}

export default globalSetup;
