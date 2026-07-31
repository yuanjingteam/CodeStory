# 阶段 1：RAG 检索层与答疑 Grounding

> **状态：实现、内容治理、模型对照与 claim 级门禁全部通过（2026-07-31）**
>
> SiliconFlow 4B/8B/BGE-M3 的同集检索评测、DeepSeek/LongCat 回答对照和 77 项后端测试均已完成。4B 保持 Embedding 主选；DeepSeek V4 Flash 使用 grounded-v2 后 claim 支持率 48/53 = 0.9057。仓库开关继续安全默认关闭，由部署环境在迁移、重建和冒烟后显式开启。

## 阶段定位

交付唯一、可复用且带访问控制的检索层，并只在现有自由对话的上下文装配处注入证据。

- 主计划依据：3.2、3.3、阶段 1、5.1、5.2 集成测试 ②。
- 前置依赖：阶段 0A、0B 审核通过。
- 后继解锁：阶段 2、5。

## 执行范围

1. 实现小节和题目的切片、embedding 与 `indexSource()`。
2. 用 generation CAS 实现整源换代：
   - 业务事务内递增 generation 并写 `pending`。
   - 事务外调用 embedding。
   - 最终事务校验 generation 与源更新时间后整体替换 chunks。
   - 旧任务不得覆盖新任务，失败不得造成索引真空。
3. 在小节/题目管理落库点触发同步索引，失败只影响索引状态，不回滚已成功的业务编辑。
4. 实现 `retrieve(query, { userId, courseId, lessonId, purpose })`：
   - 当前数据模型没有发布态/选课表；学生只能检索服务端确认有效的课程、小节和非 AI 静态题。
   - 阶段 2 增加 `review_status` 后，学生策略切换为只检索 `approved` 题。
   - 管理用途使用独立 purpose，不复用学生策略绕过权限。
   - 返回来源、定位信息、相关度与内容片段。
5. 在 `lesson-context.service.ts` 装配检索证据；embedding/检索失败时回退现有整段正文上下文。
6. 提供全量重建与悬挂任务补偿脚本。
7. 补齐不少于 50 个问题的稳定标注集和 RAG 指标执行。
8. 补齐管理员可见、可恢复的索引闭环：
   - 小节列表展示 `ready/pending/partial/failed/not_indexed` 汇总状态。
   - 支持单小节重试与按当前课程/章节筛选批量同步。
   - 课程或章节标题变化时，同步重建其下所有小节与静态题索引。
   - 课程、章节或小节软删除时，同事务失效对应索引。

## 关键不变量

- `streamLessonChat` 控制流不动；`lesson-chat.service.ts` 只增加证据槽位。
- 题目 `source_id` 使用稳定 UUID。
- 检索片段视为不可信数据，不允许其内容覆盖系统指令。
- 软删除、未发布、`draft/rejected` 内容不能由学生接口召回。
- PostgreSQL 业务表是事实源，向量索引可重建。

## 禁止事项

- 不实现 AI 出题、推荐、状态机或消息队列。
- 不以“删除旧 chunks 后再远程 embedding”实现换代。
- 不把前端传来的 course/lesson 范围直接当授权结论。
- 不记录完整敏感 Prompt 或私有课程内容到普通日志。

## 必须验证

- 同一问题的证据片段进入 Prompt，日志只记录安全的来源定位。
- 模拟 embedding 失败时，自由对话仍正常回复。
- 同课程跨小节召回成功；跨课程和不可见内容召回失败。
- 编辑小节后索引更新，题目 source ID 保持不变。
- 集成测试 ②覆盖：
  - 连续两次只留一代 chunks。
  - 旧内容不再被召回。
  - 换代中途失败时旧 chunks 完整保留，状态为 `pending`。
  - 乱序完成时旧 generation 无法覆盖新内容。
  - 补偿脚本可重复执行并收敛悬挂任务。
- `Recall@5 ≥ 0.85`，证据支持准确率 `≥ 0.90`；未达到时不得接入主路径。

## 交付物

- `services/rag/**` 正式实现。
- 上下文装配和管理落库挂载点的最小改动。
- `reindex-knowledge`、`repair-knowledge-index` 脚本。
- 集成测试 ②、RAG 标注集、逐条结果和聚合报告。
- 降级与权限手工回归记录。
- 管理端索引状态列、单小节重试和当前筛选批量同步入口。

## 审核门禁

- generation CAS 与整源事务换代经代码审查和故障测试成立。
- 学生检索的授权由服务端业务表判定。
- 自由对话控制流无回归。
- 两项 RAG 质量硬门槛达标；否则退回调优或保持功能未接入。

## 本次执行记录

- 新增迁移 `20260730010000_add_rag_index_identity`，索引代次记录模型、维度与索引版本。
- `pnpm run rag:reindex`：38/38 来源 ready；`pnpm run check:rag-retrieval`：真实 top-5 返回成功。
- 管理端小节列表已展示持久化索引汇总；保存结果区分成功、部分失败和失败，支持单小节重试与当前筛选批量同步。
- 课程/章节标题修改会同步重建后代索引；课程/章节/小节软删除会失效对应索引。
- `pnpm run check`：build、认证检查、10 个测试文件共 70 项测试全部通过；前端 `pnpm run check` 通过。
- `backend/evals/datasets/rag-candidates.generated.json` 已完成复核：50 approved、26 rejected、0 pending。
- rejected 用例覆盖 13 个真实问题来源；这些来源仍可能被学生检索召回，必须先修复、删除或重新归属，再重建索引和重新生成受影响标签。
- 4B、8B、BGE-M3 已逐一完整重建并运行同一 50 题评测；三者 Recall@5 均为 1.00，MRR@5 分别为 0.9867、1.0000、0.9433。按既定规则保持 4B 主选，数据库索引已恢复为 4B。
- 旧回答级审核将 18/20 判为 supported，但主计划规定分母必须是回答中的可核查事实陈述条数；修正后原始 DeepSeek 为 32/68 = 0.4706，LongCat-2.0 为 35/70 = 0.5000。
- 导师提示收紧为 grounded-v2 后，DeepSeek V4 Flash 为 48/53 = 0.9057，通过证据支持率门槛；正式回答模型不切换 LongCat。
