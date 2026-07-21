# CodeStory V2.0 AI 增强执行计划

> **✅ 状态：当前有效**
>
> **文档版本：** V2.0-plan.1
>
> **创建日期：** 2026-07-21
>
> **最后核对：** 2026-07-21
>
> **适用范围：** `backend/src/services/ai/**`、`backend/src/services/courses/**`、`backend/src/services/rag/**`（新增）、`backend/prisma/**`、`frontend/src/app/(admin)/exercises-manage/**`、`frontend/src/components/lessons/**`
>
> **文档用途：** V2.0（AI 助手增强）阶段的开发、验收依据。
>
> **上游依据：** 需求与数据模型以 [`CodeStory_开发文档_V1.1.md`](./CodeStory_开发文档_V1.1.md) 为准；V1 AI 助手已实现范围见（已归档）`CodeStory_AI助手_V1开发路线.md`。
>
> **范围策略：** 务实渐进。本阶段聚焦 **AI 能力增强**：补齐 P0 的 AI 出题、引入 LangGraph 编排新增复杂流程、引入 RAG（pgvector 复用现有 PostgreSQL）。真沙箱判题与 V2.1 业务模块（通知、社群、测试、多端）**不在本计划内**，仅在第 8 节列为后续方向。

---

## 1. 背景与当前阶段判断

### 1.1 结合代码的现状盘点

V1.0 基础平台与 V1.1 AI 助手核心闭环**均已完成**：

| 模块 | 状态 | 代码依据 |
| --- | --- | --- |
| 认证（注册/登录/验证码/找回/双 Token/Redis 会话） | ✅ 完成 | `services/auth/*`、`config/auth-*.ts` |
| 课程/章节/小节/题目 后台 CRUD + 前台展示 | ✅ 完成 | `services/course-manage/*`、`app/(admin)/*`、`app/(main)/courses/**` |
| 学习进度（课程/小节） | ✅ 完成 | `courses_progress`、`lessons_progress` |
| 小节 AI 流式对话 + 会话/消息持久化 + 上下文裁剪 | ✅ 完成 | `services/ai/lesson-chat.service.ts`、`lesson-session.service.ts`、`routes/ai.ts` |
| 三级提示 + 选择题 AI 解释 | ✅ 完成 | `services/courses/exercise-hint.service.ts`、`services/ai/choice-explanation.service.ts` |
| 无沙箱代码 AI 评阅 + 结构化评分整合 | ✅ 基础完成 | `services/ai/code-review.service.ts`、`services/courses/code-grading.service.ts`、`code_submissions` 表 |

### 1.2 技术底座现状

- 后端已引入 `@langchain/openai` + `@langchain/core`，通过 OpenAI 兼容接口对接 **Qwen / 阿里云百炼**（`config/ai.ts`、`services/ai/_shared/model.ts`）。
- **尚未引入 LangGraph**：当前所有 AI 流程为直接 `service` 链式调用。
- `ai_chat_sessions.state`（INIT/EXPLAIN/QUESTION…）与 `hint_level` 字段在表中存在，**但代码未真正驱动状态机**——目前是"自由流式对话 + 关键词识别提示意图"（`routes/ai.ts` 的 `isHintIntent` / `resolveMessageType`）。
- **尚未引入 RAG / 向量库**：小节正文整段塞入 Prompt（`lesson-chat.service.ts` 的 `lessonContent`）。

### 1.3 与文档/目标对齐后的缺口

1. **AI 出题生成**：`CodeStory_开发文档_V1.1.md` 第 2.2.1 节标记为 **P0**（"AI 生成小节题目供管理员审核"），代码中**完全缺失**，无生成服务与路由；`exercises.source` 有 `ai/static` 取值但无生成链路与审核态。
2. **LangGraph 编排**：未做（V1 主动延后至 V2）。
3. **RAG / 向量库 / 长期记忆**：未做（V1 主动延后至 V2）。
4. 其余延后项：真沙箱判题、可观测性、限流、提交历史面板、自适应难度。

### 1.4 结论

项目正处于 **"V1 AI 助手闭环完成 → V2 增强"的交界点**。本计划即 **V2.0：补齐 P0 出题缺口 + LangGraph 编排 + RAG**。

---

## 2. V2.0 目标与范围边界

### 2.1 目标

在不破坏现有稳定闭环的前提下，让 AI 助手从"单轮对话 + 分散 service 调用"演进为 **"检索增强 + 可编排的多步 Agent 流程"**，并补齐管理员 AI 出题能力。

### 2.2 本计划范围内（In Scope）

- RAG 检索基础设施（pgvector + embedding + 统一检索层）。
- 对话答疑 grounding、AI 出题 grounding、跨小节知识检索/推荐、错题与个性化复习 —— 四个 RAG 场景共用同一检索层，分优先级落地。
- LangGraph 出题子图（P0 出题）与判分-提示-复盘子图。
- 最小可观测性（`ai_call_logs`）与索引重建脚本、基础限流。

### 2.3 明确不做（Out of Scope）

- 真沙箱运行判题（保持无沙箱 AI 评阅）。
- V2.1 业务模块：通知提醒、学习社群、测试系统、多端适配。
- 消息队列（BullMQ）、复杂可观测性平台、系统化 Prompt Injection 测试集。

### 2.4 全局约束（继承既有规则）

- **现有 `streamLessonChat` 流式对话主逻辑保持不动**，RAG 只作为"上下文增强"接入。
- 所有新增 AI 流程必须有**失败降级**，不得阻塞用户主流程（与 V1 一致）。
- LangGraph 子图必须可回退到旧 service 路径（灰度开关）。

---

## 3. 技术架构决策

### 3.1 LangGraph 落地边界

**原则：只用于新增/需要重编排的多步复杂流程，不接管自由对话。**

- **出题子图（全新）**：`加载知识点上下文 → 检索(RAG) → 生成候选题 → 自检与去重 → 结构化产出 → 存为草稿待审`。
- **判分-提示-复盘子图（重编排现有分散逻辑）**：`base 判定（规则/静态初判） → AI 结构化多维评分 → merge → 通过则 NEXT / 未通过则 hint_level+1 → 达到 3 级进入 REVIEW（给完整解析 + 标记未掌握）`。
  - 该子图**不是从零重写评分**，而是把现有 `code-review.service` / `code-grading.service` / `exercise-hint.service` / `mastery_level` 用显式图收敛，并补齐"未通过→提示升级→REVIEW"的闭环。
- 依赖包：`@langchain/langgraph`（新增）。子图状态用 LangGraph `StateGraph`；持久化对接现有 `ai_chat_sessions.state` / `hint_level` / `context` 字段，避免新增会话表。
- **灰度开关**：环境变量 `AI_GRAPH_ENABLED`（默认关闭时走旧 service），保证可回退。

### 3.2 RAG 架构

- **存储：pgvector 复用现有 PostgreSQL**（不引入独立向量库）。
- **Embedding：** 百炼 / DashScope embedding（OpenAI 兼容，与现有 Qwen 同源），用 `@langchain/openai` 的 `OpenAIEmbeddings`。新增配置 `AI_EMBEDDING_MODEL`、向量维度随模型确定（如 `text-embedding-v3` 为 1024）。
- **检索层：** 统一封装 `backend/src/services/rag/*`，对上层暴露 `indexSource()` / `retrieve(query, filter)` 接口，被"对话/出题/推荐/复习"四场景共用。
- **索引对象：** 小节正文（按标题/段落切片）、题目（content + knowledge）、（可选）外部参考文档。
- **索引同步：** 小节/题目在后台增删改（`services/course-manage/lesson-manage.ts`、`services/courses/exercise.service.ts` 等落库处）时**同步 upsert 向量**；另提供**全量重建脚本**兜底。**不引入消息队列**。

### 3.3 索引与检索的降级策略

- Embedding 或向量检索失败时，**回退到现有"整段小节正文"上下文**，保证对话不中断。
- 检索为空/相关度低于阈值时，同样回退到原有上下文组装。

---

## 4. 数据模型变更（最小化）

| 变更 | 对象 | 说明 |
| --- | --- | --- |
| **新增表** `knowledge_chunks` | 向量索引 | `id, source_type(lesson/exercise/doc), source_id, chunk_index, content, embedding vector(N), metadata json, updated_at, is_delete`；建向量索引（HNSW 优先，或 IVFFlat）。 |
| **新增字段** `exercises.review_status` | 出题审核 | `varchar(20)`，取值 `draft/approved/rejected`；存量数据默认 `approved` 兼容前台展示，AI 生成默认 `draft`。前台只展示 `approved`。 |
| **新增字段** `exercises.gen_metadata` | 出题溯源（可选） | `json`，记录生成模型、提示词版本、检索片段引用，供审核参考。 |
| **新增表** `ai_call_logs`（P1） | 可观测性 | `id, scene, model, prompt_tokens, completion_tokens, latency_ms, status, error_code, created_at`。 |

### 4.1 pgvector 与 Prisma 接入要点

- 数据库启用扩展：`CREATE EXTENSION IF NOT EXISTS vector;`（迁移中执行）。
- Prisma：generator 开启 `postgresqlExtensions` 预览特性，datasource 声明 `extensions = [vector]`；`embedding` 列用 `Unsupported("vector(N)")`。
- 相似度查询用 **原始 SQL**（`prisma.$queryRaw`，`embedding <=> $1` 余弦/内积），Prisma 类型层不直接支持向量算子。
- 迁移放在 `backend/prisma/migrations/` 下，延续现有命名（时间戳_描述）。

---

## 5. 阶段划分与执行计划

> 里程碑制，每阶段含 **目标 / 范围 / 关键改动 / 完成标准 / 风险**。完成标准均为可验证项。

### 阶段 0 — 技术底座与准备

- **目标：** 打通 LangGraph 与 pgvector 的最小可运行环境。
- **范围：**
  - 后端新增依赖 `@langchain/langgraph`；确认 `OpenAIEmbeddings` 可用。
  - 数据库启用 `vector` 扩展；新增 `knowledge_chunks` 表与向量索引迁移。
  - `config/ai.ts` 扩展 embedding 配置（`AI_EMBEDDING_MODEL` 等）；`.env.production.example` 同步补充。
  - 新建 `services/rag/` 骨架（embedding client、chunk 切片工具、检索接口签名，先空实现 + 单元验证）。
- **关键改动：** `backend/package.json`、`backend/prisma/schema.prisma`、新迁移、`config/ai.ts`、`services/rag/*`。
- **完成标准：**
  - `pnpm run build` 通过；一段测试文本能成功写入 `knowledge_chunks` 并用原始 SQL 查回 top-k。
  - LangGraph 一个"hello world" 子图能在本地跑通并返回结果。
- **风险：** 向量维度与所选 embedding 模型不一致 → 在配置层固定维度并在迁移注释标明。

### 阶段 1 — RAG 检索层 + 对话答疑 grounding

- **目标：** 建成可复用检索层，并把它接入现有小节对话的上下文组装。
- **范围：**
  - 实现小节/题目的切片与 `indexSource()`；在小节/题目落库处挂同步 upsert。
  - 实现 `retrieve(query, {courseId/lessonId})`，返回带来源与相关度的片段。
  - 在 `lesson-context.service.ts` / `lesson-chat.service.ts` 的上下文组装处，用检索片段**替换/补充**"整段正文"注入（保留降级回退）。
  - 全量重建脚本 `scripts/reindex-knowledge.ts`。
- **关键改动：** `services/rag/*`、`services/ai/lesson-context.service.ts`、`services/ai/lesson-chat.service.ts`、`services/course-manage/lesson-manage.ts`、`services/courses/exercise.service.ts`、新脚本。
- **完成标准：**
  - 对同一问题，检索命中片段被注入 Prompt（日志可见来源片段）。
  - 关闭 embedding（模拟失败）时对话仍正常回复（降级验证）。
  - 跨小节提问能召回其它小节相关片段。
- **风险：** 切片粒度影响召回质量 → 先用"标题+段落"策略，阶段 5 再依据验收调参。

### 阶段 2 — AI 出题生成（LangGraph 出题子图 + 管理员审核）⭐补齐 P0

- **目标：** 管理员可一键让 AI 基于知识点生成题目草稿，审核后入库。
- **范围：**
  - LangGraph 出题子图：`检索(RAG) → 生成候选（choice/judge/fill/code） → 自检（格式/答案存在性/难度）与去重（对已有题目向量比对） → 结构化产出`。
  - 出题结果落 `exercises`，`source='ai'`、`review_status='draft'`，写 `gen_metadata`。
  - 新增后端路由（如 `POST /manage/exercises/ai-generate`、审核态流转接口）。
  - 前台查询过滤 `review_status='approved'`（改 `exercise.service` 查询条件）。
  - 后台 `exercises-manage` 增加"AI 生成 → 预览 → 采用/编辑/拒绝"交互。
- **关键改动：** `services/ai/exercise-gen/*`（新）、`routes/exercises.ts` 或新增管理路由、`services/courses/exercise.service.ts`、`frontend/src/app/(admin)/exercises-manage/**`。
- **完成标准：**
  - 管理员选定小节/知识点 → 返回 ≥1 道结构化候选题（含题干/选项/答案/解析）。
  - 生成题默认不在前台展示；审核"采用"后才对学习端可见。
  - AI 失败时给出明确错误且不产生脏数据（无半截草稿）。
- **风险：** 生成题答案不可靠 → 强制"人工审核后才 approved"，AI 仅作参考（与文档定义一致）。

### 阶段 3 — LangGraph 判分-提示-复盘子图

- **目标：** 把分散的评估/提示/复盘逻辑收敛为显式可编排图，补齐 REVIEW 闭环。
- **范围：**
  - 判分-提示-复盘子图对接现有 `code-review` / `code-grading` / `exercise-hint`。
  - 补齐"未通过 → `hint_level+1` → 达到 3 级 → REVIEW（完整解析 + `lessons_progress.mastery_level` 标记未掌握）"。
  - 非代码题的结构化多维评分对齐文档 `AI_EVALUATE`（score/dimensions/feedback/suggestions）。
  - 图状态持久化复用 `ai_chat_sessions.state / hint_level / context`。
  - `AI_GRAPH_ENABLED` 灰度开关，默认可回退旧路径。
- **关键改动：** `services/ai/eval-graph/*`（新）、`routes/exercises.ts`、`routes/ai.ts`、`services/courses/exercise.service.ts`、`services/courses/code-grading.service.ts`。
- **完成标准：**
  - 一道题从"提交→未通过→逐级提示→3 级 REVIEW→标记未掌握"全链路可复现。
  - 开关关闭时行为与现网一致（回归无差异）。
- **风险：** 重编排引入回归 → 灰度开关 + 保留旧 service + 对照验收用例。

### 阶段 4 — 跨小节知识检索/推荐 + 错题个性化复习

- **目标：** 落地两个 RAG 高级场景。
- **范围：**
  - 跨小节推荐：基于向量相似度，为当前小节/薄弱知识点推荐相关小节或知识片段。
  - 错题个性化复习：结合 `answer`（错误记录/得分）+ `lessons_progress.mastery_level`，检索薄弱点相关内容，生成复习清单/重练建议。
  - 前端在小节页/个人中心呈现推荐与复习入口（沿用现有 Neo-Brutalism 组件，不新造视觉语言）。
- **关键改动：** `services/rag/*`、`services/courses/learning-progress.service.ts`、新增推荐/复习路由、`frontend/src/components/lessons/**`、个人中心页面。
- **完成标准：**
  - 对一个已产生错题的用户，能给出可点击的相关小节/复习项。
  - 推荐结果可解释（附相关度或来源）。
- **风险：** 冷启动（无学习数据）→ 回退到难度/顺序的基础推荐。

### 阶段 5 — 工程治理与收尾

- **目标：** 为 AI 增强能力补上最小可观测性与运维项，产出验收清单。
- **范围：**
  - `ai_call_logs` 落地：各 AI 场景记录 token/耗时/成功失败。
  - 索引重建/校验脚本完善；基础限流（对 AI 出题、chat 等高成本接口）。
  - Prompt 文案与"无沙箱评阅≠严格判题"表述复核（延续 V1 验收要点）。
  - 产出 `docs/CodeStory_V2.0_验收清单.md`。
- **关键改动：** `services/**` 埋点、`middleware/` 限流、`scripts/*`、新增验收文档。
- **完成标准：**
  - 关键 AI 场景均有调用日志；限流命中返回可读错误。
  - 验收清单可逐条手工跑通。
- **风险：** 埋点侵入业务 → 用薄封装（包裹 `createChatModel` 调用处统一记录）。

---

## 6. 依赖关系与并行建议

```text
阶段0 ──┬── 阶段1 ── 阶段2(P0出题) ──┐
        │                            ├── 阶段4 ── 阶段5
        └── 阶段3(判分-提示-复盘) ────┘
```

- **阶段 0** 是所有工作的前置。
- **阶段 1 → 阶段 2**：出题 grounding 依赖阶段 1 的检索层。
- **阶段 3** 只依赖阶段 0，**可与阶段 1/2 并行**。
- **阶段 4** 依赖阶段 1（检索）与阶段 3（掌握度闭环）。
- **阶段 5** 收尾，依赖前序全部。
- 若人力有限，建议优先级顺序：**阶段 0 → 1 → 2（补 P0）→ 3 → 4 → 5**。

---

## 7. 风险与应对

| 风险类型 | 描述 | 应对 |
| --- | --- | --- |
| 回归风险 | LangGraph 重编排影响现网稳定闭环 | `AI_GRAPH_ENABLED` 灰度开关 + 保留旧 service + 对照验收用例 |
| 质量风险 | AI 出题答案不可靠 | 强制人工审核后才 `approved`，AI 仅作参考 |
| 成本风险 | embedding + 生成 + 检索抬高调用成本 | 索引增量 upsert、检索 top-k 限制、`ai_call_logs` 监控 |
| 数据一致性 | 小节/题目更新后向量陈旧 | 落库处同步 upsert + 全量重建脚本兜底 |
| 依赖风险 | 向量维度与 embedding 模型不匹配 | 配置层固定维度，迁移注释标明，切换模型需重建索引 |
| 降级缺失 | RAG/图失败阻塞主流程 | 每个新增环节强制回退到 V1 既有路径 |

---

## 8. 后续方向（不在本计划内）

以下为 V2.0 之后的候选方向，仅登记不展开，避免范围膨胀：

- **真沙箱运行判题**（容器隔离 + 测试用例执行），替代/补充无沙箱 AI 评阅。
- **V2.1 业务模块**：通知提醒、学习社群、测试系统、多端适配（见开发文档 V1.1 第 3.3 节）。
- **消息队列（BullMQ）** 化的异步索引与批量出题。
- 系统化 Prompt Injection 测试集与更完整的可观测性/成本治理。

---

> 本计划为执行依据；实现细节以代码为准。范围或技术决策变更时同步更新本文档并调整"最后核对"日期。
