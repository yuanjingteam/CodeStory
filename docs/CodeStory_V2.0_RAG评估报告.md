# CodeStory V2.0 RAG 评估报告

> 状态：检索与回答模型对照完成；grounded-v2 claim 支持率 0.9057，阶段 1 上线门禁通过（2026-07-31）

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

DeepSeek V4 Flash 继续作为正式回答模型，不切换 LongCat。生产使用
grounded-v2 提示约束。

## 上线门槛

- Recall@5 ≥ 0.85（当前 1.00，已通过）
- 回答证据支持准确率 ≥ 0.90（当前 0.9057，已通过）
- 自动化测试和真实供应商冒烟保持通过

阶段 1 上线门槛已全部通过，发布组合为 Qwen3-Embedding-4B +
DeepSeek V4 Flash + grounded-v2。仓库和示例环境中的
`AI_RAG_ENABLED` 继续保持安全默认值 `false`；实际部署完成迁移、
重建和冒烟后，由部署环境显式改为 `true`，不在源码中默认开启。
