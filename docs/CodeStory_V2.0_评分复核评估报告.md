# CodeStory V2.0 评分复核评估报告

> **2026-08-05 归档**：人工复核队列已移除。本报告评测的是**代码题 AI 自动判分链**
> 的准确率，该链路保留在线，因此数据仍然有效；但报告中涉及「进入复核队列」
> 「人工改判」的结论已不再对应任何运行时行为。

> 状态：工程与 Qwen3 30B Agent 标注门禁通过；人工质量门禁待补

> 2026-08-04 模型切换说明：下文数据是 DeepSeek 历史基线。生产候选已切换为
> SiliconFlow `Qwen/Qwen3-30B-A3B-Instruct-2507`，必须使用同一 30 条分层集
> 重新评测并完成人工标注，旧结果不能作为新模型的发布证据。Qwen3 30B
> 固定集已于 2026-08-04 重跑通过，人工标签仍待补。

## 评测口径

- 固定数据集：`backend/evals/datasets/grading-stage3.ts`，共 30 条 SQL 代码题提交。
- 分层：正确、明显错误、边界答案各 10 条，不从运行结果中删除失败样本。
- 标注口径：当前标签为 `agent-audited`，不是人工标注；管理员人工复核前不得声明达到人工质量门槛。
- 指标：通过结论一致率目标不低于 90%，百分制平均绝对误差不高于 10；规则冲突样本必须进入复核。

## 执行方式

在配置真实模型的隔离环境运行：

```bash
cd backend
pnpm run eval:grading -- --output=evals/reports/grading-stage3.json
```

运行器调用生产评分链，保存逐条结论、置信度、规则冲突、一致性和绝对误差。报告文件包含模型输出，因此不作为当前未运行状态的伪造证据提交。

## 实测结果

### Qwen3 30B 当前候选

- 模型：SiliconFlow `Qwen/Qwen3-30B-A3B-Instruct-2507`。
- 正式重跑 30 / 30 条完成，无失败样本。
- 通过结论一致率：`29 / 30 = 96.67%`，门禁 `≥ 90%`。
- 百分制平均绝对误差：`9.67`，门禁 `≤ 10`。
- 报告：`backend/evals/reports/grading-stage3.qwen3-30b.v2.json`。
- 标签来源仍是固定 Agent 基准，`humanReviewed=false`，因此不能替代人工质量验收。

首次诊断运行只完成 16 / 30 条，14 条均因模型把百分制静态功能分
`100` 直接复制到 AI 评阅的 `0–70` 字段而触发 Schema 拒绝。评分提示已将
静态参考字段改名为 `staticOverallScore` / `staticFunctionalPercent`，并明确
要求换算到 AI 分项范围；正式重跑随后通过。失败报告
`grading-stage3.qwen3-30b.json` 保留为诊断证据，不计入正式指标。

### DeepSeek 历史基线

- 模型：SiliconFlow `deepseek-ai/DeepSeek-V4-Flash`。
- 30 / 30 条完成；一致率 `100%`，MAE `8.33`。
- 报告：`backend/evals/reports/grading-stage3.json`，标签来源为 `agent-audited`。

**结论：阶段 3 工程闭环与 Qwen3 30B 固定 Agent 基准门禁通过，人工质量门禁
尚未关闭。** 完成人工标签并再次确认一致率 `≥ 90%`、MAE `≤ 10` 后，才能
标记阶段 3 完全通过。
