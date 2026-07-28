# 阶段 0B：AI 基础设施与本地验证

## 阶段定位

在本地建立后续 RAG、评分和状态机共用的数据库、依赖、日志、测试与评测底座，不交付业务功能。

- 主计划依据：3.2、3.5、3.8、第 4 节、阶段 0B、5.1、5.2。
- 前置依赖：0A 代码已稳定，允许其最终测试门禁等待本阶段。
- 后继解锁：阶段 1、3。

## 执行范围

1. 本地数据库与迁移：
   - 开发 PostgreSQL 固定为 `pgvector/pgvector:0.8.2-pg16-bookworm`。
   - migration 启用 `vector`。
   - 建 `knowledge_chunks`、`knowledge_index_state`、`learning_run_effects`。
   - 给 `ai_chat_sessions` 增加 `current_run_id`、`state_version`、`graph_version`。
   - 暂不创建 `answer.version` 与 `ai_grading_reviews`，它们属于阶段 3。
2. LangGraph 最小底座：
   - 安装并锁定 LangGraph 与 PostgreSQL checkpointer 依赖。
   - 新增独立 `scripts/setup-checkpointer.ts`；不得在应用启动时执行 DDL。
   - 做可跨进程恢复的最小图验证。
3. RAG 骨架：
   - embedding 配置与客户端。
   - `RecursiveCharacterTextSplitter` 封装、检索接口类型和空实现。
   - DashScope batch size 默认 10，本地负责把 11 条拆批。
4. 通用工程底座：
   - zod、textsplitters、pino/pino-http。
   - `AsyncLocalStorage` 请求上下文和 `trace_id`。
   - 将代码评阅、选择题解释的结构化输出迁到 zod schema，保持行为不变。
5. 测试与评测：
   - 引入 vitest，并接入 `pnpm run check`。
   - 建受保护的临时 PostgreSQL 夹具。
   - 接入阶段 0A 集成测试 ①，并为阶段 1 集成测试 ②预留夹具。
   - `backend/evals/` 建统一格式、执行器和每场景 20 条冒烟样本。

## 数据模型硬约束

- `knowledge_chunks` 唯一键是 `(source_type, source_id, chunk_index)`，不含 `source_version`。
- `knowledge_index_state` 唯一键是 `(source_type, source_id)`，含单调递增 `index_generation`。
- 向量列使用 Prisma `Unsupported("vector(N)")`；扩展和向量索引写原始 migration SQL。
- 原始 SQL 参数使用向量字符串并显式 `$1::vector` 转型。
- checkpoint 表由官方 `PostgresSaver.setup()` 创建，不写入 Prisma schema。

## 禁止事项

- 不实现正式检索、出题、复核或学习状态机。
- 不在应用启动路径运行 checkpointer setup。
- 不修改自由对话业务流程。
- 不把生产数据库或真实凭据作为测试夹具。
- 不为跑通测试放宽临时库名称保护。

## 必须验证

- migration 在空临时库可完整执行。
- 测试文本可写入向量表并通过原始 SQL 查回 top-k。
- zod 能拦截非法结构，两处现有 AI 行为无回归。
- 深层 service 能从请求上下文读取同一个 `trace_id`。
- checkpointer setup 连续执行两次均成功且不丢已有数据。
- 进程 A 中断后，进程 B 用同一 `thread_id` 恢复最小图。
- 10 条 embedding 真实调用成功；11 条由本地分批。若无凭据，只能将该项列为未验证。
- `pnpm run test` 一条命令可运行纯函数与数据库集成测试。

## 交付物

- package、migration、配置、RAG 骨架、请求上下文、测试夹具和 eval 基础文件。
- 新增环境变量同步到示例文件，不含真实值。
- 基线结果与失败样本，不为达到目标修改样本。
- 阶段交接报告，注明所有依赖版本与 migration 名称。

## 审核门禁

- 后端 build/test/check 通过，0A 集成测试 ①通过。
- migration 与 Prisma schema 对齐。
- 向量维度和 embedding 模型配置一致且有注释/校验。
- checkpoint DDL 与应用启动彻底分离。
- 没有把空实现伪装成正式 RAG 能力。

