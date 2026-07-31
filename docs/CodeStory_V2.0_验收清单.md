# CodeStory V2.0 验收清单

> **状态：** 阶段 0B 已完成；阶段 1 检索与回答模型对照完成，grounded-v2 上线门禁通过
>
> **最后核对：** 2026-07-31
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

## 阶段 0B — AI 基础设施与本地验证

### 数据库与 pgvector

| 验收点 | 实测结果 |
| --- | --- |
| 空临时库执行完整迁移链 | ✅ 8 条 migration 全部成功 |
| `vector` 扩展与 `vector(1024)` | ✅ migration 创建成功 |
| 原始 SQL 显式 `$1::vector` 查询 top-k | ✅ 最近文本以余弦距离返回第一名 |
| 新增数据结构 | ✅ `knowledge_chunks`、`knowledge_index_state`、`learning_run_effects` 及会话运行字段已创建 |
| 本地开发库迁移 | ✅ `20260730000000_add_ai_foundation` 已执行 |

### LangGraph checkpointer

| 验收点 | 命令 | 实测结果 |
| --- | --- | --- |
| 独立初始化 | `pnpm run setup:checkpointer` | ✅ 成功 |
| 重复初始化 | 连续执行第二次 | ✅ 成功，已有表和数据未受损 |
| 跨进程恢复 | `pnpm run check:langgraph` | ✅ 进程 A 在 `resume` 节点中断，进程 B 使用同一 `thread_id` 恢复并完成 |
| 同步持久化 | 验证脚本传入 `durability: 'sync'` | ✅ 进程退出前 checkpoint 已落库 |
| 应用启动隔离 | 检查 `src/app.ts` | ✅ 未调用 `PostgresSaver.setup()` |

### RAG、结构化输出与请求上下文

| 验收点 | 实测结果 |
| --- | --- |
| `RecursiveCharacterTextSplitter` 切片与 hash 稳定 | ✅ 单元测试通过 |
| 11 条 embedding 本地拆批 | ✅ fake client 观测为 `[10, 1]` |
| embedding 维度保护 | ✅ 配置固定 1024，其他维度要求先迁移并重建 |
| 代码评阅 zod schema | ✅ 合法样本通过，越界分数被拒绝 |
| 选择题讲解 zod schema | ✅ 合法样本通过，非法布尔值/缺失字段被拒绝 |
| 深层 service 读取同一 `trace_id` | ✅ AsyncLocalStorage 单元测试通过 |
| HTTP trace | ✅ 请求生成/接受安全的 `x-request-id`，响应返回 `x-trace-id` |
| 日志脱敏 | ✅ authorization、cookie、密码、Token、API Key 和完整 Prompt 配置为脱敏字段 |

### 评测夹具

- `backend/evals/` 已固定统一 schema、数据集版本、Prompt 版本、默认模型和报告格式。
- `pnpm run eval` 通过：答疑 grounding、AI 出题、代码评分各 20 条，共 60 条固定冒烟样本。
- 当前只完成 `fixture_validation`，真实质量指标在阶段 1/2/3 分别补齐，不把夹具校验冒充模型效果。

### 自动化门禁

| 命令 | 实测结果 |
| --- | --- |
| `pnpm run build` | ✅ 通过 |
| `pnpm run test` | ✅ 8 个测试文件 / 54 个用例全过 |
| `pnpm run check:auth` | ✅ Token、Session、Rotation、Logout 全过 |
| `pnpm run check` | ✅ build + auth + test 完整通过 |
| `git diff --check` | ✅ 通过，仅有既有 CRLF 提示 |

### 真实端点补验

- [x] SiliconFlow `Qwen/Qwen3-Embedding-4B` 文档与查询向量均返回 1024 维有限数值。
- [x] DeepSeek V4 Flash 代码评阅结构化输出通过 zod 校验。
- [x] DeepSeek V4 Flash 选择题解释结构化输出通过 zod 校验。

**阶段 0B 状态：** ✅ **已完成**（2026-07-30）

---

## 阶段 1 — RAG 检索与管理端索引闭环

### 索引换代、检索与降级

| 验收点 | 实测结果 |
| --- | --- |
| generation CAS 与整源事务换代 | ✅ 连续重建只保留当前代，过期任务不能覆盖新内容 |
| 换代失败保护 | ✅ embedding/写入失败时旧 chunks 保留，状态可由补偿流程收敛 |
| 授权检索 | ✅ 限定有效课程、小节与非 AI 静态题，跨课程内容不可召回 |
| 删除失效 | ✅ 小节及层级删除会失效对应状态并移除活动 chunks |
| 对话降级 | ✅ RAG 关闭或失败时回退既有小节正文上下文 |

### 管理端可见性与恢复操作

| 验收点 | 输入 | 预期 | 实测 |
| --- | --- | --- | --- |
| 小节索引状态 | 打开小节管理列表 | 展示 `已同步/待同步/部分失败/同步失败/未索引` | ✅ 已实现持久化汇总状态列 |
| 单小节重试 | 点击失败小节的“重试同步” | 只重建该小节及其静态题，返回汇总状态 | ✅ 已实现 |
| 当前筛选批量同步 | 已应用课程或章节筛选后点击“同步当前筛选” | 二次确认后只重建筛选范围 | ✅ 已实现；无课程/章节范围时禁用，后端同步校验 |
| 保存结果反馈 | 新建/编辑小节 | 业务保存不被索引失败回滚，并区分成功/部分失败/失败 | ✅ 已实现 |
| 层级标题联动 | 修改课程或章节标题 | 重建全部后代小节与静态题索引 | ✅ 已实现；无实际标题变化不触发 |
| 层级删除失效 | 软删除课程、章节或小节 | 同事务失效后代索引 | ✅ 已实现 |
| 内容就绪门禁 | 保存空白、仅标题或过短内容 | 空白不索引；短内容待审核；非空短内容可人工纳入 | ✅ 已实现 |
| 回收与保留 | 删除课程、章节、小节或题目 | 30 天内可恢复；有学习记录的过期内容继续归档 | ✅ 已实现 |
| 问题来源隔离 | 执行治理脚本 | 13 个来源排除，2 条测试小节进入回收站 | ✅ 已执行 |
| 管理接口权限 | 调用 `POST /api/v1/admin/lessons/reindex-batch` | 未登录 401、普通用户 403、管理员进入业务校验 | ✅ 自动化测试通过 |

### 阶段 1 自动化门禁

| 命令 | 实测结果 |
| --- | --- |
| 后端 `pnpm run build`、`pnpm run test` | ✅ build + 10 个测试文件 / 77 个用例全过 |
| 前端 `pnpm run check` | ✅ TypeScript + ESLint 全过 |
| 临时库迁移 | ✅ 10 条 migration 从空库执行成功，teardown 删除临时库 |

**阶段 1 状态：** ✅ 实现、内容门禁、问题来源隔离、检索与回答模型对照全部完成。4B 保持主选（Recall@5 = 1.00、MRR@5 = 0.9867）；DeepSeek V4 Flash 使用 grounded-v2 后 claim 支持率 48/53 = 0.9057；后端 10 个文件 / 77 个用例通过。仓库默认 `AI_RAG_ENABLED=false`，部署完成迁移、重建和冒烟后由环境显式开启。

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

**最新实测（2026-07-30）：** 9 条迁移从空库执行成功，10 个测试文件 / 70 个用例全过；teardown 已删除本次唯一临时库。

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

- 阶段 0B：已完成；真实 AI/embedding 端点通过
- 阶段 1：实现、管理端索引闭环与集成测试通过；标签复核完成，13 个问题来源待清理，RAG 默认关闭
- 阶段 2：AI 出题 + 出题/审核接口的权限三态回归
- 阶段 3：评分复核闭环 + `mastery_level` 实际写入
- 阶段 4：LangGraph 学习状态机
- 阶段 5：跨小节推荐 + 错题复习
- 阶段 6：可观测性 + 评估报告
