# CodeStory V2.0 AI 增强执行计划

> **✅ 状态：当前有效**
>
> **文档版本：** V2.0-plan.9
>
> **创建日期：** 2026-07-21
>
> **最后核对：** 2026-08-04
>
> **适用范围：** `backend/src/services/ai/**`、`backend/src/services/courses/**`、`backend/src/services/course-manage/**`、`backend/src/services/rag/**`（新增）、`backend/src/middleware/**`、`backend/prisma/**`、`frontend/src/app/(admin)/exercises-manage/**`、`frontend/src/components/lessons/**`、`docker-compose*.yml`、`.env.production.example`、`docs/DEPLOY_DOCKER.md`
>
> **文档用途：** V2.0（AI 助手增强）阶段的开发、验收依据。

> **2026-08-04 模型切换：** 生产候选回答、出题和评分模型改为 SiliconFlow
> `Qwen/Qwen3-30B-A3B-Instruct-2507`。文档内 DeepSeek 指标保留为历史基线；
> 阶段 1 回答、阶段 2 出题和阶段 3 评分的 Qwen3 固定集机器门禁已重新通过；
> 三阶段的独立人工质量项仍待补。
>
> **上游依据：** 需求与数据模型以 [`CodeStory_开发文档_V1.1.md`](./CodeStory_开发文档_V1.1.md) 为准；V1 AI 助手已实现范围见（已归档）`CodeStory_AI助手_V1开发路线.md`。
>
> **范围策略：** 务实渐进。本阶段聚焦 **AI 能力增强**：先清掉三项阻塞前置，再补齐 P0 的 AI 出题、引入 RAG（pgvector），最后用 LangGraph 落地跨请求学习状态机。真沙箱判题与 V2.1 业务模块（通知、社群、测试、多端）**不在本计划内**，仅在第 8 节列为后续方向。
>
> **本版（plan.9）相对 plan.8 的实质变更：**
>
> 1. **阶段 0B 已完成**：pgvector 数据模型、LangGraph PostgreSQL checkpointer、RAG 骨架、embedding 分批、zod 结构化输出、pino/trace_id 与评测夹具均已落地；SiliconFlow Embedding 与 DeepSeek 结构化输出已完成真实端点验证。
> 2. **完成本地基础设施验收**：完整迁移链、vector(1024) top-k、checkpointer 重复初始化、跨进程恢复以及后端 build/auth/test 门禁通过；vitest 为 8 个文件、54 个用例全过。
> 3. **外部端点已验证**：SiliconFlow `Qwen/Qwen3-Embedding-4B` 的 1024 维文档/查询向量，以及 DeepSeek V4 Flash 的代码评阅/选择题解释结构化输出均已实测通过。
>
> **本版（plan.8）相对 plan.7 的实质变更：**
>
> 1. **同步本地迁移实况**：最终迁移 dump 已恢复到独立开发命名卷 `codestory_dev_postgres_data`，并完成 PostgreSQL、Redis、前端、公开 API、CORS 与历史图片的本地端到端验证。
> 2. **完成 0A 自动化验收**：题目稳定 ID、事务回滚、三身份权限与掌握度纯函数已纳入 vitest；测试夹具使用每次运行唯一的临时库，并通过 `prisma migrate deploy` 同时验证完整迁移链。
> 3. **明确当前执行顺序**：0C 的本地迁移准备已经完成，目标服务器导入与生产切换按用户决定延期；0A 完成后开发主线进入阶段 0B，不得把本地验证误记为生产上线。
>
> **plan.7 相对 plan.6 的实质变更（保留备查）：**
>
> 1. **重写阶段 0C 的生产拓扑与恢复流程**：数据库定为同机 Compose 内的 PostgreSQL 16 + pgvector，镜像固定版本且不发布端口；补数据库健康检查、独立应用账号、外部命名卷、内部数据网络、原子 `pg_restore`、ACL 决策与 Prisma 迁移对账。
> 2. **修正“PG16 dump 强制目标实例为 PG16”的错误推论**：归档格式只约束 `pg_restore` 客户端不能低于 16；本项目选择 PG16 是为了与源库和开发环境保持一致，不是格式强制。以后升级 17/18 需同步验证 Prisma、pgvector 和卷路径。
> 3. **统一生产入口口径**：Compose 默认 `80:80`，也允许宿主反代使用 `127.0.0.1:18080`；文档明确两个 `NEXT_PUBLIC_*` 必须填写浏览器实际 origin，变更后重建前端。
> 4. **历史 uploads 改为必恢复项**：启用 OSS 只影响新上传，不能替代历史 `/uploads/%` 文件；只有数据库查询证明零引用时才允许跳过。
> 5. **修正选择题成绩事实与实现**：提交接口不再信任客户端 `hint_level_used`，统一读取提示服务写入的数据库状态；选择题和代码题都以 `Math.max(existingAnswer.score, score)` 保存最佳分。
> 6. **接管生产备份职责**：0C 增加每日数据库/uploads 备份、异地加密副本、保留策略和月度恢复演练要求。
> 7. **登记 Radix UI 的既有工作区变更**：它是独立的前端行为原语改造，不作为 AI 依赖清单的一部分；应与 0A 数据完整性改动分开提交和验收。
>
> **plan.6 相对 plan.5 的实质变更（保留备查）：**
>
> 1. **撤销 checkpoint 与 Prisma 业务写入“同一事务”的不可实现承诺**：官方 `PostgresSaver` 与 Prisma 各自管理数据库连接，改为 checkpoint 同步持久化 + 业务副作用幂等 + 对账补偿。详见 3.1.2、第 4 节、阶段 4。
> 2. **区分请求并发与节点重放**：`state_version` 继续防双击/多标签页，新增 `learning_run_effects.effect_key` 防进程恢复、interrupt 或节点重试造成业务副作用重复执行。详见 3.1.2、3.6。
> 3. **索引换代增加 generation CAS**：解决两个索引任务乱序完成时旧任务覆盖新内容的问题；最小补偿脚本由阶段 6 前移到阶段 1。详见 3.2、第 4 节、阶段 1。
> 4. **复核单增加提交指纹与答案版本**：既防重复建单，也防旧复核结论覆盖用户后续提交形成的新状态。详见第 4 节、阶段 3。
> 5. **增加图版本治理**：学习运行记录 `graph_version`，明确存量 checkpoint 的兼容、排空或重开策略。详见 3.1.2、第 4 节、阶段 4。
> 6. **修正评测标签与可靠性门槛**：RAG 标注不再绑定重建后会变化的 chunk 行 ID；外部模型任务不再要求“修复后 100%、最终失败 0”，Schema 合规测试与线上可靠性 SLO 分开。详见 5.1。
>
> **plan.5 相对 plan.4 的实质变更（保留备查）：**
>
> 1. **前置项 A 扩容**：并入 `createLesson` 的事务化（它与 `updateLesson` 是同一处吞异常写法）、修正 `updateLesson` 把 `:id` 先按题目短 ID 解析的缺陷、管理接口内部改用完整 UUID、题目 diff 规则改为"可解析且归属匹配才 update"。详见 5.0。
> 2. **向量索引去掉 `source_version` 唯一键**：改为 `(source_type, source_id, chunk_index)` + 事务内整源换代，从结构上消除旧版本 chunk 被召回的可能，不再需要版本提升协议。详见第 4 节、3.2。
> 3. **状态机并发控制定为 `state_version` 条件更新**：plan.4 的"幂等键**或** state 版本号"是关键一致性机制上的二选一，作废。详见 3.1.2、第 4 节、阶段 4。
> 4. **`mastery_level` 写入时机收敛到阶段 3**：plan.4 的前置项 D 与阶段 3 都声称"实际写入"，重复且矛盾；改为前置项 D 只定义规则与纯函数，阶段 3 接入写入，并补「允许提升／允许下降／需复核」事件矩阵。详见 5.0、3.4.2、阶段 3。
> 5. **`AI_GRAPH_ENABLED` 的前端可见性改由接口下发**：它是后端环境变量，Next.js 浏览器代码读不到。详见 3.1.4。
> 6. **"Schema 通过率 100%" 拆为三项口径**：原指标在"解析失败允许一次修复重试"的前提下分母天然全过，是空指标。详见 5.1、阶段 2。
> 7. **`PostgresSaver.setup()` 明确为独立部署步骤**，不在应用实例启动时执行。详见第 4 节、阶段 0B/0C。
> 8. **阶段 0C 按"源库已停写"收敛**：删去停写窗口／增量同步类要求，补生产凭据轮换，改写回滚点口径。详见阶段 0C。
> 9. **vitest 范围从"仅纯函数"扩到"纯函数 + 2 个后端集成测试"**：计划自己的前置项 A 验收标准（事务回滚）本身就是集成测试。详见 5.2、2.3。
>
> **plan.4 相对 plan.3 的实质变更（保留备查）：**
>
> 1. **撤销"新增 `requireAdmin`"前置项**：该中间件早在 2026-05-21（`cc80d44`）就已实现并挂载，plan.3 把一处本来正确的描述"修正"成了错误，并据此虚构出一项阻塞前置。阻塞前置由四项收敛为**三项（A/C/D）**。详见 1.1、3.6。
> 2. **消解出题审核与状态机的互斥**：状态机 `QUESTION` 节点只从 `review_status='approved'` 的题库取题，不在用户请求中即时生成。详见 3.1.2、阶段 4。
> 3. **收紧 2.4 的成绩约束措辞**：原"AI 不得直接覆盖用户成绩"把 V1 已上线的代码题 AI 评分也一并禁掉了，改为"不得在无人工复核的情况下下调成绩或判定为未掌握"。详见 2.4。
> 4. **补齐幂等与一致性的落库形式**：`knowledge_chunks` / `knowledge_index_state` 补唯一约束；`ai_grading_reviews` 改存提交快照；索引状态先写 `pending` 再调 embedding。详见第 4 节、3.6。
> 5. **`thread_id` 改绑一次"学习运行"**：`ai_chat_sessions` 新增 `current_run_id`，避免重学/多标签页落回旧 checkpoint。详见 3.1.2。
> 6. **阶段 0 拆为 0A/0B/0C**，阶段 3 收缩为"评分复核闭环与掌握度落地"，限流从阶段 6 前移至阶段 2。详见第 5 节。
> 7. **删除过时的 Prisma `postgresqlExtensions` 写法**（该预览特性已不在官方 preview 列表中）。详见 4.1。
>
> **plan.3 相对 plan.2 的实质变更（保留备查）：**
>
> 1. **LangGraph 用途反转**：不再用于出题子图与判分子图（二者都是单请求内跑完的线性流程，用不到 checkpointer / interrupt / cycle），改为驱动开发文档 V1.1 §3.2.1 的**跨请求学习状态机**。详见 3.1。
> 2. **修正多处与代码不符的事实描述**（题目落库处、`exercises-manage` 页面状态、`knowledge` 等字段可用性、题型支持范围）。详见第 1 节。⚠️ 其中"角色中间件缺失"一条本身是错的，已由 plan.4 撤销。
> 3. **生产数据库迁移至自有远程实例**，解除 pgvector 扩展权限不可控的风险。
> 4. **阶段重排为 0～6**，并引入 vitest 覆盖纯函数，使部分验收门槛可自动回归。
> 5. **新增 3.7 / 3.8 技术栈决策**：维持 Express 不迁移 NestJS（附量化依据与重评估触发条件）；确定"优先用成熟库、不自造轮子"的依赖清单（zod / textsplitters / AsyncLocalStorage / pino 等）。

---

## 1. 背景与当前阶段判断

### 1.1 结合代码的现状盘点

V1.0 基础平台与 V1.1 AI 助手核心闭环**已完成主干**，但后台内容管理与权限存在若干未完成项，V2.0 依赖它们：

| 模块 | 状态 | 代码依据 |
| --- | --- | --- |
| 认证（注册/登录/验证码/找回/双 Token/Redis 会话） | ✅ 完成 | `services/auth/*`、`config/auth-*.ts` |
| 课程/章节/小节 后台 CRUD + 前台展示 | ✅ 完成 | `services/course-manage/*`、`app/(admin)/*`、`app/(main)/courses/**` |
| 题目后台 CRUD | ⚠️ 部分完成 | 稳定 ID 与字段链路已实现，独立题目管理页仍在阶段 2；见 1.1.1 |
| 权限控制（角色/RBAC） | ✅ 完成 | `middleware/auth.ts:123` 的 `requireAdmin`（未登录 401、`role !== 1` 返回 403）；四组管理路由已在 `app.ts:46-65` 统一挂 `[authMiddleware, requireAdmin]`。提交 `cc80d44`（2026-05-21） |
| 学习进度（课程/小节） | ✅ 完成 | `courses_progress`、`lessons_progress`（但 `mastery_level` 见 1.2） |
| 小节 AI 流式对话 + 会话/消息持久化 + 上下文裁剪 | ✅ 完成 | `services/ai/lesson-chat.service.ts`、`lesson-session.service.ts`、`routes/ai.ts` |
| 三级提示 + 选择题 AI 解释 | ✅ 完成 | `services/courses/exercise-hint.service.ts`、`services/ai/choice-explanation.service.ts` |
| 无沙箱代码 AI 评阅 + 结构化评分整合 | ✅ 基础完成 | `services/ai/code-review.service.ts`、`services/courses/code-grading.service.ts`、`code_submissions` 表 |

#### 1.1.1 题目管理核对结果

题目当前仍没有独立管理链路；0A 已修复其中两项数据完整性问题，独立管理页留在阶段 2：

1. **无独立管理页（未完成）**：`frontend/src/app/(admin)/exercises-manage/page.tsx` 仍是占位页，题目目前在 lessons-manage 的小节表单内编辑；阶段 2 补齐。
2. **题目稳定 ID（代码与隔离库验收已完成）**：`updateLesson` 已改为完整 UUID + 归属校验的增量 diff，`createLesson` / `updateLesson` / `deleteLesson` 已事务化；管理接口返回完整题目 UUID，并同步修复富文本中的客户端临时题目引用。vitest 已在唯一临时库验证稳定 ID、归属拒绝及 create/update 整体回滚。
3. **字段写入链路（已完成）**：`knowledge` / `analysis` 已加入小节题目表单与 create/update，手工新建题目固定 `source='static'`，既有 AI 来源在编辑时保持不变。

### 1.2 技术底座现状

- 后端已引入 `@langchain/openai` + `@langchain/core`，通过 SiliconFlow OpenAI 兼容接口对接 **DeepSeek V4 Flash / Qwen3 Embedding**（`config/ai.ts`、`services/ai/_shared/model.ts`）。
- **LangGraph 基础设施已就绪但尚未接入业务图**：依赖、独立 checkpointer setup 和跨进程恢复验证已在阶段 0B 完成；正式学习状态机仍属于阶段 4。
- `ai_chat_sessions.state`（INIT/EXPLAIN/QUESTION…）与 `hint_level` 字段在表中存在，**但代码未真正驱动状态机**——目前是"自由流式对话 + 关键词识别提示意图"（`routes/ai.ts` 的 `isHintIntent` / `resolveMessageType`）。`getOrCreateLessonChatSession` 会把这两个字段读出来，但没有任何调用方消费或写入。
- **RAG 正式实现、问题来源隔离、模型对照与 claim 级机器门禁已完成**：内容就绪门禁、30 天回收与管理端闭环已落地；4B、8B、BGE-M3 的 Recall@5 均为 1.00，按既定规则保持 4B；Qwen3 30B 使用 grounded-v3.1 的课程 claim 支持率为 116/121 = 0.9587，独立人工复核待补。仓库功能开关继续安全默认关闭，由部署环境完成迁移、重建和冒烟后显式开启。
- **角色中间件已存在且已挂载**：`middleware/auth.ts` 导出 `requireAdmin`，`app.ts` 的 `user-manage` / `courses` / `chapter` / `lessons` 四组管理路由均以 `[authMiddleware, requireAdmin]` 挂载。V2.0 新增的管理接口沿用它即可，**无需新写中间件**（plan.3 此处描述有误，已撤销对应前置项）。
- **`lessons_progress.mastery_level` 是死字段**：仅在 `learning-progress.service.ts` 的 `updateLearningProgress()` 创建记录时写入 `0`，全项目无更新点。
- **题型实际只支持两种**：`submitExercise` 只处理 `single_choice` 与 `code`；`fill` 在前端 `EXERCISE_TYPE_MAP` 有定义但被 `getExerciseTypeOptions()` 排除，`judge` 全项目不存在。提交一道 `fill`/`judge` 题会静默走完流程并得 0 分。
- **生产数据库原为外部实例**（旧部署文档与 `.env.production.example` 的 `TEACHER_DB_HOST`），pgvector 二进制和扩展权限均不可控。**V2.0 起迁移至应用服务器同机的生产 Compose PostgreSQL**（阶段 0C），使用固定版本 `pgvector/pgvector:0.8.2-pg16-bookworm` 且不发布数据库端口。该迁移**阻塞发布但不阻塞开发**，本地开发使用同一 PG/pgvector 版本。
  - 📌 **迁移进度（2026-07-27 核对）**：原始数据库与 uploads 已在隔离 PG16 中恢复；可恢复媒体已迁入自有私有 OSS，数据库 URL 已改为 `/uploads/...` 后端代理路径，并生成 `codestory_backup/codestory_db_migrated_20260727.dump`。该归档已通过一次完整恢复演练，并已导入独立本地开发卷完成应用端到端验证；剩余动作是目标服务器导入、生产回归和切换，见阶段 0C。
  - ⚠️ 该目录含生产数据与凭据，**不得入库**：`.dump` / `.backup` / `backups/` 已在 `.gitignore` 中，`codestory_backup/` 已于本次一并补入。

### 1.3 与文档/目标对齐后的缺口

1. **AI 出题生成**：`CodeStory_开发文档_V1.1.md` 第 2.2.1 节标记为 **P0**（"AI 生成小节题目供管理员审核"），代码中**完全缺失**，无生成服务与路由；`exercises.source` 字段存在但无任何写入方，现存题目该字段均为 `null`（既不是 `ai` 也不是 `static`）。
2. **跨请求学习状态机**：未做。V1.1 §3.2.1 定义的 `INIT→EXPLAIN→QUESTION→WAIT_ANSWER→EVALUATE→HINT→REVIEW` 流程，代码中只有零散的单点能力，没有流程驱动。
3. **RAG / 向量库 / 长期记忆（阶段 1 机器门禁通过）**：pgvector 索引、授权检索、对话 grounding、内容门禁、回收机制和管理端索引闭环已落地；4B/8B/BGE-M3 的 Recall@5 均为 1.00，Qwen3 30B grounded-v3.1 的 claim 支持率为 0.9587，独立人工复核待补。
4. **三项工程前置**：代码与自动化验收均已实现；题目稳定 ID、事务回滚、字段写入链路、掌握度纯函数和三身份权限回归已进入统一 vitest 测试（见 5.0）。
5. 其余延后项：真沙箱判题、可观测性、限流、提交历史面板、自适应难度。

### 1.4 结论

项目已完成阶段 1 的检索与 Qwen3 30B 固定集机器质量门禁，候选组合为 Qwen3-Embedding-4B + Qwen3 30B + grounded-v3；独立人工复核仍待补。0C 的目标服务器导入与生产切换仍延期执行；仓库开关保持默认关闭，生产部署完成迁移、重建和冒烟后再显式开启。阶段 2 已解锁。

---

## 2. V2.0 目标与范围边界

### 2.1 目标

在不破坏现有稳定闭环的前提下，让 AI 助手从"单轮对话 + 分散 service 调用"演进为 **"检索增强的答疑 + 可持久化恢复的引导式学习流程"**，并补齐管理员 AI 出题能力。

### 2.2 本计划范围内（In Scope）

- 三项阻塞前置：题目稳定 ID 增量更新、`knowledge`/`analysis`/`source` 写入链路、`mastery_level` 写入规则（见 5.0）。
- 生产数据库迁移至自有服务器 Compose 内的 PostgreSQL，并启用 pgvector。
- RAG 检索基础设施（pgvector + embedding + 统一检索层）。
- 对话答疑 grounding、AI 出题 grounding、跨小节知识检索/推荐、错题与个性化复习 —— 四个 RAG 场景共用同一检索层，分优先级落地。
- AI 出题（P0）与 `exercises-manage` 独立题目管理页（含审核流）。
- 低置信度评分的人工复核闭环与申诉入口；代码题评分链重构为可复用形式（非代码题多维评分不在本期，见阶段 3）。
- **LangGraph 学习状态机**：以新增的"引导式学习"模式落地，与现有自由对话并存。
- 任务级可观测性（调用链路、成本、成功率、降级原因）与离线/在线效果评估。
- 任务状态、短期对话记忆、用户学习记忆、课程知识库的分层治理。
- 索引重建脚本、基础限流、vitest 纯函数测试。

### 2.3 明确不做（Out of Scope）

- 真沙箱运行判题（保持无沙箱 AI 评阅）。
- V2.1 业务模块：通知提醒、学习社群、测试系统、多端适配。
- 消息队列（BullMQ）、复杂可观测性平台、系统化 Prompt Injection 测试集。
- `fill` / `judge` 题型（平台当前判不了分，需先补判分与渲染，见第 8 节）。
- 端到端测试与完整集成测试体系（vitest 覆盖纯函数 + **2 个**指定的后端集成测试，见 5.2）。

### 2.4 全局约束（继承既有规则）

- **现有自由对话链路（`POST /ai/chat/stream` → `streamLessonChat`）保持不动**。RAG 只在上下文装配层（`lesson-context.service.ts`）接入；学习状态机是**新增的并行模式**，不改写这条链路。
- 所有新增 AI 流程必须有**失败降级**，不得阻塞用户主流程（与 V1 一致）。
- 引导式学习模式由功能开关 `AI_GRAPH_ENABLED` 控制，默认关闭；关闭时后端不注册相关路由，前端按接口下发的能力位不渲染入口（下发方式见 3.1.4）。
- AI 输出不得直接覆盖课程正文与标准答案；AI 生成的内容一律先落 `draft`，经管理员采用后才对学习端可见。
- **AI 参与评分的边界**（plan.4 改写，原"不得直接覆盖用户成绩"措辞过宽，把 V1 已上线的行为也一并禁掉了）：
  - **选择题**：对错由规则判定（`exercise.service.ts:218-228` 比对选项字符串），**AI 不参与正确性判定**，只生成解释；
  - **代码题**：沿用 V1 现状，AI 评阅结果参与最终分计算（`calculateAiReviewedFinalScore`）；
  - **红线**：AI 不得**下调已有成绩**或把用户**判定为未掌握**。掌握度只升不降，规则结果与 AI 冲突或置信度低于阈值时保留既有掌握度、只记入错题集。
  - **2026-08-05 修订**：原红线依赖「进入 `pending_review`、人工复核回写后才更新 `mastery_level`」。审查认定人工复核对固定答案题型零信息增量，整套复核队列已移除（见 `03-grading-review.md`），红线改由「掌握度不自动下降」直接保证，不再需要人工兜底。
- **选择题不变量与读写两侧的判定（2026-08-07 新增）**：判分按字母取下标再比对选项字符串（`exercise.service.ts:226-228` 的 `charCodeAt(0)-65`），这条契约要求选项与答案满足一组不变量。此前四份写入校验各自实现、彼此不一致，读取侧则完全没有校验，导致闸门上线前的存量坏题一直送到学生面前。现统一为单一来源 `services/courses/choice-exercise-integrity.ts`：
  - 规则：选项须为数组、≥2 项、无空白项；答案非空、且在选项中**恰好**匹配一次。答案唯一时干扰项之间的重复只记警告。
  - **读写两侧刻意不对称**。写入侧拿未归一化入参、先 trim 再存，`findChoiceExerciseWriteIssue` 把警告也当错误；读取侧拿已落库的行、**不 trim**（判分比的是原值），`inspectChoiceExercise` 只拒真正不可能答对的题，避免把在线可答的题拦下线。
  - 接入点：写入侧 `exercise-manage.ts`（含「直接采用」这条此前零校验的路径）与 `lesson-manage.ts`；读取侧 `exercise.service.ts` 判分（挡在事务之前，不留作答痕迹）、`formatExerciseResponse` 的 `usable` 标志、`learning-graph/graph.ts` 出题时跳过坏题。
  - 存量与回归由 `pnpm run check:exercise-integrity` 守护，另含 U+FFFD 乱码检查——结构不变量看不出内容被编码毁掉。该命令依赖实时数据库，与 `check:learning-runs` 一样不进 `check` 链。
- PostgreSQL 中的课程、题目与学习记录是事实源；向量索引和模型生成内容均为可重建的派生数据。
- 默认不把验证码、Token、联系方式等敏感信息写入 Prompt、向量库或 AI 调用日志。
- 单请求内跑完的线性 AI 流程一律用 LCEL 组装，不为其引入图编排（见 3.1）。

---

## 3. 技术架构决策

### 3.1 LangGraph 落地边界

**原则：只用于跨请求、需要持久化恢复的学习状态机；单请求内跑完的线性流程一律用 LCEL。**

#### 3.1.1 为什么反转用途（相对 plan.2 的决策变更）

plan.2 计划把 LangGraph 用在"出题子图"和"判分-提示-复盘子图"上。复核后判定这两处**不适合**用图编排：

| | 出题流程 | 判分-提示-复盘流程 |
| --- | --- | --- |
| 触发方式 | 管理员点一次按钮 | `POST /exercises/submit` 一次提交 |
| 生命周期 | **一次 HTTP 请求内跑完** | **一次 HTTP 请求内跑完** |
| 结构 | 检索→生成→自检→去重→产出，线性 | 判定→评分→merge→两个 if 分支 |
| 是否有环 | 否（最多一次修复重试） | 否 |
| 是否需跨请求恢复状态 | 否 | 否（提示等级从数据库读回） |

LangGraph 的核心价值是 **checkpointer（跨请求持久化恢复）、interrupt（人在环中断）、cycle（自循环）**，上表两处一个都用不上。plan.2 自己也写了"持久化对接现有 `ai_chat_sessions` 字段，避免新增会话表"，等于主动绕开 checkpointer，剩下的只是一层 API 包装。而 `AI_GRAPH_ENABLED` 双路径灰度意味着同一份逻辑要维护新旧两条实现，在当前工程条件下是净负债。

**真正需要 LangGraph 的，是 V1.1 §3.2.1 定义的学习状态机**：它跨多次 HTTP 请求，用户中途离开需要恢复到原状态，且带 `HINT → WAIT_ANSWER` 的回边。这正是 checkpointer 的用武之地。因此 V2.0 把 LangGraph 用在这里。

#### 3.1.2 学习状态机（引导式学习模式）

以**新增模式**的形式落地，与现有自由对话并存，用户可在小节 AI 面板切换。自由对话链路零改动。

节点按 V1.1 §3.2.1 定义：

```text
INIT → EXPLAIN → QUESTION → WAIT_ANSWER → EVALUATE_BASE → AI_EVALUATE → MERGE_RESULT
                                  ↑                                          │
                                  │                            ┌─────────────┴─────────────┐
                                  │                            ↓                           ↓
                                  │                       通过 → NEXT                  未通过 → HINT
                                  │                                                         │
                                  └──── hint_level < 3 ─────────────────────────────────────┤
                                                                                            │
                                                                       hint_level = 3 → REVIEW
                                                                    （完整解析 + 标记未掌握）
```

- 依赖包：`@langchain/langgraph` + `@langchain/langgraph-checkpoint-postgres`（均新增）。
- **状态持久化用官方 `PostgresSaver`**，它自建 checkpoint 系列表，是图状态的**事实源**。
- **推翻 plan.2 的「避免新增会话表」写法**：`ai_chat_sessions.state` / `hint_level` / `current_exercise_id` 降级为**业务投影**，仅供列表查询、进度展示与断点续学入口使用，每次节点转移后同步写入。手写 checkpointer 以省下几张表属于不必要的复杂度，不做。
- 节点内部的模型调用复用阶段 3 的评分链，**不重复实现**。
- **`QUESTION` 节点只从已审核题库取题**（plan.4 新增）：从当前小节 `review_status='approved'` 且未被该用户做过的题中选择，**不在用户请求中即时调用出题链**。原因是出题链的产物按 2.4 必须先落 `draft` 等管理员采用，若状态机直接消费就会绕过审核；若老实存 `draft` 则学习端查不到、状态机走不下去，两条路都不成立。题库不足时状态机进入"暂无可用题目"分支，转入 `REVIEW` 或结束，并在管理端提示该小节缺题。
- **`thread_id` 绑定一次"学习运行"而非"用户 + 小节"**（plan.4 修正）：`ai_chat_sessions` 新增 `current_run_id`（UUID），`thread_id = current_run_id`。用户重新开始学习该小节时换发新 UUID，旧 checkpoint 自然沉淀为历史。若沿用"用户 + 小节"作为 `thread_id`，重学、重练与多标签页并发都会落回同一条旧线程状态。
- **请求并发控制用 `state_version` 条件更新**：`ai_chat_sessions` 新增 `state_version`（int，随每次成功推进 +1）。推进接口必须携带 `run_id` 与 `expected_state_version`，服务端以 `UPDATE ... WHERE current_run_id = $run_id AND state_version = $expected` 条件更新，**受影响行数为 0 时返回 409 并回传当前状态**，不推进。
  - 该机制覆盖同一标签页双击（第二次请求的 `expected_state_version` 已过期 → 409）和两个标签页并发推进（后到者 409），因此**不再为客户端请求另设 `idempotency_key`**。
  - `state_version` **不能替代图节点副作用幂等**：LangGraph 在进程恢复、interrupt resume 或节点重试时可能重新执行节点。凡是写 `answer`、扣减提示、创建复核单、修改掌握度、积分或业务投影的节点，都必须先以 `(run_id, node_name, effect_type, effect_key)` 在 `learning_run_effects` 登记；唯一 `effect_key` 命中时直接复用已生效结果，不重复写业务表。
  - `run_id` 只用于定位 checkpoint 线程，**不承担并发控制职责**；旧标签页携带已换发的旧 `run_id` 时同样返回 409，而不是推进当前新运行。
  - **不再声称 checkpoint 与 Prisma 业务写入同属一个数据库事务**：官方 `PostgresSaver` 与 Prisma 分别管理连接，无法自然共享本地事务。关键节点使用 checkpoint 的同步持久化模式；业务副作用在 Prisma 事务内以 `learning_run_effects` 保证幂等，并由对账脚本补偿“checkpoint 已推进但业务副作用未完成”或反向的不一致。模型调用仍在数据库事务之外完成。
- **图版本治理**：`ai_chat_sessions` 新增 `graph_version`，启动运行时固定为当时部署版本。升级节点、边或状态 Schema 时必须选择并记录一种策略：① 保持旧版本兼容直到存量运行排空；② 提供显式状态迁移；③ 将不兼容的旧运行标记为 `restart_required` 并安全重开。不得让旧 checkpoint 未经验证直接套用不兼容的新图代码。
- **checkpoint 表不在 Prisma 迁移体系内**，备份/迁移/回滚脚本必须单独覆盖它们（见 4 节末与阶段 0C），否则回滚业务库时图状态会与业务数据错位。

#### 3.1.3 出题链与评分链用 LCEL

`@langchain/core` 已在依赖中，用 `RunnableSequence` / `RunnableBranch` / `.withFallbacks()` / `.withRetry()` 组装，与现有 `prompt.pipe(model)` 写法一致，不引入新依赖。

| 链 | 调用方 A | 调用方 B |
| --- | --- | --- |
| 出题链 | 管理员出题接口（阶段 2） | **无**——状态机只从已审题库取题，不复用出题链（见 3.1.2） |
| 评分链 | `POST /exercises/submit` 普通做题路径（阶段 3） | 状态机 `AI_EVALUATE` / `MERGE_RESULT` 节点（阶段 4） |

#### 3.1.4 开关与流式协议

- `AI_GRAPH_ENABLED`：**引导式学习模式的功能开关**（默认关闭，达到 5.1 门槛后开启），不再是同一逻辑的双路径灰度。关闭时后端不注册状态机路由，自由对话与普通做题完全不受影响。
- **开关如何传到前端**（plan.5 补充）：`AI_GRAPH_ENABLED` 是**后端**环境变量，Next.js 浏览器代码读不到（前端现有 4 处 `process.env` 引用全部是 `NEXT_PUBLIC_API_BASE_URL`）。**由已有的 `GET /ai/chat/history` 响应新增一个 `guidedModeAvailable: boolean` 字段下发**，前端据此决定是否渲染模式入口。
  - 不新开 `/config/capabilities` 路由：本期只有这一个开关，而小节 AI 面板挂载时本来就会调 `chat/history`（`routes/ai.ts:75`），复用它零新增往返、零新增路由。
  - 不用 `NEXT_PUBLIC_AI_GRAPH_ENABLED`：它需要前端重新构建才能生效，且与后端环境变量是两处独立配置，会出现"前端显示入口、后端没注册路由"的不一致。
  - 后续若出现第二、第三个能力位，再把该字段提升为独立能力接口。
- 流式协议向后兼容：`routes/ai.ts` 的 NDJSON 事件保留 `start` / `token` / `done` / `error` 语义不变，新增 `{ type: 'state', state, hintLevel }` 用于驱动前端状态条。前端 `frontend/src/app/api/ai/chat.ts` 的 `StreamEvent` 与 `components/lessons/chat/chatTypes.ts` 按新增字段扩展，旧事件解析逻辑不动。

### 3.2 RAG 架构

- **存储：pgvector，跑在迁移后的自有服务器 Compose PostgreSQL 上**（不引入独立向量库）。
- **Embedding：** SiliconFlow OpenAI 兼容端点，主候选为 `Qwen/Qwen3-Embedding-4B`，用 `@langchain/openai` 的 `OpenAIEmbeddings`，固定输出 1024 维。
  - 默认 batch size 为 10，并由本地显式拆批；模型身份、维度和索引版本写入 generation 状态，切换 4B/8B/BGE-M3 必须全量重建，禁止混用向量。
- **检索层：** 统一封装 `backend/src/services/rag/*`，对上层暴露 `indexSource()` / `retrieve(query, filter)` 接口，被"对话/出题/推荐/复习"四场景共用。
- **索引对象：** 小节正文（按标题/段落切片）、题目（`content` + `knowledge`）、（可选）外部参考文档。
  - 题目索引中的 `knowledge` 依赖**前置项 C**（字段写入链路）先完成，否则该维度无输入。
- **索引触发：** 小节与题目的增删改**全部发生在 `services/course-manage/lesson-manage.ts`**（`createLesson` / `updateLesson` / `deleteLesson`）与阶段 2 新增的题目管理服务中；业务事务内只登记 `pending` generation，提交后在请求内尽力执行首次索引。内容保存成功不因 embedding 失败而回滚，接口返回 `indexStatus`，失败/进程退出由阶段 1 的补偿脚本收敛；另提供全量重建脚本。**不引入消息队列**。
  - **管理端闭环：** 小节列表从持久化状态汇总 `ready/pending/partial/failed/not_indexed`，管理员可按单小节重试，或对已应用的课程/章节筛选执行批量同步。批量接口必须显式限定 `courseId` 或 `chapterId`，避免无范围全库调用。
  - **层级字段联动：** 课程或章节标题发生实际变化时，业务事务内登记全部后代小节与静态题的新 generation，提交后同步完成索引；仅修改封面、描述、级别或排序不触发重建。课程、章节、小节软删除时，同事务失效后代索引。
  - **换代协议：整源替换 + generation CAS，不做版本并存**。一个源（一节小节或一道题）重新索引时：① 事务内锁定/创建 `knowledge_index_state`，递增 `index_generation`，记录本次 `source_updated_at` 并置 `pending`；② **事务外**调 embedding 算出全部新 chunk；③ 在**单个事务**内锁定状态行，仅当 `index_generation` 与 `source_updated_at` 仍等于本任务快照时，才删除该 `(source_type, source_id)` 的旧 chunk、插入新 chunk并置 `ready`，否则丢弃过期结果。
  - 旧 chunk 在第 ③ 步事务提交前始终可见、提交后一次性全换，**既没有"新旧混召"窗口，也没有"索引真空"窗口**。
    - `index_generation` 解决同一来源的两个索引任务乱序完成问题：旧任务即使后返回，也因 CAS 不匹配而不能覆盖新内容。仅靠 chunk 唯一约束不能解决 stale writer。
    - plan.4 把唯一键定为 `(source_type, source_id, source_version, chunk_index)`，会让每次更新都新增一代 chunk 而旧代永不失效，检索必然同时召回新旧内容；补救需要再引入 `pending_version` / `ready_version` 与版本提升协议。**去掉版本维度后这一整类问题不再存在**，与 2.4「向量索引是可重建的派生数据」一致。
  - `source_version` 仍作为**普通元数据列**保留（记录源的 `updated_at`），只用于排查陈旧索引，不参与唯一约束、不参与检索过滤。
  - 源数据删除（`deleteLesson` / 题目软删）时，在同一事务内删除其全部 chunk 并把 `knowledge_index_state` 置为失效。
  - **检索权限与可见状态必须在服务端收口**：阶段 1 沿用现有数据模型，只检索有效课程、小节和非 AI 静态题；阶段 2 增加 `review_status` 后切换为只检索 `approved` 题。`retrieve()` 的调用方不能自行省略权限范围，跨小节召回默认只允许同一门课程。管理用途使用独立的管理员策略。
  - 📌 修正 plan.2：`services/courses/exercise.service.ts` **不含任何题目写入逻辑**（它是学习端的详情/提交/解释服务，只写 `answer` 与 `code_submissions`），此前把它列为索引挂载点是错的。
  - 题目索引的 `source_id` 稳定性依赖**前置项 A**（题目稳定 ID）先完成，否则每次编辑小节都会使该小节全部题目索引失效。

#### 3.2.1 基础设施前置

- **生产库迁移至应用服务器同机的 Compose PostgreSQL**。生产与开发统一使用固定镜像 `pgvector/pgvector:0.8.2-pg16-bookworm`，从镜像层保证 `vector.so` 与扩展控制文件存在；不能只检查 `CREATE EXTENSION` 权限。
- **开发环境**：`docker-compose.dev.yml` 的 `postgres:16-alpine` 换成同一固定 pgvector 镜像。

### 3.3 索引与检索的降级策略

- Embedding 或向量检索失败时，**回退到现有"整段小节正文"上下文**，保证对话不中断。
- 检索为空/相关度低于阈值时，同样回退到原有上下文组装。

### 3.4 上下文分层与生命周期

V2.0 不再用单一 `context` 字段承载所有信息。不同上下文按用途、可信来源和生命周期分层，上层流程只读取完成当前任务所需的最小集合。

| 层级 | 内容与事实源 | 存储位置 | 生命周期与写入规则 |
| --- | --- | --- | --- |
| **任务状态** | 当前图节点、`hint_level`、重试次数、工具结果摘要、待审核原因 | **事实源：** LangGraph `PostgresSaver` checkpoint，按 `thread_id = current_run_id` 定位；**投影：** `ai_chat_sessions.state / hint_level / current_exercise_id`（`current_run_id` 不是投影，它是指向 checkpoint 的线程键） | 随一次学习任务创建；任务完成后保留结构化摘要，不保存冗长中间 Prompt。只有图节点可以更新事实源，节点转移后同步写投影。投影只用于列表查询与断点续学入口，任何流程不得反向从投影恢复图状态。 |
| **短期对话记忆** | 当前会话最近消息、历史摘要、用户本轮问题 | `ai_chat_messages` + 会话摘要 | 会话级；按 token 预算裁剪。模型回复不能作为课程事实，只能作为对话历史。 |
| **用户学习记忆** | 错题、得分、提示使用情况、`mastery_level`、复习完成记录 | `answer`、`code_submissions`、`lessons_progress` 等业务表 | 跨会话保留；仅由可验证的学习行为更新，不把模型对用户的自由推断写成长期画像。**`mastery_level` 的变更严格限于 3.4.2 事件矩阵**。支持按用户删除。 |
| **课程知识库** | 已发布课程、小节、题目及受信任参考资料 | 业务表 + `knowledge_chunks` | 跟随源数据版本更新；向量块记录来源与版本，源内容删除后同步失效，可全量重建。 |

上下文组装顺序固定为“权限与任务约束 → 用户问题 → 检索证据 → 必要的学习状态 → 短期历史”。检索内容使用明确边界包裹并标注来源，任何片段中出现的“忽略系统要求”等指令均视为资料正文，不作为可执行指令。日志默认只记录 token、哈希、来源 ID 和截断后的脱敏摘要，不完整落盘用户 Prompt。

#### 3.4.1 `hint_level` 的双真值源消解

当前提示等级的事实源是 `answer.hint_level_used`（由 `services/courses/exercise-hint.service.ts` 读写），而 `ai_chat_sessions.hint_level` 从未被写入。引入状态机后两者会同时存在，规则如下：

| 路径 | 事实源 | 同步规则 |
| --- | --- | --- |
| 普通做题（`/exercises/hint`、`/exercises/submit`、自由对话中的提示意图） | `answer.hint_level_used` | 维持现状不变 |
| 引导式学习模式 | 图 state 中的 `hint_level` | 每次 `HINT` 节点转移后，以 `Math.max` 语义写回 `answer.hint_level_used`，并同步 `ai_chat_sessions.hint_level` 投影 |

两条路径都只允许提升等级、不允许回退，避免用户在两种模式间切换时提示进度被覆盖或重置。

#### 3.4.2 `mastery_level` 的事件矩阵（plan.5 新增）

前置项 D 只定义规则与纯函数，**实际写入在阶段 3 接入**（理由见 5.0 前置项 D 的说明）。允许的状态变更严格限定为下表，表外的任何事件都不得改写 `mastery_level`：

| 事件 | 允许提升 | 允许下降 | 需人工复核 | 说明 |
| --- | :---: | :---: | :---: | --- |
| 选择题答对（规则判定） | ✅ | — | 否 | 对错由 `exercise.service.ts:218-228` 的选项比对决定，AI 不参与 |
| 选择题答错（规则判定） | — | ❌ | 否 | 只记录错题，不下调既有掌握度 |
| 代码题 AI 评阅通过且置信度达标 | ✅ | — | 否 | 沿用 V1 的 `calculateAiReviewedFinalScore` |
| 代码题 AI 评阅未通过 | — | ❌ | 否 | 维持现状，不下调；进入错题集 |
| 规则结论与 AI 结论冲突 / 置信度低于阈值 | ❌ | ❌ | 否 | 保留既有掌握度，只记入错题集 |
| 状态机 `REVIEW` 节点（hint_level=3 仍未通过） | — | ❌ | 否 | 阶段 4；直接给出参考答案与解析结束本轮，不下调掌握度 |

> **2026-08-05 修订**：人工复核队列已整体移除，本表原有的「人工复核改判为掌握 / 未掌握」两行随之删除。**掌握度不再有任何下降入口**。

- **成绩单调不降已在 plan.7 修复**：此前只有代码题使用 `Math.max(existingAnswer.score, score)`；选择题答对时会用本次按提示扣分后的分数直接覆盖旧分，且扣分等级由客户端请求体提供。现改为提交接口只读取 `exercise-hint.service.ts` 已写入数据库的 `answer.hint_level_used`，并对两种题型统一保存 `Math.max(existingAnswer.score, score)`。客户端不再提交判分依据。
- 红线真正约束的是上表最后两行那种**主动下调**，它们全部要求人工复核前置。
- **取值与公式（0A 定稿）**：
  - `mastery_level` 取整数 `0–100`；`0` 为未开始，`1–39` 入门，`40–59` 发展中，`60–79` 熟练，`80–100` 掌握。
  - 单题掌握值等于规范化后的最佳 `answer.score`。选择题和代码题在本次判分时已经按服务端保存的 `hint_level_used` 扣分，因此换算函数只校验提示等级合法性，**不得二次扣提示分**。
  - 小节候选掌握度为当前有效题目最佳得分之和除以有效题目总数；未作答题按 `0` 计，结果四舍五入并限制在 `0–100`。
  - 自动提升事件取 `max(当前值, 候选值)`；答错、代码未通过、待复核事件保持当前值；只有带已复核标记的人工“未掌握”事件可以把值降到候选值。
  - 纯函数落在 `learning-progress.service.ts`，并已在 0A 纳入正式 vitest 单元测试（见 5.2）。

### 3.5 任务追踪与质量评估

- 每次外部请求生成 `trace_id`，每次 LangGraph 执行生成 `graph_run_id`。模型调用、检索、节点重试、降级、人工审核和用户反馈都必须关联到同一条任务链路。
- 评估分为两层：离线评测用于版本发布前回归，在线指标用于判断真实业务效果。Prompt、模型、检索参数和评测集均有版本号，报告必须能复现具体配置。
- 离线评测集放在 `backend/evals/`，只保存脱敏或构造数据；统一脚本 `scripts/eval-ai-v2.ts` 输出 JSON 结果，并生成 `docs/CodeStory_V2.0_评估报告.md`。
- 质量评估不使用“看起来不错”作为结论。答疑关注召回与证据支持，出题关注答案正确性、重复率和管理员采用率，判分关注与人工评分的一致性，工程侧关注任务成功率、P95 延迟、成本与降级率。

### 3.6 权限、并发与人工复核

- **权限：** AI 出题、审核、索引重建和评估报告接口仅管理员可调用；学习端只能访问自己的会话、提交和复习结果。
  - 📌 **撤销 plan.3 的"需新建角色中间件"**：`middleware/auth.ts:123` 的 `requireAdmin` 早已存在（提交 `cc80d44`，2026-05-21），`app.ts:46-65` 也已给四组 `*-manage` 路由挂上 `[authMiddleware, requireAdmin]`。plan.3 的这条"修正"本身是错的，plan.2 原表述反而正确。
  - **本计划新增的管理路由（出题、审核、索引重建、评估）一律以 `[authMiddleware, requireAdmin]` 挂载**，这是编码约定而非工程前置。资源归属校验仍在 controller 前完成。
  - 保留一条权限回归用例（未登录 401 / 普通用户 403 / 管理员 200），随阶段 2 的新接口一起验收，见 5.2。
- **幂等：**
  - **索引写入**靠唯一约束、整源换代与 `index_generation` CAS 共同保证：唯一约束防重复行，generation 防并发旧任务覆盖新内容（换代协议见 3.2、第 4 节）。
  - **批量出题不引入 `idempotency_key` 与请求表**：出题是单个管理员手点的按钮，重复生成的后果只是多几条 `draft` 草稿——不发布、不计分、可批量删除。用"提交中禁用按钮 + 草稿可批量删除"覆盖即可。为此新建 `ai_generation_requests` 表与当前规模不相称，如果后续出题改为异步批量任务再补。
  - **审核状态流转用条件更新**（`WHERE review_status = 'draft'`），避免并发采用/拒绝相互覆盖；复核记录以 `submission_fingerprint` 唯一约束按提交快照去重。
  - **图节点副作用**以 `learning_run_effects.effect_key` 去重；它与控制 HTTP 并发的 `state_version` 解决不同问题，二者不可互相替代。
- **事务：** 模型输出先完成 Schema 校验、自检和去重，再用单个数据库事务写入候选题；事务失败不得保留半截草稿。
  - **索引与业务数据的崩溃窗口**：在业务事务**内**先递增 generation 并把 `knowledge_index_state` 置为 `pending`，事务提交后再调用 embedding，成功后按 generation CAS 置 `ready`、失败时仅允许当前 generation 置 `failed`。这样即使进程在调用 embedding 期间退出，也会留下 `pending` 记录被校验脚本捡回。**不得在数据库事务内等待模型接口**。
- **超时与重试：** 仅对 embedding、检索和生成等幂等外部调用做有限重试，默认最多 2 次指数退避；总超时后进入既有降级路径。结构化解析失败允许一次修复重试，不无限循环。**实现上直接用 LangChain 的 `.withRetry()` / `.withFallbacks()`（已在依赖中），不自写重试与降级封装**（见 3.8）。
- ~~**人工复核：** 规则判定与 AI 评分冲突、结构化结果修复后仍不完整、命中 Prompt Injection 风险或评分置信度低于阈值时，提交进入 `pending_review`。~~ **2026-08-05 移除**：改为任何情况下都不下调掌握度，冲突与低置信度提交只保留 AI 评语并记入错题集，不再建复核单、不再提供申诉入口。

### 3.7 技术栈决策：维持 Express，不迁移 NestJS

V2.0 期间**不更换后端框架**。该决策与开发文档 V1.1 §5.2 的原始选型一致（"Express 简单灵活，适合 MVP 快速开发；NestJS 更规范但较重"），此处补充复核后的量化依据。

**代码规模分布**（后端 6981 行，不含 generated Prisma）：

| 目录 | 行数 | 与框架的关系 |
| --- | ---: | --- |
| `services/` | 4170（60%） | 框架无关，纯业务逻辑 |
| `utils/` + `types/` + `config/` | 1145 | 框架无关 |
| `routes/` + `middleware/` | 894（13%） | Express 特有 |

**为什么不换：**

1. **浅迁移无收益、深迁移代价大。** 只把 `routes/` 改成 Controller 而 service 仍是导出函数，等于装了 NestJS 却不用 DI、Testing Module、Provider 作用域；要拿到收益就得把 4170 行 service 从 `export async function` 重构成 `@Injectable()` 类并改写全部调用点。
2. **分层债务会放大改动面。** `services/course-manage/*` 四个文件实际是 Express controller（`(req, res)` 签名）而非 service，迁移前必须先拆——而它们正是**前置项 A** 要改的同一批文件，两件事叠加会让回归面积翻倍。
3. **时机最差。** 阶段 0A/0B/0C 已经分别承载三项阻塞前置、AI 基础设施与数据库迁移，是全计划风险最集中的一段；且项目当前零测试覆盖，框架迁移引入的回归只能靠手工发现。
4. **NestJS 的收益在本项目可低成本替代**：Guards → **已有的** `requireAdmin` 中间件；Interceptors → 包一层 `createChatModel` 统一埋点（阶段 6 已如此规划）；Pipes + class-validator → zod；DI + Testing Module → 阶段 0B 只测纯函数，不需要 DI。

**重新评估的触发条件**（满足任一再议）：后端超过约 2 万行；3 人以上并行开发需要强制模块边界；需要引入多租户、审计、复杂事务传播等大量横切关注点。

### 3.8 依赖选型：优先用成熟库，不自造轮子

复核现有代码后确定的引入清单。原则是**只引入能直接消除现有手写实现或支撑 V2.0 验收门槛的库**，不为"看起来更规范"而增加依赖。

#### P0 — 直接影响 V2.0 交付质量

| 依赖 | 替代/支撑 | 理由 |
| --- | --- | --- |
| **zod** | 后端 `utils/validate.ts`（100 行）、`_shared/model.ts` 的 `extractJsonObject` | 一箭双雕：既做 API 入参校验，又做 LLM 结构化输出校验。当前 `extractJsonObject` 用正则抠 ` ```json ` 块、失败再取首个 `{` 到末个 `}`，**撑不起阶段 2 的结构化输出门槛（首次成功率 ≥ 90%、修复后 100%）**。改用 LangChain 的 `withStructuredOutput(zodSchema)`，把"解析 + 校验 + 修复重试"收敛为一处，阶段 3 评分链同样受益。 |
| **`@langchain/textsplitters`** | 阶段 1 的"chunk 切片工具" | `RecursiveCharacterTextSplitter` / `MarkdownTextSplitter` 已覆盖计划中"按标题/段落切片"的需求，且带 overlap 与长度函数配置。**不要自己实现切片器**。 |
| **`node:async_hooks` 的 `AsyncLocalStorage`**（Node 内置，零依赖） | `trace_id` 跨函数传递 | 3.5 要求"模型调用、检索、节点重试、降级、人工审核都关联到同一条任务链路"。若不用 ALS，就得给几乎每个 service 函数签名塞一个 `traceId` 参数，侵入性极大。用 ALS 在请求入口存一次，任意深度直接读取。 |
| **pino + pino-http** | 后端 43 处 `console.log/error` | 开发文档 V1.1 §5.2 写了用 Winston 但**从未安装**。阶段 6 要靠 `trace_id` 还原完整链路，没有结构化日志会非常困难。选 pino 而非 Winston：更轻、更快、TS 支持更好，且 `pino-http` 与 ALS 配合天然。 |

#### P1 — 明确省事

| 依赖 | 替代/支撑 | 理由 |
| --- | --- | --- |
| **express-rate-limit + rate-limit-redis** | 阶段 6 的基础限流 | 项目已有 Redis，直接复用，无需自己实现令牌桶。 |
| **html-to-text** | `lesson-context.service.ts` 的 `htmlToPlainText`（正则剥 HTML） | 小节正文由 tiptap 富文本编辑器产出，含表格、列表、代码块。正则剥标签会把结构信息糊掉，**直接影响 RAG 的切片质量与检索召回**。 |
| **LangChain 内置 `.withRetry()` / `.withFallbacks()`** | 3.6 的"最多 2 次指数退避"与降级 | 已在依赖中，不需要自己写重试与降级封装。 |

#### P2 — 顺手可换，不阻塞

| 依赖 | 替代 | 备注 |
| --- | --- | --- |
| **jwt-decode** | `frontend/src/utils/jwt.ts` 手写的 base64url + `atob` + `decodeURIComponent` 解码 | 手写版本对非 ASCII payload 处理脆弱 |
| **date-fns** | `frontend/src/utils/format.ts`（130 行）的 `.replace()` 链式格式化 | 现有实现依赖 `MM` 早于 `mm` 被替换的顺序巧合，且 `.replace()` 只替换首次出现 |
| **react-hook-form + `@hookform/resolvers`** | `hooks/useExerciseDraft.ts`（142 行）+ `utils/exerciseValidation.ts`（52 行） | 阶段 2 要新建 `exercises-manage` 管理页，正好在新页面上使用，不必回改存量表单 |

#### 已存在但不属于 AI 依赖清单

工作区已引入 `@radix-ui/react-alert-dialog`、`react-dialog`、`react-popover` 与
`react-tooltip`，用于弹层可访问性、焦点管理和滚动锁定，同时由
`frontend/src/components/ui/**` 保持 CodeStory 的 Neo-Brutalism 视觉语言。
这批改动与 0A 数据完整性修复分开提交和验收，不能用修改 0A 范围描述的方式把
无关 UI 重构混入同一变更。

#### 明确不引入

- **lodash**：现代 JS/TS 标准库已够用。
- **class-validator / class-transformer**：属 NestJS 生态，Express 下 zod 更合适。
- **moment**：已停止维护。
- 独立向量库、BullMQ：见 2.3。

> **关于前后端共享 schema**：`backend/` 与 `frontend/` 是两个独立的 pnpm 项目，仓库根目录没有 `package.json` 或 `pnpm-workspace.yaml`。因此两端各自安装 zod、各自定义 schema；**共享校验规则需要先搭 workspace，不在 V2.0 范围内**。

---

## 4. 数据模型变更（最小化）

| 变更 | 对象 | 说明 |
| --- | --- | --- |
| **新增表** `knowledge_chunks` | 向量索引 | `id, source_type(lesson/exercise/doc), source_id, course_id(可空), lesson_id(可空), source_version, chunk_index, content, content_hash, embedding vector(N), metadata json, updated_at, is_delete`；建向量索引（HNSW 优先，或 IVFFlat）和范围过滤索引 `(course_id, lesson_id, source_type, source_id)`。**唯一约束 `(source_type, source_id, chunk_index)`**（plan.5 从唯一键中移除 `source_version`）——配合 3.2 的整源换代协议，一个源在任一时刻只有一代 chunk 在库。`course_id/lesson_id` 只用于高效缩小检索范围，发布/审核/访问权仍以业务表为准；`source_version` 仅作陈旧排查元数据。 |
| **新增表** `knowledge_index_state` | 索引一致性 | `source_type, source_id, source_updated_at, index_generation bigint default 0, indexed_at, status(pending/ready/failed/invalid), error_code`；**唯一约束 `(source_type, source_id)`**，索引 `(status, indexed_at)` 供补偿扫描。最终换代必须校验 generation 与源更新时间，拒绝旧任务覆盖新内容。 |
| **新增字段** `exercises.review_status` | 出题审核 | `varchar(20)`，取值 `draft/approved/rejected`；存量数据默认 `approved` 兼容前台展示，AI 生成默认 `draft`。前台只展示 `approved`。 |
| **新增字段** `exercises.gen_metadata` | 出题溯源 | `json`，AI 生成题必填；记录 `trace_id`、模型、Prompt 版本、检索片段来源、生成参数与自检结果，供审核和复现。 |
| **新增字段** `ai_chat_sessions.current_run_id` | 状态机线程 | `char(36)`，可空且建唯一索引；当前学习运行的 UUID，即 LangGraph 的 `thread_id`。重新开始学习该小节时换发新值，旧 checkpoint 沉淀为历史（见 3.1.2）。**只定位线程，不承担并发控制。** |
| **新增字段** `ai_chat_sessions.state_version` | 状态机并发 | `int`，默认 `0`；每次成功推进 +1。推进接口以 `WHERE current_run_id = ? AND state_version = ?` 条件更新，命中 0 行返回 409。这是"两个标签页同时推进只前进一步"的落库依据（见 3.1.2）。 |
| **新增字段** `ai_chat_sessions.graph_version` | 图版本治理 | `varchar(32)`，引导式学习运行启动时固定；恢复 checkpoint 前按版本选择兼容图、迁移或 `restart_required`，不得静默套用不兼容的新图。 |
| **新增字段** `answer.version` | 提交并发/复核版本 | `int`，默认 `0`；每次成功提交原子 `+1`。创建复核单时复制为 `ai_grading_reviews.answer_version`，应用复核结果前再次比较，避免旧提交的结论覆盖新状态。 |
| **新增表** `learning_run_effects` | 图副作用幂等/补偿 | `id, run_id, node_name, effect_type, effect_key, payload json, status(pending/applied/failed), error_code, created_at, applied_at`；`effect_key` 唯一，索引 `(status, created_at)`。业务副作用与 effect 状态在同一个 Prisma 事务内完成；对账脚本处理 checkpoint 与业务结果不一致。 |
| **新增表** `ai_grading_reviews` | 评分复核 | `id, trace_id, user_id, exercise_id, submission_type, code_submission_id(可空), submission_fingerprint, answer_version, submitted_answer, hint_level_used, exercise_snapshot json, trigger_reason, ai_score, rule_score, status(pending/reviewed/stale), reviewer_id, reviewed_result, appeal_reason, created_at, reviewed_at`；统一承载代码题与非代码题的低置信度复核和申诉记录。唯一约束 `(user_id, exercise_id, submission_fingerprint, trigger_reason)`，索引 `(status, created_at)`；应用结论前比较 `answer_version`，旧快照只留审计、不覆盖新提交形成的状态。 |
| **新增表** `ai_call_logs`（P0） | 任务追踪 | `id, trace_id, graph_run_id, parent_call_id, scene, node, model, prompt_version, prompt_tokens, completion_tokens, estimated_cost, latency_ms, retry_count, fallback_type, status, error_code, metadata, created_at`；不默认保存原始 Prompt；索引 `trace_id` 与 `(scene, created_at)`。 |
| **新增表** `ai_feedback_events`（P1） | 在线效果 | `id, trace_id, user_id, scene, event_type(accepted/rejected/edited/clicked/helpful/appealed/reviewed), target_type, target_id, metadata, created_at`；用于计算采用率、点击率、申诉率等业务指标。 |
| **新增表（由部署脚本创建）** LangGraph checkpoint 系列表 | 图状态持久化 | 表结构由 `@langchain/langgraph-checkpoint-postgres` 的 `PostgresSaver.setup()` 定义，**不纳入 Prisma schema**，不手工建模。**`setup()` 由独立部署脚本执行一次，不在应用实例启动时调用**（见下方运维口径）。保留窗口与清理策略见阶段 6。 |

> `exercises.review_status` 的默认值需与**前置项 A**（稳定 ID 增量更新）配套：在全删重建的旧实现下，任何默认值都会出错——默认 `draft` 会让已审通过的题在管理员编辑小节后从前台消失，默认 `approved` 会让 AI 草稿被静默发布。必须先完成前置项 A，`review_status` 才有意义。

> **为什么 `ai_grading_reviews` 存快照而不是外键**：`answer` 表是 `@@unique([user_id, exercise_id])`（`schema.prisma:178`），每次提交都会覆盖 `answer` / `feedback` / `score`（`exercise.service.ts:245-254`），**非代码题不存在可引用的历史提交记录**；只有 `code_submissions` 是按次不可变的（带 `submission_no`）。因此复核单必须在创建时保存提交快照，并以 `submission_fingerprint` 去重。`answer_version` 用于阻止旧复核覆盖新提交；代码题另用 `code_submission_id` 关联不可变记录。
>
> 备选方案是新建不可变的 `exercise_submissions` 尝试记录表，但那要改动提交主路径与 `users.score` 聚合口径，代价明显超出复核功能本身的需要；如果将来要做提交历史面板（见第 8 节）再一并立项。

> **LangGraph checkpoint 表的运维口径**（plan.4 补充，plan.5 细化）：这几张表不在 `prisma/migrations/` 里，因此**备份、迁移、回滚脚本必须单独覆盖**。阶段 0C 的迁移演练需把它们纳入导出范围；回滚业务库时若不同步回滚 checkpoint，进行中的学习会话会指向已不存在的题目/进度。
>
> - **`setup()` 作为独立部署步骤执行一次**（`backend/scripts/setup-checkpointer.ts`），**不写在应用启动路径里**——多实例部署时并发建表会相互冲突，且它是 DDL 操作。
> - 应用账号是非超级用户的业务 Schema owner，可执行 Prisma migration 与 `PostgresSaver.setup()` 所需的业务库 DDL，但没有集群级超级权限；`CREATE EXTENSION vector` 与恢复操作使用独立管理员账号。
> - `@langchain/langgraph-checkpoint-postgres` 升级时，先在演练库跑一次 `setup()` 确认其迁移行为，再上生产；版本号在 `package.json` 中锁定，不用 `^` 范围。
> - 阶段 6 的清理脚本**只删除已确认完成且超出保留期的线程**，进行中的会话不受影响（见阶段 6 完成标准）。

### 4.1 pgvector 与 Prisma 接入要点

- 数据库启用扩展：在**自定义 migration** 中执行 `CREATE EXTENSION IF NOT EXISTS vector;`（需自有实例的相应权限，见 3.2.1）。
- Prisma：`embedding` 列用 `Unsupported("vector(N)")`，向量索引（HNSW/IVFFlat）同样写在自定义 migration 的原始 SQL 里。
  - 📌 **不要开 `postgresqlExtensions` 预览特性、也不要写 `datasource extensions = [vector]`**（plan.3 此处写法已过时）：该预览特性已不在 Prisma 官方 preview features 列表中，现行文档给出的路径就是上面这条"自定义 migration + `Unsupported`"。项目使用 `prisma@6.19.3`。
- 相似度查询用 **原始 SQL**（`prisma.$queryRaw`，`embedding <=> $1` 余弦/内积），Prisma 类型层不直接支持向量算子。
  - ⚠️ 参数不能直接传 JS 数组：需拼成 `'[0.1,0.2,...]'` 字符串并**显式转型**（`$1::vector`），否则 Postgres 无法推断类型。
- 迁移放在 `backend/prisma/migrations/` 下，延续现有命名（时间戳_描述）。当前仅有 3 个迁移，最新为 `20260611120000_add_ai_chat_messages_and_code_submissions`。

---

## 5. 阶段划分与执行计划

> 里程碑制，每阶段含 **目标 / 范围 / 关键改动 / 完成标准 / 风险**。完成标准均为可验证项。
>
> 阶段编号相对 plan.2 已重排为 **0～6**：原「阶段 3 判分-提示-复盘子图」拆为**阶段 3（评分能力增强，无 LangGraph）**与**阶段 4（学习状态机）**；原阶段 4、5 顺延为阶段 5、6。

### 5.0 阶段 0A 的三项阻塞前置

这三项不是 AI 功能，而是 V2.0 的地基。它们全部位于阶段 0A，**未完成前不得开始阶段 1 及之后的工作**。

> 编号保留 A / C / D，与全文引用一致。plan.3 的**前置项 B（新增 `requireAdmin`）已撤销**——该中间件早已存在并挂载（见 1.1、3.6），只留一条权限回归用例在 5.2。

| # | 前置项 | 落点 | 阻塞对象 |
| --- | --- | --- | --- |
| **A** | **题目改为稳定 ID 增量更新 + 事务化 + ID 解析加固**（plan.5 扩容，四个子项见 5.0.1） | `services/course-manage/lesson-manage.ts` 的 `createLesson` / `updateLesson`；`utils/idTransform.ts` 调用点；前端小节表单 | 阶段 1 向量索引 `source_id`、阶段 2 审核态与 `gen_metadata`、阶段 5 错题历史 |
| **C** | **补 `knowledge` / `analysis` / `source` 写入链路**：后端落库补这三个字段（手工录入 `source='static'`），前端小节表单与阶段 2 的题目管理页补对应输入项 | `lesson-manage.ts` 的 create/update、lessons-manage 页面题目编辑区 | 阶段 1 题目向量索引、阶段 2 按知识点出题 |
| **D** | **定义 `mastery_level` 的计算规则与事件矩阵**（plan.5 收窄）：定义取值区间、与 `answer.score` / `hint_level_used` 的换算关系，实现为**不依赖数据库的纯函数**并由 vitest 覆盖；事件矩阵写入 3.4.2。**本阶段不接入实际写入**——写入在阶段 3 与复核闭环一起上线，避免在复核链路建成前就产生无法追溯的掌握度变更。 | `services/courses/learning-progress.service.ts`（纯函数部分）、3.4.2 | 阶段 3 掌握度写入、阶段 4 `REVIEW` 节点、阶段 5 薄弱点检索 |

**前置项完成标准：**

- A：连续两次保存同一小节，题目 ID 不变；`answer` / `code_submissions` 关联不断；删除某题后其余题目 ID 不受影响；**构造一道非法题目让写入失败，整次保存回滚，小节与其余题目均保持原状**（事务化，由 5.2 的集成测试 ①覆盖，非手工验收）；新建小节时某道题写入失败，整个小节不落库；伪造一个属于别的小节的题目 ID 提交，返回错误而非改写该题。
- C：新建与编辑题目后，三个字段在数据库中为预期值而非 `null`。
- D：掌握度换算纯函数有 vitest 覆盖，事件矩阵已写入 3.4.2；**本阶段数据库中的 `mastery_level` 仍保持现状不被写入**（写入在阶段 3 验收）。

#### 5.0.1 前置项 A 的四个子项（plan.5 展开）

**A1 — 增量 diff 取代全删重建。** 现实现（`lesson-manage.ts:285-320`）先 `updateMany({is_delete:1})` 软删该小节全部题目、再逐条 `create` 新 UUID。改为按 ID diff：能解析到**且归属于当前小节**的走 `update`，其余走 `create`，本次请求未出现的走软删。

- ⚠️ **不能用"有没有 ID"来区分 create/update**：前端 `utils/exerciseHelpers.ts` 的 `createEmptyExercise()` 给每道**新**题都发了 `exercise_<时间戳>_<随机>` 形式的客户端 ID，`LessonModel.tsx` 的 `normalizeExercise()` 又对已有题目回填后端返回的 ID——请求体里**每道题都有 ID**，只是分属两套命名空间。判定依据必须是"该 ID 能解析到一条 `is_delete=0` 且 `lesson_id` 等于当前小节的题目"，而不是 ID 是否存在。

**A2 — 管理接口内部改用完整 UUID。** 现在 `lesson-manage.ts:90/191/309/328` 全部返回 `uuidToShortId(ex.id)`，即 5 位十六进制短 ID。而 `utils/idTransform.ts` 的 `resolveShortId` 是 `... REPLACE(id,'-','') LIKE $1||'%'||$2 ORDER BY created_at ASC LIMIT 1`，**碰撞时静默返回创建最早的那条记录**（见 8.2，约 1200 条即达 50% 碰撞概率）。把"稳定 ID 增量更新"建在这上面，等于题目量一涨就变成数据串改风险。

- 管理接口的题目对象**直接返回并接收完整 UUID**（或新增不展示给用户的 `internalId` 字段），前端表单原样回传。
- **URL 与前台路由继续用短 ID，不动**——这不是 8.2 的短 ID 方案重构，只是让管理写入路径绕开短 ID 解析。
- 更新题目时**必须同时校验 `exercise.lesson_id === 当前 lesson.id`**，不允许仅凭 ID 匹配就写入。

**A3 — 修正 `updateLesson` 的 `:id` 解析顺序（plan.5 新增，既有缺陷）。** `lesson-manage.ts:240-253` 收到 `PUT /admin/lessons/:id` 后**先**拿 `id` 去 `exercises` 表解析，命中就用该题的 `lesson_id`，查不到才回退查 `lessons`。也就是说一个小节短 ID 只要撞上任意一条题目的短 ID，这次编辑就会**静默落到另一个小节**上。这是现存代码的缺陷、不需要等 V2.0 才触发，随 A2 一并修：`:id` 只按 `lessons` 解析，题目级操作走阶段 2 的独立题目路由。

**A4 — `createLesson` 与 `updateLesson` 一并事务化。** 两处是同一个吞异常写法——`createLesson` 在 `:199-201`、`updateLesson` 在 `:317-319`，都是 `try/catch` 只 `console.error` 后继续循环。plan.4 只点名 `updateLesson`，会留下"新建小节仍可能产生有小节、缺部分题目的半成品"。两个函数都把小节写入与题目写入包进单个 `prisma.$transaction`，任一题失败整体回滚，并把失败原因返回给管理员而不是只打日志。

### 阶段 0 — 技术底座与阻塞前置

> plan.3 的阶段 0 同时压了生产库迁移、四项前置、pgvector、LangGraph、zod、日志、vitest 与 150 条评测样本，范围过重且风险类型混杂。plan.4 拆成 **0A / 0B / 0C** 三段，各自独立验收：**0A 与 0B 可并行**；**0C 不阻塞开发，只阻塞发布**（本地开发用与生产一致的固定 pgvector 镜像推进 0B 与阶段 1）。

#### 阶段 0A — 数据完整性与权限核对

- **目标：** 清掉三项阻塞前置并确认权限现状；数据完整性改动不新增后端依赖。同期工作区的 Radix UI 改造按独立前端变更管理，不计入 0A 依赖。
- **当前进度（2026-07-28）：** A/C/D 的代码实现、掌握度纯函数、题目事务集成测试与三身份权限回归已纳入统一 vitest；测试夹具使用唯一临时数据库并执行 `prisma migrate deploy`，同时验证迁移链，测试后自动删除。阶段 0A 标记为完成。
- **范围：**
  - **完成 5.0 的三项前置 A / C / D**（A 含 5.0.1 的四个子项 A1–A4；D 只做规则与纯函数，不接入写入）。
  - **权限回归核对**（不是开发任务）：以未登录 / 普通用户 / 管理员三种身份分别调用四组 `*-manage` 接口，确认 401 / 403 / 200，把结果记入验收清单。
- **关键改动：** `services/course-manage/lesson-manage.ts`（`createLesson` / `updateLesson` / `:id` 解析）、`services/courses/learning-progress.service.ts`（纯函数）、前端 lessons-manage 小节表单（回传题目 ID + 三个字段输入项）。
- **完成标准：** 5.0 三项前置的完成标准全部通过；权限三态回归通过。
  - ⚠️ **测试顺序**：A 的事务回滚验收由 5.2 集成测试 ① 承担，而 vitest 与测试数据库在 0B 引入。允许 0A 先用手工构造非法题目验证、待 0B 就绪后补跑集成测试；**但 0A 不得在集成测试 ① 通过前被标记为完成**。这是 0A 与 0B 之间唯一的单向依赖点（见第 6 节）。
- **风险：** 前置项 A 改动触及现有小节编辑主流程 → 配套具名手工回归清单，先于任何索引工作落地。

#### 阶段 0B — AI 基础设施与本地验证

- **当前状态（2026-07-30）：已完成。** 本地迁移、向量查询、checkpointer 幂等初始化、跨进程恢复、Schema/切片/分批/trace_id 测试和完整后端门禁均通过；SiliconFlow Embedding 与 DeepSeek 结构化输出真实端点已补验。
- **目标：** 在本地打通 pgvector 与 LangGraph checkpointer 的最小可运行环境，并落地 P0 依赖。
- **范围：**
  - `docker-compose.dev.yml` 的 postgres 镜像换为 `pgvector/pgvector:0.8.2-pg16-bookworm`（原镜像不含该扩展）。
  - 数据库启用 `vector` 扩展；新增 `knowledge_chunks`、带 `index_generation` 的 `knowledge_index_state`、`learning_run_effects` 表及必要约束/索引；`ai_chat_sessions` 加 `current_run_id`、`state_version` 与 `graph_version`；`answer.version` 和 `ai_grading_reviews` 的完整迁移随阶段 3 启用。
  - **新增 `backend/scripts/setup-checkpointer.ts`**：独立执行 `PostgresSaver.setup()`，不挂在应用启动路径上（理由见第 4 节末）。
  - 后端新增依赖 `@langchain/langgraph`、`@langchain/langgraph-checkpoint-postgres`；确认 `OpenAIEmbeddings` 可用，显式配置 batch size，并做真实端点冒烟确认。
  - `config/ai.ts` 扩展 embedding 配置（`AI_EMBEDDING_MODEL`、`AI_EMBEDDING_BATCH_SIZE` 等）。
  - 新建 `services/rag/` 骨架（embedding client、基于 `RecursiveCharacterTextSplitter` 的切片封装、检索接口签名，先空实现 + 单元测试）。
  - **按 3.8 引入 P0 依赖**：zod、`@langchain/textsplitters`、pino + pino-http、`AsyncLocalStorage` 请求上下文（`middleware/request-context.ts`）。
  - **用 zod 重写 `extractJsonObject` 的调用点**：`code-review` / `choice-explanation` 改为 `withStructuredOutput(zodSchema)`，为阶段 2、3 的 Schema 门槛打底。
  - **扩展 0A 已建立的 vitest 基础设施**（见 5.2）：沿用已并入 `pnpm run check` 的测试脚本和唯一临时 PostgreSQL 夹具，新增本阶段纯函数测试与后续向量索引换代集成测试。
  - 建立 `backend/evals/` 的**数据格式与统一执行脚本**，每个场景先备 **20 条**冒烟样本跑通链路并记录 V1 基线。**完整评测集不在本阶段堆齐**——答疑、出题、判分的样本量按 5.1 的门槛，各自在对应阶段验收前补到位（阶段 1 / 2 / 3）。
- **关键改动：** `backend/package.json`、`backend/prisma/schema.prisma`、新迁移、`config/ai.ts`、`services/rag/*`、`middleware/request-context.ts`、`docker-compose.dev.yml`、`backend/evals/**`。
- **完成标准：**
  - `pnpm run build` 与 `pnpm run test` 通过；一段测试文本能成功写入 `knowledge_chunks` 并用原始 SQL 查回 top-k（含 `$1::vector` 显式转型）。
  - 现有两处 AI 结构化输出（代码评阅、选择题解释）改用 zod schema 后行为不变，且非法输出能被 schema 拦下而非静默通过。
  - 任一请求的 `trace_id` 能在不修改函数签名的前提下，被 service 深层的日志读到（`AsyncLocalStorage` 验证）。
  - `setup-checkpointer.ts` 独立跑通并建出 checkpoint 表；**重复执行一次不报错、不破坏已有数据**（部署脚本的幂等性）。
  - LangGraph 一个"hello world" 图能在本地跑通，**并验证 `PostgresSaver` 可跨进程恢复状态**（起进程 A 执行到中途、退出，进程 B 用同一 `thread_id` 续跑）；关键步骤显式使用同步持久化配置。
  - 5.2 的 2 个集成测试可在临时数据库上重复运行，`pnpm run test` 一条命令跑完纯函数与集成两部分。
  - Embeddings 配置已显式设置 `batchSize=10`，11 条输入由本地分批逻辑拆分；SiliconFlow 4B/1024 维真实文档与查询向量调用成功。
  - 评测脚本能固定模型、Prompt、数据集版本运行，输出逐条结果与聚合指标；此阶段只建立基线，不为追求目标值修改样本。
- **风险：** 向量维度与所选 embedding 模型不一致 → 在配置层固定维度并在迁移注释标明。

#### 阶段 0C — 生产库迁移与回滚演练

- **目标：** 把生产数据从内网实例迁到应用服务器同机的 Compose PostgreSQL，启用 pgvector，并建立可执行的恢复、回滚和日常备份路径。
- **当前进度（2026-07-27）：**
  - 原始归档保留不变：`codestory_backup/codestory_db_20260722.dump`、`codestory_backup/codestory_uploads_20260722.tar.gz`。
  - 隔离迁移库已恢复并核对：8 users、23 courses、39 lessons、68 exercises、45 answers；3 条 `_prisma_migrations` 均完成且与仓库一致，pgvector 0.8.2 可用。
  - 数据库原有 20 条媒体引用。新 OSS 已保存并逐对象哈希校验 28 个对象；旧 OSS 中 5 个测试数据对象在迁移前已不存在且未启用版本控制，对应图片字段已事务置空；剩余 15 条引用统一为 `/uploads/...`。
  - 已生成 `codestory_backup/codestory_db_migrated_20260727.dump`，SHA-256 为 `69E2517415782F70935D1D5C12C64A70217FC92A240ED5B5F402FE014780628B`，并已从该文件恢复到临时数据库完成行数、迁移记录、媒体地址和扩展复核。
  - 最终迁移 dump 已恢复到本地独立命名卷 `codestory_dev_postgres_data`；开发卷与未来生产卷分名，当前库核对为 8 users、23 courses、39 lessons、3 条完成迁移及 pgvector 0.8.2。
  - 本地开发栈已验证：PostgreSQL 健康、Redis 已连接，前端 `http://localhost:3001`、后端 `http://localhost:4001`、首页课程/统计 API、CORS 和一张由旧 OSS 迁入的历史图片均返回 200。
  - 已清理 `oss-transfer/`、隔离迁移卷、容器内临时 dump 及被新开发卷替代的旧 CodeStory PostgreSQL/Redis 卷；原始归档、最终 dump、环境存档和 URL 回滚记录保留。
  - 自有 OSS 保持 private；新增后端 `/uploads` 代理，新上传也只向数据库返回相对路径，不再保存可公开直连的 OSS URL。
  - 生产 Compose、环境示例、数据库账号初始化和部署文档已按本节更新；**目标服务器上的导入、业务回归与正式切换按当前决定延期，尚未进行。本地完成不等于 0C 完成。**
  - 取回的生产 `.env` 只作受控存档，不得继续留在会被本机 Compose 默认读取的仓库根目录。
- **前提：** 原内网库自 2026-07-22 导出后不再接受写入，因此该 dump 是迁移最终态。若发现导出后仍有新数据，导入前必须重做全量导出，不能把旧 dump 当最终态。
- **已定拓扑与版本：**
  - 生产数据库进入 `docker-compose.yml`，固定镜像 `pgvector/pgvector:0.8.2-pg16-bookworm`，不写 `ports`。
  - 选择 PG16 是为了与源库、归档工具和开发环境保持一致，不是因为 1.15 归档格式强制目标服务器必须为 PG16；以后可单独评估升级 17/18。
  - 数据使用预创建的外部卷 `codestory_postgres_data`；`docker compose down -v` 不负责删除该卷，但定期备份仍是唯一灾难恢复依据。
  - PostgreSQL/Redis 只接入内部数据网络；backend 同时接入数据网络和边缘网络；nginx/frontend 无权直连数据库。
  - `POSTGRES_USER` 是初始化、扩展、恢复用超级用户；`POSTGRES_APP_USER` 是业务 Schema owner，非超级用户，供 Prisma migration、checkpointer setup 和应用运行使用。
- **导入与切换步骤：**
  1. 校验 `codestory_db_migrated_20260727.dump` 的大小/校验和，并用 PG16 或更高版本的 `pg_restore --list` 检查目录；目标数据库必须是未写入业务对象的新空库。
  2. 预创建外部卷，只启动 postgres/redis；确认应用账号初始化成功。
  3. 管理员执行 `CREATE EXTENSION IF NOT EXISTS vector`，从镜像层和数据库层同时验证 pgvector 可用。
  4. 用管理员连接、`--role="$POSTGRES_APP_USER" --no-owner --no-acl --exit-on-error --single-transaction` 原子恢复。旧 owner `codezoo` 与旧 ACL 不迁入；需要的权限按新账号模型显式重建。
  5. 对账 `_prisma_migrations` 的目录名、checksum、`finished_at`、`rolled_back_at` 与实际 Schema，再运行 `prisma migrate status`。只有完全一致时才执行 `prisma migrate deploy`；不得为消除报错而盲目使用 `migrate resolve`。
  6. 自有 OSS 保持 private，后端通过 `/uploads/...` 代理读取；同时恢复 `backend/uploads/` 归档作为兼容回退与额外副本。不得把 AccessKey 返回给浏览器。
  7. 按浏览器实际 origin 配置两个 `NEXT_PUBLIC_*` 并重建 frontend。直接对公网时默认 `80:80`；宿主 nginx/Caddy 反代时使用 `127.0.0.1:18080`。
  8. 在开放入口前核对关键表行数、序列、迁移状态、扩展版本和历史图片，并回归登录、课程浏览、选择题/代码题与 AI 降级路径。
  9. 轮换原内网库和取回 `.env` 中的旧凭据；新管理员密码与应用密码必须不同。
- **日常备份与恢复责任：**
  - 每日至少一次全库 custom dump 与 uploads 归档；全库 dump 自然包含未来的 LangGraph checkpoint 表。
  - 本机至少保留 7 份日备份、4 份周备份；至少一份加密后复制到服务器之外。
  - 每月在隔离库做一次真实恢复演练并记录耗时。初始生产 RPO 定为 24 小时，RTO 以第一次演练实测值为基线。
- **关键改动：** `docker-compose.yml`、`docker-compose.dev.yml`、`docker/postgres/init-app-user.sh`、`.env.production.example`、`docs/DEPLOY_DOCKER.md`、备份/恢复脚本、阶段 0B 的 `scripts/setup-checkpointer.ts`。
- **完成标准：**
  - 固定 pgvector 镜像、外部卷、网络隔离、健康检查和管理员/应用账号分离均已在目标服务器验证。
  - 迁移前后关键表行数一致，迁移记录与 Schema 对账无漂移，序列下一次写入正常。
  - 历史 `/uploads/...` 文件可访问；登录、刷新 Token、课程浏览、选择题、代码题和 AI 降级主流程通过。
  - 切换前完成一次从 dump 恢复到隔离库的演练；日常备份已调度且存在一份异地副本。
  - 原库连接凭据已轮换失效，生产入口只在全部验证通过后开放。
- **回滚口径：** `codestory_db_migrated_20260727.dump` 只在新库产生首批业务写入前是完整回滚点；原始 `codestory_db_20260722.dump` 仅用于审计和重做迁移。验证期间保持 nginx/backend 停止；一旦开放并产生新数据，直接回到迁移 dump 会丢失切换后的提交，必须改用新库备份恢复。
- **风险：** 导入不完整、ACL/owner 错误、迁移历史漂移、序列错位或归档文件缺失 → 使用空库原子恢复，失败即废弃该次恢复结果；完成数据库断言与主流程回归后才开放公网入口。
- ⚠️ **`codestory_backup/` 含生产数据与凭据，已加入 `.gitignore`，任何情况下不得提交或外发。**

### 阶段 1 — RAG 检索层 + 对话答疑 grounding

- **目标：** 建成可复用检索层，并把它接入现有小节对话的上下文组装。
- **范围：**
  - 实现小节/题目的切片与 `indexSource()`；在小节/题目落库处挂同步 upsert。切片直接用 `RecursiveCharacterTextSplitter`（配置分隔符与 overlap），**不自造切片器**；小节正文先用 `html-to-text` 转纯文本，替代现有的正则 `htmlToPlainText`。
  - 实现 `retrieve(query, {userId, courseId, lessonId, purpose})`，返回带来源与相关度的片段。学生场景由服务端强制校验课程访问权；阶段 1 只允许同课程有效小节和非 AI 静态题，阶段 2 再切换为 `approved` 题；管理场景使用独立 `purpose` 策略。
  - 在 `lesson-context.service.ts` / `lesson-chat.service.ts` 的上下文组装处，用检索片段**替换/补充**"整段正文"注入（保留降级回退）。
  - 全量重建脚本 `scripts/reindex-knowledge.ts`；同时交付最小补偿脚本 `scripts/repair-knowledge-index.ts`，扫描超时 `pending` / `failed`，按当前源数据重新发起索引并丢弃过期 generation。阶段 6 只完善调度、告警和报表，不再推迟基本恢复能力。
- **关键改动：** `services/rag/*`、`services/ai/lesson-context.service.ts`（上下文装配层）、`services/course-manage/lesson-manage.ts`（索引挂载点）、新脚本。
  - 📌 `lesson-chat.service.ts` **只在 prompt 模板中新增一个证据槽位**，`streamLessonChat` 的流程逻辑不动 —— 与 2.4「自由对话链路保持不动」一致。plan.2 把它列为改动文件与该约束冲突，已修正。
  - 📌 plan.2 列的 `services/courses/exercise.service.ts` 已移除，它不是题目落库处（见 3.2）。
- **完成标准：**
  - 对同一问题，检索命中片段被注入 Prompt（日志可见来源片段）。
  - 关闭 embedding（模拟失败）时对话仍正常回复（降级验证）。
  - 跨小节提问能召回**同一门有效课程内**其它有效小节的相关片段；另一课程、AI 来源题和软删除内容均无法由学生接口召回。阶段 2 增加审核态后再覆盖 `draft/rejected`。
  - 编辑并保存小节后，该小节的向量索引被增量更新，且**题目索引的 `source_id` 保持不变**（依赖前置项 A）。
  - 管理员能在小节列表看到持久化索引状态；单小节重试和限定课程/章节范围的批量同步可恢复失败状态。课程/章节标题变化会重建后代索引，软删除会失效后代索引。
  - **5.2 集成测试 ② 通过**：同一个源连续索引两次，库中始终只有一代 chunk；改写源内容后重新索引，检索**召回不到旧内容**；换代事务中途失败时旧 chunk 完整保留、`knowledge_index_state` 停在 `pending` 且能被补偿脚本捡回；两个索引任务乱序完成时，旧 generation 不能覆盖新内容。
  - 初始答疑集上 `Recall@5 ≥ 0.85`、回答证据支持准确率 `≥ 0.90`；未达标时不得把 RAG 接入答疑主路径。
- **风险：** 切片粒度影响召回质量 → 先用"标题+段落"策略，阶段 6 再依据验收调参。

### 阶段 2 — AI 出题生成 + 题目管理页 ⭐补齐 P0

- **目标：** 管理员可基于知识点让 AI 生成题目草稿，在独立的题目管理页中审核后入库。
- **范围：**
  - **出题链（LCEL，非图）**：`检索(RAG) → 生成候选 → 自检（格式/答案存在性/难度）与去重（对已有题目向量比对） → 结构化产出`。用 `RunnableSequence` 组装；结构化产出用 **`withStructuredOutput(zodSchema)`**（见 3.8），schema 即验收门槛的执行形式，解析失败允许一次修复重试。
  - **题型收敛为 `single_choice` 与 `code`** —— 平台目前只有这两类能判分（`submitExercise`）。plan.2 写的 `choice/judge/fill/code` 中，`fill` 与 `judge` 生成出来平台判不了分，移入第 8 节后续方向。
  - 出题结果落 `exercises`，`source='ai'`、`review_status='draft'`，写 `gen_metadata`。
  - 新增题目管理后端路由（出题、列表、审核态流转）。现有 `routes/exercises.ts` 是学习端接口，**不复用**；新增管理路由按 3.6 挂 `[authMiddleware, requireAdmin]`（中间件已存在，直接用）。
  - **基础限流前移到本阶段**（plan.3 原放在阶段 6）：出题接口是本计划第一个"一次点击 = 多次模型调用"的高成本入口，必须在开放前就有限流，不能等到收尾。用 `express-rate-limit` + `rate-limit-redis` 复用现有 Redis（见 3.8），阶段 6 只做扩面与告警。
  - 前台查询过滤 `review_status='approved'`（改 `services/courses/lesson.service.ts` 与 `exercise.service.ts` 的查询条件）。
  - **建成 `exercises-manage` 独立管理页**（详见 5.3）。
- **关键改动：** `services/ai/exercise-gen/*`（新）、`services/course-manage/exercise-manage.ts`（新）、`routes/exercise-manage.ts`（新）、`services/courses/exercise.service.ts` 与 `lesson.service.ts` 的查询条件、`frontend/src/app/(admin)/exercises-manage/**`。
- **完成标准：**
  - 管理员选定小节/知识点 → 返回 ≥1 道结构化候选题（含题干/选项/答案/解析）。
  - 生成题默认不在前台展示；审核"采用"后才对学习端可见。
  - AI 失败时给出明确错误且不产生脏数据（无半截草稿）。
  - 采用一道题后再编辑其所属小节，该题的 `review_status` 与 `gen_metadata` 不丢失（依赖前置项 A）。
  - 以普通用户 Token 调用出题与审核接口返回 403，未登录返回 401，管理员正常。
  - 出题接口限流生效：超过阈值返回可读错误而非继续消耗额度。
  - 在 50 道固定分层候选题上统计（5 个场景各 10 道，并覆盖全部题型、难度与主题；口径见 5.1）：**首次结构化成功率 `≥ 90%`、修复后成功率 `≥ 99%`、最终任务失败率 `≤ 1%`、每道有效候选平均模型调用次数 `≤ 1.3`**；人工复核答案正确率 `≥ 95%`；与现有题目重复率 `≤ 5%`；管理员采用率作为在线指标持续记录。
  - 📌 **不再把线上生成结果的"Schema 通过率 100%"作为单一指标**（plan.6）：在"解析失败允许一次修复重试"的前提下，只统计最终返回的候选题会天然全过。线上链路必须按上面四项分开统计；固定构造数据的 Schema 校验测试仍要求 100% 通过。
  - **重复率的判定规则**：以 `knowledge_chunks` 中同小节题目的 embedding 余弦相似度 `≥ 0.92` 为机器初筛阈值，初筛命中的候选由管理员人工确认是否构成重复；报告同时给出机器初筛数与人工确认数，不只报最终值。
- **风险：** 生成题答案不可靠 → 强制"人工审核后才 `approved`"，AI 仅作参考（与开发文档定义一致）。

#### 5.3 `exercises-manage` 独立题目管理页

按项目既有约定（对齐 `courses-manage` / `chapters-manage` / `lessons-manage` / `users-manage` 的页面模式），把当前的占位页建成正式的题目管理页：

- **题目列表**：按课程 / 章节 / 小节 / 题型 / 难度 / `source` / `review_status` 筛选，分页。
- **AI 生成**：选定小节与知识点 → 调用出题接口 → 候选题预览。
- **审核流**：采用 / 编辑后采用 / 拒绝，状态落 `exercises.review_status`；溯源面板展示 `gen_metadata`（模型、Prompt 版本、检索来源片段、自检结果）。
- **待审队列视图**：跨小节汇总 `review_status='draft'` 的题目与等待时长（与 3.6「人工复核积压」呼应）。
- **手工录入题目的增删改**：补齐 `knowledge` / `analysis` / `source` 输入项（与前置项 C 同源）。
- 沿用现有 Neo-Brutalism 组件与后台页面布局，不新造视觉语言。

lessons-manage 小节表单内的题目编辑区**保留现状**，仅按前置项 A、C 调整落库方式与字段。

### 阶段 3 — 评分复核闭环与掌握度落地（无 LangGraph）

- **目标：** 建立低置信度评分的人工复核闭环，并让 `mastery_level` 真正被写入。本阶段是纯 service 层工作，同时服务普通做题路径与阶段 4 的状态机。
- **范围：**
  - **低置信度检测、`ai_grading_reviews` 复核队列（含提交快照、`submission_fingerprint`、`answer_version`）、管理员复核接口与用户申诉入口**；人工结论回写后再更新掌握度。这是本阶段的主体。
  - **按前置项 D 定义的规则与 3.4.2 的事件矩阵，在评分完成后实际更新 `lessons_progress.mastery_level`**——这是掌握度写入的**唯一**上线点（plan.4 曾在前置项 D 与本阶段各写一次"实际写入"，重复且矛盾，plan.5 收敛到此处）。写入必须在复核闭环建成之后，确保任何下调路径都已有人工复核前置。
  - 代码题评阅链改用 LCEL + zod schema 组装为可复用的**评分链**，供普通做题路径与阶段 4 状态机共用（见 3.1.3、3.8）。这是重构而非新能力。
  - 📌 **删除 plan.3 的"非代码题结构化多维评分"**：平台只有两种题型——`code` 已经有多维评分（`functionalScore` / `qualityScore` / `hintDeduction`），`single_choice` 的对错是规则判定、解释已由 `choice-explanation.service` 提供。给一道选择题打"多个维度分"没有可解释的含义，验收也验不出东西。等 `fill` / `judge` 题型落地（见第 8 节）再谈非代码题多维评分。
- **关键改动：** `services/ai/evaluate/*`（新）、`services/courses/exercise.service.ts`、`services/courses/code-grading.service.ts`、`services/courses/learning-progress.service.ts`、`routes/exercises.ts`、新增复核路由。
- **完成标准：**
  - 代码题提交后返回结构化多维评分，字段齐全；选择题按规则判定返回结果与解释，行为与 V1 一致。
  - 在不少于 **30** 条人工标注的**代码题**提交上，AI 与人工"通过/不通过"结论一致率 `≥ 90%`，百分制平均绝对误差 `≤ 10`；规则与 AI 冲突的样本全部进入人工复核，不自动更新为未掌握。
  - 可完整复现"低置信度触发→进入待审→管理员维持/改判→掌握度更新"以及"用户申诉→复核"的状态流转；同一提交重复触发只建一张复核单，重复审核请求不会覆盖已生效结论。
  - **过期复核保护可验证**：提交 A 进入待审后，用户提交 B 并形成更新状态；随后处理 A 时将复核单标记为 `stale` 或仅保存审计结论，不得下调/覆盖 B 形成的当前掌握度。
  - 评分合并逻辑与掌握度换算有 vitest 覆盖（纯函数）；**掌握度变更严格符合 3.4.2 事件矩阵，矩阵外的事件不产生任何写入**。
  - 现有做题主流程手工回归清单逐条通过（清单见验收文档）。
- **风险：** 改动触及现网做题主路径 → 评分链失败时降级到现有静态初判 + AI 评阅路径，与 V1 行为一致。

### 阶段 4 — LangGraph 学习状态机（引导式学习模式）

- **目标：** 以新增模式落地 V1.1 §3.2.1 的跨请求学习状态机，用户中途离开可恢复到原状态。
- **范围：**
  - 用 `StateGraph` 实现 3.1.2 的节点与边；`PostgresSaver` 做 checkpoint，**`thread_id = ai_chat_sessions.current_run_id`**（一次学习运行一个 UUID，重新开始学习换新值，见 3.1.2），关键节点使用同步持久化模式。
  - `QUESTION` 节点**从当前小节 `review_status='approved'` 的题库选题**（不调出题链，见 3.1.2）；`AI_EVALUATE` / `MERGE_RESULT` 节点复用阶段 3 评分链；`HINT` 节点复用 `exercise-hint.service`；`REVIEW` 节点按前置项 D 规则标记未掌握。
  - 推进接口带 `run_id` + `expected_state_version`，服务端条件更新推进，命中 0 行返回 409 并回传当前状态（机制见 3.1.2，字段见第 4 节）。
  - 写 `answer`、提示使用量、复核单、掌握度和业务投影的节点全部通过 `learning_run_effects.effect_key` 幂等执行；提供最小对账脚本，修复 checkpoint 与 effect/业务状态不一致。
  - 节点转移后同步 `ai_chat_sessions.state / hint_level / current_exercise_id` 投影；`hint_level` 按 3.4.1 规则写回 `answer.hint_level_used`。投影失败不伪装成 checkpoint 原子事务，而是留下可补偿的 effect 状态。
  - 启动运行时写入 `graph_version`；发布不兼容图版本前，必须用旧 checkpoint 样本验证所选的兼容、迁移或 `restart_required` 策略。
  - 新增状态机路由（启动 / 推进 / 恢复），流式协议按 3.1.4 扩展 `state` 事件。
  - 前端：小节 AI 面板增加模式切换与状态条（当前处于讲解 / 出题 / 等待作答 / 提示 / 复盘），按 `GET /ai/chat/history` 返回的 `guidedModeAvailable` 控制入口显隐（见 3.1.4，前端读不到后端环境变量）。
  - `AI_GRAPH_ENABLED` 默认关闭。
- **关键改动：** `services/ai/learning-graph/*`（新）、`routes/ai.ts`、`services/ai/lesson-session.service.ts`、`frontend/src/app/api/ai/chat.ts`、`frontend/src/components/lessons/chat/**`、`frontend/src/components/lessons/Chat.tsx`。
- **完成标准：**
  - 完整走通 `INIT→EXPLAIN→QUESTION→WAIT_ANSWER→EVALUATE→未通过→HINT×3→REVIEW→标记未掌握`。
  - **中断恢复可验证**：在 `WAIT_ANSWER` 状态关闭页面 / 重启后端进程，重新进入小节后能恢复到同一节点与同一 `hint_level`，不从头开始。
  - **重学不串档可验证**：完成一次学习后重新开始该小节，`current_run_id` 换新、状态从 `INIT` 起步，不落回上一轮 checkpoint。
  - **并发可验证**：两个标签页同时推进，一个成功、另一个收到 409 并刷新到最新状态，`state_version` 只 +1；同一标签页快速双击同样只前进一步；旧标签页携带已换发的旧 `run_id` 推进返回 409，不影响当前运行。
  - **节点重放可验证**：在业务副作用完成后、checkpoint/响应完成前故障注入并恢复，同一 `effect_key` 不会重复写答案、扣提示、建复核单、改掌握度或加积分；对账脚本可收敛 checkpoint 与业务状态。
  - **图升级可验证**：至少用一个旧 `graph_version` checkpoint 演练恢复；兼容版本正常续跑，不兼容版本明确返回 `restart_required` 或完成迁移，不得静默错跑。
  - 小节题库中 `approved` 题目不足时，`QUESTION` 节点走"暂无可用题目"分支而非报错或即时生成。
  - `AI_GRAPH_ENABLED=false` 时，`guidedModeAvailable` 返回 `false`、前端无模式入口、状态机路由未注册（直接请求返回 404），自由对话与普通做题行为与现网一致（手工回归清单逐条通过）。
  - 前端旧版本客户端收到新增的 `state` 事件不报错（向后兼容验证）。
  - 引导式学习模式的首 Token P95 单独计量并记录基线。
- **风险：**
  - 新链路与前后端协议同时变更 → 开关默认关闭；自由对话链路零改动；NDJSON 新事件向后兼容。
  - checkpoint 与业务投影/副作用不一致 → checkpoint 仍是图状态事实源；`learning_run_effects` 保证业务写入幂等并支持对账补偿，投影只写不反向恢复图状态。

### 阶段 5 — 跨小节知识检索/推荐 + 错题个性化复习

- **目标：** 落地两个 RAG 高级场景。
- **范围：**
  - 跨小节推荐：基于向量相似度，为当前小节/薄弱知识点推荐相关小节或知识片段。
  - 错题个性化复习：结合 `answer`（错误记录/得分）+ `lessons_progress.mastery_level`（依赖前置项 D 已有实际写入），检索薄弱点相关内容，生成复习清单/重练建议。
  - 前端在小节页/个人中心呈现推荐与复习入口（沿用现有 Neo-Brutalism 组件，不新造视觉语言）。
- **关键改动：** `services/rag/*`、`services/courses/learning-progress.service.ts`、新增推荐/复习路由、`frontend/src/components/lessons/**`、个人中心页面。
- **完成标准：**
  - 对一个已产生错题的用户，能给出可点击的相关小节/复习项。
  - 推荐结果可解释（附相关度或来源）。
  - 错题历史在管理员编辑过所属小节后依然可追溯（依赖前置项 A）。
  - 离线标注集上推荐 `Precision@5 ≥ 0.70`；线上记录曝光、点击和复习完成事件，样本量达到 100 次曝光后再报告点击率与完成率，不用小样本百分比作为成效结论。
- **风险：** 冷启动（无学习数据）→ 回退到难度/顺序的基础推荐。

### 阶段 6 — 工程治理、评估与收尾

- **目标：** 为 AI 增强能力补上可观测性、效果评估与运维项，产出可复现的验收结论。
- **范围：**
  - `ai_call_logs` 落地：各 AI 场景记录 trace、节点、token、估算成本、耗时、重试、降级与成功失败。
  - `ai_feedback_events` 落地：记录管理员采用/编辑/拒绝、推荐点击、用户反馈与申诉结果。
  - 完善阶段 1 已交付的索引重建/补偿脚本，增加定时调度、generation 冲突统计与告警；**限流扩面**——阶段 2 已给出题接口落地 `express-rate-limit` + `rate-limit-redis`，本阶段扩到 chat 等其余高成本接口并接上告警。
  - 埋点复用阶段 0B 建立的 `AsyncLocalStorage` 请求上下文与 pino 结构化日志，`ai_call_logs` 只负责落库，不再单独传递 `trace_id`。
  - **LangGraph checkpoint 保留窗口与清理脚本**：定义保留时长（如已完成会话保留 30 天），提供可重复运行的清理脚本，避免 checkpoint 表无限增长。**清理条件是"线程对应的学习运行已确认完成 且 超过保留期"两者同时满足**，只按时间删会误杀长期挂起但仍有效的会话。
  - 建立最小指标看板或可重复运行的 SQL/脚本报告，覆盖质量、可靠性、性能、成本和人工接管情况；设置成功率、异常延迟和预算告警。
  - 运行完整离线回归，冻结本次发布使用的数据集、Prompt、模型与检索参数版本，产出评估报告。
  - Prompt 文案与"无沙箱评阅≠严格判题"表述复核（延续 V1 验收要点）。
  - 产出 `docs/CodeStory_V2.0_验收清单.md`，其中包含各阶段引用的**手工回归清单**（见 5.2）。
- **关键改动：** `services/**` 埋点、`middleware/` 限流、`scripts/*`、`backend/evals/**`、新增验收与评估文档。
- **完成标准：**
  - 任一请求可由 `trace_id` 还原“入口→检索/工具→模型→重试/降级→业务结果→用户反馈”链路；日志中不出现 Token、验证码和完整敏感 Prompt。
  - 关键 AI 场景均有调用日志；限流命中返回可读错误。5 分钟窗口任务成功率低于 `95%`、P95 延迟超过该场景基线两倍或当日成本达到预算 `80%` 时触发告警。
  - Chat 首 Token P95 `≤ 3s`，非流式 AI 任务 P95 `≤ 30s`；引导式学习模式的 P95 **单独计量**，不与自由对话首 Token 混算。若部署网络和模型能力无法满足，必须在验收清单中给出实测基线、原因与经确认的新预算，不得直接删除性能门槛。
  - checkpoint 清理脚本可重复运行，清理后进行中的会话不受影响。
  - `docs/CodeStory_V2.0_评估报告.md` 记录样本规模、指标定义、结果、失败案例与版本信息；第 5.1 节硬门槛全部满足后才允许默认打开 `AI_GRAPH_ENABLED`。
  - 验收清单可逐条手工跑通。
- **风险：** 埋点侵入业务 → 用薄封装（包裹 `createChatModel` 调用处统一记录）。

### 5.1 V2.0 质量门槛与指标口径

以下数值是 V2.0 的初始上线门槛，不等同于已经取得的项目效果。阶段 0B 先用小样本记录 V1 基线，后续报告同时展示“基线、目标、实测值和样本量”，避免只展示最好的一次结果。涉及人工标注的样本由至少一名管理员复核；争议样本保留原始意见，不为提高分数删除。

| 维度 | 指标定义 | V2.0 初始门槛 |
| --- | --- | --- |
| **答疑/RAG** | `Recall@5`；回答中的事实是否能被检索来源支持 | `Recall@5 ≥ 0.85`；证据支持准确率 `≥ 0.90` |
| **AI 判分抽样** | 样本按「正确答案 / 明显错误 / 边界答案」三层分层抽样，每层不少于 10 条 | 见下方「AI 判分」行的一致率与误差门槛 |
| **AI 出题** | 首次结构化成功率；修复后成功率；最终任务失败率；每有效候选平均模型调用次数；答案正确率；与现有题目的重复率；管理员采用率 | `≥ 90%`；`≥ 99%`；`≤ 1%`；`≤ 1.3`；`≥ 95%`；`≤ 5%`；采用率样本满 100 后目标 `≥ 60%` |
| **AI 判分** | 与人工通过结论一致率；百分制平均绝对误差；进入人工复核后的漏自动处理数 | `≥ 90%`；`≤ 10`；`0` |
| **推荐/复习** | 离线 `Precision@5`；线上点击率、复习完成率 | `Precision@5 ≥ 0.70`；线上指标报告样本量与置信区间，不设脱离基线的虚假硬目标 |
| **任务可靠性** | AI 任务完成并返回可用结果的比例；未捕获失败率；降级率 | 成功率 `≥ 95%`；未捕获失败率 `≤ 1%`；降级率持续监控并按错误类型拆分 |
| **状态机可恢复性** | 故障注入样本恢复到正确节点与 `hint_level` 的比例；超过补偿窗口仍未收敛的 checkpoint/effect/投影不一致数 | 固定故障样本恢复正确率 `100%`；超窗不一致数 `0` |
| **性能与成本** | Chat 首 Token P95；引导式学习首 Token P95（单独计量）；非流式任务 P95；每场景单任务平均成本与当日总成本 | `≤ 3s`；阶段 4 实测后设定基线；`≤ 30s`；阶段 0B 设定人民币预算，达到日预算 `80%` 告警、`100%` 限制非必要高成本任务 |
| **人机协同** | AI 题目未审发布数；低置信度评分绕过复核数；申诉处理情况 | 前两项均为 `0`；申诉记录可追溯并统计维持/改判结果 |

**指标分母与标注口径**（plan.6 修订，避免指标可被"挑样本"或派生数据换代钻空子）：

- **`Recall@5`**：标注集不少于 **50 个问题**，覆盖全部已发布小节；每个问题由标注者事先指定 **1–3 个相关来源定位**，记录稳定的 `source_type + source_id + section_key/content_hash`，不记录整源重建后会变化的 `knowledge_chunks.id`，也不事后看检索结果反标。分母是标注集问题总数，分子是 top-5 中至少命中一个指定来源定位的问题数。
- **证据支持准确率**：**分母是回答中提取出的可核查事实陈述条数**（非回答条数），分子是能在本次注入的检索片段中找到出处的条数。无法判定归属的陈述计入分母、不计入分子。
- **出题四项指标的分母**：首次结构化成功率与平均调用次数的分母是**发起的候选题生成次数**（含最终失败的），不是最终返回的候选题数——这是 plan.4 那版指标失真的根因。
- **Schema 合规与线上可靠性分开**：固定构造数据的 Schema 校验测试必须 100% 通过；调用外部模型的修复后成功率与最终失败率按上表 SLO 统计，允许有限的外部服务失败，不再用“100% / 0”制造不可持续的发布门槛。
- **AI 判分一致率**：样本按「正确答案 / 明显错误 / 边界答案（部分正确、能跑但写法差、思路对但有 bug）」三层分层抽样，每层不少于 10 条，报告分层结果而非只报总体一致率。

发布报告除聚合指标外，至少列出 10 个失败案例，按“检索失败、模型幻觉、结构化解析、规则冲突、权限/并发、外部服务”分类。修复后重新运行完整评测集，不只重跑失败样本。

### 5.2 验证手段：vitest 与手工回归清单

后端已在阶段 0A 引入 vitest，并把题目事务、权限三态与掌握度纯函数纳入自动化回归；前端尚未引入测试框架。因此后续“回归无差异”类门槛按下面两条继续落实：

**1. 扩展 vitest 纯函数覆盖（阶段 0B）**

范围严格限定为不依赖数据库与网络的纯函数：

- 评分合并逻辑（`code-grading.service.ts` 的分数计算、`calculateAiReviewedFinalScore`）
- 文本切片（`services/rag/*` 的 chunk 策略）
- 结构化输出 Schema 校验与 `extractJsonObject`（`services/ai/_shared/model.ts`）
- 去重相似度计算
- 上下文裁剪（`lesson-session.service.ts` 的 `getRecentLessonChatMessages` 选择逻辑，需先提取为纯函数）
- **掌握度换算**（前置项 D 的取值区间与由 `answer.score` / `hint_level_used` 到 `mastery_level` 的映射，见 3.4.2）

`test` 脚本已在 0A 并入现有 `pnpm run check` 链路；0B 直接扩充测试文件。

**2. 两个后端集成测试（0A 已搭夹具，阶段 1 扩充用例）**

plan.4 一律排除集成测试，但本计划**自己的验收标准里已经有两条是集成测试**——前置项 A 的"构造一道非法题目让写入失败，整次保存回滚"和阶段 1 的索引换代，它们都无法靠读代码或点页面持续证明：出错时的表现是"静默地少了几条数据"，手工回归很难每次都发现。因此只加**这两个**，沿用 0A 建立的唯一临时 PostgreSQL 夹具，不建完整 E2E 框架：

| # | 测试 | 覆盖的失败模式 | 验收归属 |
| --- | --- | --- | --- |
| **①** | **题目增量更新与事务回滚**：保存两次 ID 不变；删一题不影响其余；构造非法题目使写入失败 → 小节与其余题目全部保持原状；提交一个属于别的小节的题目 ID → 报错且不改写该题 | 半成品小节、题目 ID 漂移、跨小节串改 | 前置项 A / 阶段 0A |
| **②** | **向量索引换代**：同源连续索引两次只留一代 chunk；改写源后旧内容检索不到；换代事务中途失败 → 旧 chunk 完整保留且状态停在 `pending`；两个 generation 乱序完成 → 旧任务不能覆盖新内容；补偿脚本能恢复悬挂任务 | 新旧混召、索引真空、stale writer、`pending` 悬挂 | 阶段 1 |

**其余高风险行为走具名故障注入/手工清单**：审核条件更新、过期复核保护、状态机 409 并发、checkpoint 跨进程恢复、节点副作用重放与旧图版本恢复。计划暂不建立完整 E2E 框架，但这些场景必须记录可复现步骤和数据库断言，不能只观察页面。

**仍然不做**端到端测试、前端测试、以及为覆盖率而写的测试。

**3. 涉及数据库与外部模型的部分，写具名手工回归清单**

不再使用"行为与现网一致"这类不可执行的表述，改为逐条列出「接口 + 输入 + 预期输出」，随各阶段累积到 `docs/CodeStory_V2.0_验收清单.md`。至少覆盖：

- 前置项 A：小节保存前后的题目 ID 与关联数据
- 权限三态：未登录 / 普通用户 / 管理员分别调用各管理接口的状态码（401 / 403 / 200），覆盖现有四组 `*-manage` 与阶段 2 新增的出题、审核接口
- 阶段 1：embedding 失败时的对话降级
- 阶段 3：现有做题主流程（选择题 / 代码题，含提示扣分）
- 阶段 4：`AI_GRAPH_ENABLED=false` 时自由对话与普通做题的完整路径

---

## 6. 依赖关系与并行建议

```text
阶段0A(前置A/C/D+权限核对) ──┐
阶段0B(AI 基础设施·可并行)  ──┴─┬── 阶段1(RAG检索层) ── 阶段2(P0出题) ──┬── 阶段4(学习状态机) ──┐
                                │                                        │                       ├── 阶段6
阶段0C(生产库迁移·只阻塞发布)   └── 阶段3(复核闭环+掌握度) ──────────────┴── 阶段5(推荐/复习) ───┘
```

- **阶段 0A + 0B** 是所有后续开发工作的前置，**不可跳过**。0A、0B 已完成；阶段 1 工程、来源治理与 Qwen3 固定集机器门禁已通过，独立人工复核待补。
- **阶段 0C**（生产库迁移）不阻塞开发——本地用与生产一致的固定 pgvector 镜像即可推进 0B 与阶段 1——但**必须在任何阶段上线前完成**。
- **阶段 1 → 阶段 2**：出题 grounding 依赖阶段 1 的检索层。
- **阶段 3** 只依赖阶段 0A/0B，**可与阶段 1/2 并行**（纯 service 层，不碰检索）。
- **阶段 4** 依赖阶段 2（`review_status` 字段与审核流——状态机只取已审题目）与阶段 3（评分链）。
- **阶段 5** 依赖阶段 1（检索）与阶段 3（掌握度闭环），**可与阶段 4 并行**。
- **阶段 6** 收尾，依赖前序全部。
- 若人力有限，建议优先级顺序：**阶段 0A/0B → 1 → 2（补 P0）→ 3 → 0C（上线前）→ 5 → 4 → 6**。阶段 4 的学习状态机是本计划中价值最高但也最重的一块，若时间不足可整体延后而不影响其余阶段交付 —— 它是新增模式，不改动任何现有链路。

---

## 7. 风险与应对

| 风险类型 | 描述 | 应对 |
| --- | --- | --- |
| **数据库迁移** | 老师的外部库 → 自有服务器 Compose PostgreSQL，导入不完整或凭据残留 | 阶段 0C 内完成并验证（导出已于 2026-07-22 完成、源库此后停写，见 1.2）；原子恢复后做行数、迁移历史和关键表校验；dump 文件即回滚点，回滚窗口截止到新库首批业务写入；切换后轮换原库凭据 |
| **前置项 A 改动** | 题目 ID 稳定化触及现有小节编辑主流程 | 先于任何索引/审核工作落地；配套具名手工回归清单；前端需同步回传题目 ID |
| **状态机新链路** | 前后端协议同时变更，影响现网 | `AI_GRAPH_ENABLED` 默认关闭；自由对话与普通做题链路零改动；NDJSON 新事件向后兼容 |
| **checkpoint 增长** | checkpoint 表随会话累积无限增长 | 定义保留窗口 + 可重复运行的清理脚本（阶段 6） |
| **状态不一致** | checkpoint 与 `ai_chat_sessions` 投影或业务副作用不一致 | checkpoint 是图状态事实源、投影不反向恢复；副作用通过 `learning_run_effects` 幂等执行并由对账脚本补偿 |
| 质量风险 | AI 出题答案不可靠 | 强制人工审核后才 `approved`，AI 仅作参考 |
| 成本风险 | embedding + 生成 + 检索抬高调用成本 | 索引增量 upsert、检索 top-k 限制、`ai_call_logs` 监控 |
| 数据一致性 | 小节/题目更新后向量陈旧、新旧版本同时被召回，或旧索引任务晚返回覆盖新内容 | 落库处按 3.2 以 generation CAS + 整源事务替换；阶段 1 即交付补偿/全量重建脚本；集成测试 ②覆盖乱序完成 |
| **状态机并发** | 多标签页/双击让状态跳转两级 | `state_version` 条件更新，命中 0 行返回 409；`run_id` 只定位线程不做并发控制（见 3.1.2） |
| **状态机节点重放** | 恢复、interrupt 或故障重试造成重复扣提示、重复建单或重复改分 | `learning_run_effects.effect_key` 唯一约束 + 业务事务 + 故障注入验证；`state_version` 不承担此职责 |
| **图版本不兼容** | 部署新节点/状态 Schema 后，旧 checkpoint 被新图错误恢复 | 每次运行固定 `graph_version`；发布前演练兼容、迁移或 `restart_required` 策略 |
| **掌握度误判** | 复核闭环建成前就写入掌握度 | 前置项 D 只定义规则，写入推迟到阶段 3；变更严格限于 3.4.2 事件矩阵，唯一下降入口需人工复核前置 |
| **短 ID 串改** | 管理写入路径经 5 位短 ID 解析，碰撞时静默命中错误记录 | 前置项 A2/A3：管理接口内部改用完整 UUID、更新时校验 `lesson_id` 归属、`:id` 只按 `lessons` 解析（URL 短 ID 不变，见 5.0.1） |
| 依赖风险 | 向量维度与 embedding 模型不匹配；供应商批量限制变化 | 配置层固定维度与 batchSize，索引状态记录模型身份，切换模型需重建索引 |
| 降级缺失 | RAG / 状态机失败阻塞主流程 | 每个新增环节强制回退到 V1 既有路径 |
| 评测失真 | 小样本、挑选成功案例或修改样本迎合当前 Prompt | 固定版本化评测集，报告样本量和失败案例；修复后全量回归 |
| 权限与并发 | 越权访问会话/审核接口，重复请求产生多份草稿或重复扣费 | 新增管理路由一律挂**已有的** `requireAdmin` + 资源归属校验 + 出题接口限流（阶段 2）+ 提交中禁用按钮 + 审核状态条件更新 |
| 索引一致性崩溃窗口 | 业务事务提交后、embedding 返回前进程退出，索引状态丢失 | 事务内递增 generation 并置 `pending`，事务外调 embedding；阶段 1 补偿脚本捡回悬挂任务（见 3.6） |
| 复核证据丢失或旧结论覆盖新状态 | 用户再次提交覆盖 `answer`，或管理员晚处理旧提交 | `ai_grading_reviews` 保存快照、`submission_fingerprint` 与 `answer_version`；旧版本复核只留审计、不覆盖新状态 |
| 注入与数据泄露 | 检索文档携带恶意指令，日志或向量库写入敏感数据 | 检索内容按不可信数据隔离；敏感字段禁止入模，日志默认脱敏且不保存完整 Prompt |
| 人工复核积压 | 低置信度提交长期停留在 `pending_review` | 管理端展示待审数量与等待时长；超时只影响自动掌握度更新，不自动按错误处理 |
| 验证能力不足 | 自动化覆盖不足会让“回归无差异”类门槛无法持续验证 | 0A 已引入 vitest 与题目事务集成测试；0B/阶段 1 继续补纯函数和向量索引换代集成测试，其余场景使用具名手工回归清单（见 5.2） |

---

## 8. 后续方向（不在本计划内）

以下为 V2.0 之后的候选方向，仅登记不展开，避免范围膨胀：

- **真沙箱运行判题**（容器隔离 + 测试用例执行），替代/补充无沙箱 AI 评阅。
- **`fill` / `judge` 题型支持**：需先补齐 `submitExercise` 的判分分支、前端渲染组件与后台录入表单，之后 AI 出题才能扩展到这两类。开发文档 V1.1 需求表提到"判断题"、出题 Prompt 提到"填空"，但平台从未实现。
- **V2.1 业务模块**：通知提醒、学习社群、测试系统、多端适配（见开发文档 V1.1 第 3.3 节）。
- **不可变的提交尝试记录表（`exercise_submissions`）与提交历史面板**：当前 `answer` 是"用户 + 题目"唯一记录，每次提交覆盖答案与反馈（`schema.prisma:178`、`exercise.service.ts:245-254`），只有代码题有按次不可变的 `code_submissions`。V2.0 用 `ai_grading_reviews` 存快照绕开了这个限制（见第 4 节）；要做完整提交历史需新建尝试表并改动 `users.score` 聚合口径，单独立项。
- **消息队列（BullMQ）** 化的异步索引与批量出题（届时批量出题再补 `idempotency_key` 与请求记录表，见 3.6）。
- 系统化 Prompt Injection 测试集与更完整的可观测性/成本治理。
- 完整集成测试与端到端测试体系（本计划只做纯函数 + 2 个指定集成测试，见 5.2）。

- **迁移 NestJS**：本计划内明确不做（见 3.7），触发重评估的条件已在该节列出。
- **前后端共享 zod schema**：需先把仓库改造成 pnpm workspace（当前根目录无 `package.json` / `pnpm-workspace.yaml`），之后两端校验规则可收敛到一处。
- **短 ID 方案重构**：见 8.2。

### 8.1 已登记的文档口径不一致（不在本计划内处理）

- 开发文档 V1.1 §5.1 前端技术栈写"编辑器 = Monaco Editor"，实际实现用的是 `@uiw/react-codemirror` + `@codemirror/*`。属 V1.1 文档的历史遗留，登记备查，修订时机另定。
- ~~开发文档 V1.1 §5.2 的日志技术栈与实现不一致。~~ 已在阶段 0B 同步为 pino + pino-http、请求 trace_id 与敏感字段脱敏。

### 8.2 已登记的既有缺陷（不在本计划内处理）

以下为复核 V2.0 计划时发现的既有问题，**不属于 V2.0 范围**，登记以免遗忘：

- **短 ID 存在碰撞风险且碰撞时静默返回错误记录。** `utils/idTransform.ts` 的 `uuidToShortId` 取 UUID 的前 2 位 + 后 3 位共 5 个十六进制字符（约 20 bit 空间），按生日问题估算单表约 1200 条记录时碰撞概率就接近 50%。而 `resolveShortId` 的 SQL 是 `... LIKE $1 || '%' || $2 ORDER BY created_at ASC LIMIT 1`，**碰撞时会静默返回创建最早的那条记录**，而非报错。此外 `REPLACE(id, '-', '')` 使该查询无法命中索引，为全表扫描。
- 替代方案是 `nanoid` / `sqids` 等成熟短 ID 方案，但更换会影响所有对外 URL 与前端路由，改动面远超 V2.0 范围，需单独立项。V2.0 期间题目量增长会推高碰撞概率，建议在阶段 6 的监控中**增加一条短 ID 碰撞检测查询**作为观测手段。
- 📌 **V2.0 已部分止血**（plan.5）：前置项 A2/A3 把**管理写入路径**改为完整 UUID 并加上归属校验，同时修掉 `updateLesson` 把 `:id` 先按题目解析的缺陷（见 5.0.1）。剩余风险集中在**读路径**——前台按短 ID 查课程/章节/小节/题目详情时碰撞仍会静默返回错误记录，那部分才是本条登记的范围。

---

> 本计划为执行依据；实现细节以代码为准。范围或技术决策变更时同步更新本文档并调整"最后核对"日期。
