// 阶段 0A 收尾：worker 进程启动时先于业务模块运行
// 职责：把 DATABASE_URL 改写为指向本次运行的唯一测试库，
//       并为 JWT 兜底默认值，让 issueAccessToken 在测试环境不报错。
import '../../src/config/env'; // 加载 .env 与 .env.local（与业务侧 env 加载逻辑一致）
import { URL } from 'node:url';

const TEST_DB_NAME_PATTERN = /^codestory_vitest_test_[a-z0-9_]+$/;
const testDatabaseName = process.env.CODESTORY_TEST_DB_NAME;

if (!testDatabaseName || !TEST_DB_NAME_PATTERN.test(testDatabaseName)) {
  throw new Error('setup-env: 测试数据库名缺失或不安全');
}

const originalUrl = process.env.DATABASE_URL;
if (!originalUrl) {
  throw new Error('setup-env: 缺少 DATABASE_URL，请确认 backend/.env 已配置');
}

const testUrl = new URL(originalUrl);
testUrl.pathname = `/${testDatabaseName}`;
process.env.DATABASE_URL = testUrl.toString();

// 测试环境 JWT 兜底（若 .env 未配 JWT_SECRET 等，给默认值让签 token 不报错）
if (!process.env.JWT_SECRET && !process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_SECRET = 'vitest-test-jwt-secret';
  process.env.JWT_ACCESS_SECRET = 'vitest-test-jwt-access-secret';
  process.env.JWT_REFRESH_SECRET = 'vitest-test-jwt-refresh-secret';
}

process.env.NODE_ENV = 'test';
