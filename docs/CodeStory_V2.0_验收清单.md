# CodeStory V2.0 验收清单

> **状态：** 阶段 0A 完成
>
> **最后核对：** 2026-07-28
>
> **依据文档：** [`CodeStory_V2.0_AI增强执行计划.md`](./CodeStory_V2.0_AI增强执行计划.md) 第 5.0、5.2 节
>
> **用途：** V2.0 各阶段验收条目的累积记录。每条含「接口 + 输入 + 预期输出 + 实测结果」，可由 `pnpm test` 自动产出或手工跑通。

---

## 阶段 0A — 数据完整性与权限核对

### 前置项 A · 题目稳定 ID 增量更新 + 事务化 + ID 解析加固

**代码落点：** `backend/src/services/course-manage/lesson-manage.ts` 的 `createLesson` / `updateLesson`

**验收方式：** vitest 集成测试 ①，文件 `backend/test/integration/lesson-manage-0a.test.ts`

| # | 验收点 | 输入 | 预期 | 实测 |
| --- | --- | --- | --- | --- |
| A1 | 增量 diff 取代全删重建 | 连续两次保存同一小节 | 题目 ID 不变 | ✅ 通过（`A1 · 关联数据随题目 ID 稳定`） |
| A1 | 删除某题不影响其余 | updateLesson 提交 subset | 其余题目 ID 不变 | ✅ 通过（同上） |
| A2 | 管理接口内部用完整 UUID | createLesson 返回 | 题目 id 匹配 `/^[0-9a-f-]{36}$/` | ✅ 通过（`A1/A2 · createLesson 返回完整 UUID`） |
| A2 | 富文本中的客户端题目引用被替换 | content 含 `exercise_temp_a` | 替换为服务端 UUID | ✅ 通过（同上） |
| A3 | `:id` 只按 `lessons` 解析 | updateLesson 提交别的小节题目 ID | 返回 400 `题目 1 不属于当前小节` | ✅ 通过（`A2/A3 · 提交属于别的小节的题目 ID 时报错且不串改`） |
| A3 | 失败时小节保持原状 | 同上失败请求 | title/updated_at 与失败前一致 | ✅ 通过（同上） |
| A4 | createLesson 事务化 | 提交非法题型（type 21 字符） | 整个小节不落库，code=500 | ✅ 通过（`A4 · createLesson 某题写入失败时整个小节不落库`） |

### 前置项 C · `knowledge` / `analysis` / `source` 写入链路

**代码落点：** `lesson-manage.ts` 的 `getExerciseWriteData` / `serializeManageExercise`

| # | 验收点 | 输入 | 预期 | 实测 |
| --- | --- | --- | --- | --- |
| C | 创建题目后三字段落库 | createLesson 提交 knowledge/analysis/source | DB 中三字段为预期值非 null | ✅ 通过（`C · 创建的题目 knowledge/analysis/source 已落库`：knowledge=标准输出、analysis=调用 print、source=static） |
| C | 编辑题目后字段保留 | updateLesson 提交原 exercises | source 保留为 static | ✅ 通过（`A1 · 关联数据` 隐含验证） |

### 前置项 D · `mastery_level` 计算规则与事件矩阵（纯函数，不接入写入）

**代码落点：** `backend/src/services/courses/learning-progress.service.ts`

**验收方式：** vitest 单元测试，文件 `backend/test/unit/mastery-rules.test.ts`

| # | 函数 | 输入 | 预期 | 实测 |
| --- | --- | --- | --- | --- |
| D | `calculateAnswerMastery` | score=90, hintLevelUsed=1 | 90 | ✅ |
| D | `calculateAnswerMastery` | score=140, hintLevelUsed=0 | 100（规范化） | ✅ |
| D | `calculateAnswerMastery` | score=70, hintLevelUsed=-1 | 0（非法提示等级） | ✅ |
| D | `calculateAnswerMastery` | score=70, hintLevelUsed=4 | 0 | ✅ |
| D | `calculateLessonMasteryLevel` | [{100,0},{80,2}], totalExerciseCount=3 | 60（未作答按 0 计） | ✅ |
| D | `calculateLessonMasteryLevel` | [], totalExerciseCount=0 | 0 | ✅ |
| D | `getMasteryBand` | 0/39/59/79/80 | not_started/beginner/developing/proficient/mastered | ✅ |
| D | `resolveMasteryLevel` | choice_correct, current=40, candidate=70 | 70（提升） | ✅ |
| D | `resolveMasteryLevel` | choice_incorrect, current=70, candidate=0 | 70（不下调） | ✅ |
| D | `resolveMasteryLevel` | human_not_mastered, current=70, candidate=30 | 70（未复核不下调） | ✅ |
| D | `resolveMasteryLevel` | human_not_mastered, current=70, candidate=30, reviewed=true | 30（唯一允许的下调入口） | ✅ |

**说明：** 阶段 0A **不接入实际写入**，`updateLessonAndCourseProgress` 仍写 `mastery_level: 0`。写入在阶段 3 与复核闭环一起上线。

### 权限三态回归

**验收方式：** vitest 集成测试，文件 `backend/test/integration/admin-permissions.test.ts`

四组 `*-manage` 路由 × 三身份（未登录 / 普通用户 role=0 / 管理员 role=1）= 12 个用例：

| 路由组 | 端点 | 未登录 | 普通用户 | 管理员 | 实测 |
| --- | --- | --- | --- | --- | --- |
| user-manage | POST /api/v1/admin/user-manage/list | 401 | 403 | 200 | ✅ 全过 |
| course-manage | POST /api/v1/admin/courses | 401 | 403 | 200 | ✅ 全过 |
| chapter-manage | GET /api/v1/admin/chapter/list | 401 | 403 | 200 | ✅ 全过 |
| lesson-manage | GET /api/v1/admin/lessons/list | 401 | 403 | 200 | ✅ 全过 |

**说明：** course-manage 无 GET 列表端点，用 POST `/` 提交 multipart（无文件，`.field('title','...')`）触发 200；multer 对无文件 multipart 放行，handler 创建课程后由 `afterAll` 清理。阶段 2 新增的出题、审核接口的权限回归随阶段 2 验收，不在 0A 范围。

### 阶段 0A 完成标准核对

- [x] 5.0 三项前置 A/C/D 完成标准全部通过
- [x] 权限三态回归通过
- [x] vitest 集成测试 ① 通过（5.2 单向依赖点已闭环）
- [x] `pnpm test` 一条命令跑完纯函数与集成两部分

**阶段 0A 状态：** ✅ **完成**（2026-07-28）

---

## 测试基础设施

### vitest + 临时 PostgreSQL 夹具

**配置文件：**
- `backend/vitest.config.ts`：串行执行（`singleFork: true`）避免数据库污染，复用 `@/*` alias
- `backend/test/setup/setup-env.ts`：worker 启动时改写 `DATABASE_URL` 指向本次运行的唯一测试库，并为 JWT 兜底默认值
- `backend/test/setup/global-setup.ts`：创建独立测试库、执行 `prisma migrate deploy`，并在 teardown 中终止连接后 `DROP DATABASE`

**关键决策：**
- 复用 `docker-compose.dev.yml` 的 `pgvector/pgvector:0.8.2-pg16-bookworm` 容器；每次运行生成 `codestory_vitest_test_<pid>_<random>` 独立数据库，避免并发任务互相删库
- 测试库只用 `prisma migrate deploy` 建表，使测试同时验证业务代码与完整迁移链
- `pnpm test` 视为本地显式授权；远程数据库必须额外设置 `CODESTORY_ALLOW_TEST_DATABASE=1`，`NODE_ENV=production` 时始终拒绝建库
- `app.ts` 加 `if (!process.env.VITEST)` 守卫跳过 `app.listen`，supertest 直接调用 app 对象
- vitest 无独立 `globalTeardown` 配置项，teardown 由 `globalSetup` 返回函数实现；迁移失败时也立即删除本次测试库

**运行命令：**
```bash
cd backend
docker compose -f ../docker-compose.dev.yml up -d   # 前置：dev 栈在跑
pnpm test                                            # 跑所有测试
pnpm check                                           # build + auth + test 完整链路
```

**实测（2026-07-28）：** 7 条迁移从空库执行成功，6 个测试文件 / 46 个用例全过，耗时 58.90s；teardown 已删除本次唯一临时库。

---

## 已知问题与登记

### 1. ~~迁移历史与 schema.prisma 不完全一致~~（已修复）

**现象：** `prisma/migrations/` 的 `20260505014519_init_full_schema/migration.sql` 未建以下列，但 `schema.prisma` 定义了它们，开发库 `codestory` 已手工 `ALTER` 补上：

| 表 | 缺失列 | schema.prisma 定义 |
| --- | --- | --- |
| `courses` | `course_seq` | `Int @default(autoincrement())` |
| `chapters` | `chapter_seq` | `Int @default(autoincrement())` |
| `lessons` | `lesson_seq` | `Int @default(autoincrement())` |
| `exercises` | `hints` | `Json? @db.Json` |
| `exercises` | `order` | `Int @default(0)` |

**原影响：** 用 `prisma migrate deploy` 新建的库会缺这些列，PrismaClient insert 报 `column does not exist`。

**修复：**
- 已补迁移 `20260728000000_add_seq_columns/migration.sql`（用 `ADD COLUMN IF NOT EXISTS ... SERIAL`，开发库与新建库均幂等）
- 新增 `20260728010000_reconcile_schema_columns/migration.sql` 补建 `exercises.hints/order`，并为可能由手工 `ALTER` 建成普通整数的 seq 列补齐 sequence、default、回填与 `NOT NULL`
- 测试库改用 `prisma migrate deploy`，不再用 `db push` 绕过迁移历史

### 2. ~~globalTeardown 偶发不执行~~（已修复）

**原现象：** 初版误用独立的 `globalTeardown` 配置项，但 vitest 无此选项（teardown 必须由 `globalSetup` 返回函数实现），导致测试库残留。

**修复：** 将 teardown 逻辑合并到 `globalSetup` 的返回函数中；每次测试使用唯一数据库名，正常结束或迁移失败时删除本次数据库，不会删除其他并发任务的测试库。

---

## 后续阶段验收条目（占位）

- 阶段 0B：vitest 夹具已就绪，待补 pgvector 扩展、LangGraph checkpointer、zod、pino 等
- 阶段 1：RAG 检索层 + 集成测试 ②（向量索引换代）
- 阶段 2：AI 出题 + 出题/审核接口的权限三态回归
- 阶段 3：评分复核闭环 + `mastery_level` 实际写入
- 阶段 4：LangGraph 学习状态机
- 阶段 5：跨小节推荐 + 错题复习
- 阶段 6：可观测性 + 评估报告
