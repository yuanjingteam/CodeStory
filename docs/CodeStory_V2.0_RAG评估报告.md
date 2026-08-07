# CodeStory V2.0 RAG 评估报告

> 状态：检索、回答模型与 grounded-v3.1 提示词对照完成；40 条同集质量和延迟门禁通过，仓库生产默认已切换到 grounded-v3（2026-07-31）

## 当前技术结果

- Embedding 主候选：`Qwen/Qwen3-Embedding-4B`
- 向量维度：1024
- SiliconFlow 文档/查询向量真实冒烟：通过
- 问题来源治理：13/13 已设为 `exclude`，其中 2 条测试小节已软删除
- 重建结果：25 个 approved 来源 `ready`，11 个问题来源 `excluded`，0 个失败
- 检索评测：Recall@5 = 1.00，MRR@5 = 0.9867
- 查询延迟：P50 = 186.89 ms，P95 = 550.33 ms
- 真实授权 top-5 检索：通过
- 自动化测试：10 个文件、77 项测试通过
- 回答证据支持准确率：48/53 = 0.9057
- RAG 功能开关：`AI_RAG_ENABLED=false`

## 问题标签人工复核结果

候选集位于 `backend/evals/datasets/rag-candidates.generated.json`，共 76 条。

| 状态 | 数量 |
| --- | ---: |
| `approved` | 50 |
| `rejected` | 26 |
| `pending` | 0 |

- 50 条通过用例覆盖 25 个唯一来源；来源均存在，当前内容哈希与标签一致。
- 26 条拒绝用例覆盖 13 个唯一来源，与通过来源无重叠。
- 拒绝项暴露的是实际源数据问题：6 个 Python 小节标题与正文错位、2 个测试小节混入、1 个 Java 小节标题与内容错位、1 个 Java 小节正文为空、3 道 CSS 题所属小节不匹配。

## 内容治理结果

已执行 `pnpm run rag:exclude-rejected -- --execute`：

- 13 个问题来源全部设置为 `knowledge_index_policy=exclude`；
- 2 条明确测试数据的小节进入 30 天回收站；
- 其余 11 个来源保留原始内容供管理员修复，但不再进入向量检索；
- 空白或仅标题内容标记为 `needs_content`，普通短内容标记为
  `needs_review`；管理员只能对非空短内容选择“人工确认纳入”。

课程、章节、小节和题目删除后保留 30 天。到期时，仅无学习进度、答题、
代码提交或聊天记录的内容自动永久删除；有关联记录的内容继续归档。

## 回答证据审核结果

20 条分层回答已按主计划 5.1 的 claim 级口径重新审核：

- 旧评分按回答计数得到 18/20 = 0.90，但该口径与主计划 5.1 不一致；
  主计划要求按“回答中的可核查事实陈述条数”计分。
- 复核发现多条标为 `supported` 的回答在证据仅为短标题时补充了证据
  未陈述的具体知识，例如语义标签的 SEO/辅助技术收益、Java 类型和
  运算符清单、`div`/`span` 的显示行为及数据库应用场景。
- 原始 DeepSeek 回答为 32/68 = 0.4706；LongCat-2.0 为
  35/70 = 0.5000，两者均未通过。LongCat 仅高 2.94 个百分点，不切换。
- 将导师提示收紧为“只能依据课程证据；证据不足时明确说明且不得用
  常识补全”后，DeepSeek grounded-v2 为 48/53 = 0.9057，达到门槛。
- 5 条未支持 claim 仍保留在明细报告，涉及数据库驱动、数据模型设计、
  闰年具体运算符实现和 HTML 具体区域等边界扩展。

完整留痕：

- 原始回答：`rag-answer-review.generated.json`
- LongCat 回答：`rag-answer-review.longcat-2.0.json`
- grounded-v2 回答：`rag-answer-review.deepseek-v4-flash.grounded-v2.json`
- 三份 manual claim 文件及对应 `rag-answer-support.*.json`
- 聚合对照：`rag-answer-model-comparison.json`
- canonical 门禁结果：`rag-answer-support.json`

问题来源隔离和检索评测已执行：

```bash
pnpm run rag:exclude-rejected -- --execute
pnpm run rag:apply-reviews -- --execute
pnpm run rag:reindex
pnpm run eval:rag:generate
pnpm run eval:rag -- --output=evals/reports/rag-4b.json
pnpm run eval:rag:answers
```

将每条回答拆分为可核查事实陈述，并在 `claims` 中逐条将
`supportReview` 改为 `supported` 或 `unsupported`，再运行：

```bash
pnpm run eval:rag:support -- \
  --input=evals/reports/rag-answer-claims.deepseek-v4-flash.grounded-v2.manual.json \
  --output=evals/reports/rag-answer-support.deepseek-v4-flash.grounded-v2.json
```

## 模型对照

在同一 50 条审核数据集、相同 1024 维、相同切块和 top-5 配置下，
三个候选均已完成全量重建与检索评测：

| 模型 | Recall@5 | MRR@5 | P50 | P95 | 建库耗时 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Qwen3-Embedding-4B | 1.00 | 0.9867 | 186.89 ms | 550.33 ms | 44.65 s |
| Qwen3-Embedding-8B | 1.00 | 1.0000 | 270.08 ms | 6540.34 ms | 96.41 s |
| BAAI/bge-m3 | 1.00 | 0.9433 | 218.40 ms | 538.74 ms | 14.88 s |

供应商接口未返回可用于本次调用的账单金额，实际消耗需在供应商控制台
按执行时段核对。逐条结果分别位于 `rag-4b.json`、`rag-8b.json` 和
`rag-bge-m3.json`。

4B 的 Recall@5 达到 0.85 时保持主选；若未通过，选择达到门槛且 Recall@5
最高的候选，差距不超过 1 个百分点时优先成本更低、其次 P95 更低者。

4B 已通过 Recall 门槛，按既定规则保持主选；当前数据库索引已恢复为
4B。8B 虽然 MRR@5 为 1.00，但建库更慢且本轮 P95 长尾明显，不切换。
BGE-M3 的 MRR@5 低于 4B，也不切换。

回答模型同样使用相同 20 条问题与证据完成对照：

| 回答模型 / 提示 | Claims | Supported | 支持率 | 结果 |
| --- | ---: | ---: | ---: | --- |
| DeepSeek V4 Flash / 原提示 | 68 | 32 | 0.4706 | 未通过 |
| LongCat-2.0 / 原提示 | 70 | 35 | 0.5000 | 未通过 |
| DeepSeek V4 Flash / grounded-v2 | 53 | 48 | 0.9057 | 通过 |
| Qwen3 30B / grounded-v3.1 | 121 | 116 | 0.9587 | 通过 |

DeepSeek 与 LongCat 结果作为历史基线保留。生产候选切换为 Qwen3 30B 后，
使用同一套 40 条分层问题重新生成并完成 claim 级审核；课程 claim 支持率
`116 / 121 = 0.9587`，通用补充正确率 `70 / 70 = 1.00`，引用合法率与扩展
分区准确率均为 `1.00`。报告当前标记为
`hybrid-model-assisted, pending-agent-audit`，机器门禁通过但独立人工复核待补。

## grounded-v3 双模式优化

`grounded-v3` 将课程事实与通用补充分区：默认只回答课程证据，用户明确要求
举例、实际应用或拓展时，额外输出“通用补充（非课程原文）”。本轮修订号为
`grounded-v3.1-boundary`：课程区只允许原文、直接概括和必要推导；证据没有
给出的属性、映射、用法、比较、示例和工程实践必须进入通用补充区。

学生处于明确小节时，短正文直接使用完整上下文并跳过 Embedding；长正文
只在当前小节内检索，避免整门课程 top-5 引入无关小节。回答使用编号课程
引用，流式协议和历史消息会保存回答范围、证据质量和来源信息。

对照命令：

```bash
pnpm run eval:rag:tutor-v2
pnpm run eval:rag:tutor-v3
pnpm run eval:rag:tutor-v3:structure
pnpm run eval:rag:tutor-v2:claims
pnpm run eval:rag:tutor-v2:support
pnpm run eval:rag:tutor-v3:claims
pnpm run eval:rag:tutor-v3:support
pnpm run eval:rag:tutor:compare
```

grounded-v3 门槛为：课程 claim 支持率不低于 0.90、补充 claim 正确率
不低于 0.90、引用编号合法率 1.00、扩展回答分区标识正确率 1.00，且
相同问题集 P95 用户首字时间和 P95 总响应时间较 grounded-v2 的恶化均不
超过 10%。

### 2026-07-31 grounded-v3.1 同集对照

使用 DeepSeek V4 Flash 对同一组 40 条分层问题分别运行 grounded-v2 和
grounded-v3.1，其中课程模式 20 条、扩展模式 20 条。两组任务在同一供应商
时间窗口启动，各自并发数为 3；报告按回答 ID 成对比较，避免跨数据集比较。
回答缓存身份包含提示词修订号，避免 v3.0 旧结果污染 v3.1 数据。

| 质量指标 | grounded-v2 | grounded-v3.1 | 门槛 |
| --- | ---: | ---: | ---: |
| 课程 claim 支持率 | 118/132 = 0.8939 | 97/98 = 0.9898 | ≥ 0.90 |
| 通用补充 claim 正确率 | 不适用 | 111/111 = 1.00 | ≥ 0.90 |
| 引用编号合法率 | 1.00 | 1.00 | 1.00 |
| 扩展回答分区标识正确率 | 不适用 | 1.00 | 1.00 |

claim 审核采用混合流水线：本地先拆分候选 claim，Flash 流式返回候选编号
判定，单条最多 8 个候选一组，6 路并发、逐条检查点并对网络失败重排队一次。
最终报告标记为 `hybrid-model-assisted, agent-audited`。人工复核不仅检查模型
判为 unsupported 的条目，也覆盖全部短证据样本；v3.1 保留 1 条
unsupported，原因是“HTML 不控制样式或行为”没有被所列短证据完整支持。

| 延迟指标 | grounded-v2 | grounded-v3.1 | v3/v2 |
| --- | ---: | ---: | ---: |
| 用户首字时间 P50 / P95 / 平均 | 6.61s / 20.33s / 8.71s | 8.99s / 20.55s / 9.88s | P95 1.011 |
| 总响应时间 P50 / P95 / 平均 | 7.85s / 23.91s / 10.30s | 12.20s / 24.18s / 12.40s | P95 1.011 |
| 输出字符数 P50 / P95 / 平均 | 143 / 524 / 208.6 | 358 / 800 / 326.0 | — |

v3.1 的中位耗时因扩展回答内容更完整而上升，但两个 P95 比率均低于 1.10
门槛。结构评分的回答范围路由、预期来源、引用覆盖、引用合法和扩展分区标识
均为 1.00，无关来源数为 0。最终对比结果为 `passed: true`、决策为
`switch-to-grounded-v3`。

复查留痕：

- 原始回答：`rag-answer-review.grounded-v2-40.json`、`rag-answer-review.grounded-v3.json`
- claim 审核：`rag-answer-claims.grounded-v2-40.json`、`rag-answer-claims.grounded-v3.json`
- 支持率：`rag-answer-support.grounded-v2-40.json`、`rag-answer-support.grounded-v3.json`
- Qwen3 30B：`rag-answer-review.qwen3-30b.grounded-v3.json`、
  `rag-answer-claims.qwen3-30b.grounded-v3.json`、
  `rag-answer-support.qwen3-30b.grounded-v3.json`
- 结构评分：`rag-tutor-v3-structure.json`
- 成对门禁：`rag-tutor-prompt-comparison.json`

40 条同集质量与延迟门禁全部通过，仓库生产默认切换为 `grounded-v3`；环境
值仍使用稳定版本名，实际内部修订号随流式上下文和会话历史记录为
`grounded-v3.1-boundary`。出现回归时可直接将环境变量回退为
`grounded-v2`，无需数据库迁移。

## 上线门槛

- Recall@5 ≥ 0.85（当前 1.00，已通过）
- 回答证据支持准确率 ≥ 0.90（Qwen3 30B grounded-v3.1 当前 0.9587，已通过）
- 自动化测试和真实供应商冒烟保持通过

阶段 1 工程与 Qwen3 30B 机器质量门禁已通过，独立人工复核待补。候选组合为
Qwen3-Embedding-4B + Qwen3 30B + grounded-v3（内部修订
`grounded-v3.1-boundary`）。仓库和示例环境中的
`AI_RAG_ENABLED` 继续保持安全默认值 `false`；实际部署完成迁移、
重建和冒烟后，由部署环境显式改为 `true`，不在源码中默认开启。
