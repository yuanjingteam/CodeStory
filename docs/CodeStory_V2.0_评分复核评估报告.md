# CodeStory V2.0 评分复核评估报告

> 状态：工程自动化与真实模型评测均通过（Agent 标注，不冒充人工复核）

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

- 模型：SiliconFlow `deepseek-ai/DeepSeek-V4-Flash`。
- 30 / 30 条完成，无失败样本。
- 通过结论一致率：`100%`，门禁 `≥ 90%`。
- 百分制平均绝对误差：`8.33`，门禁 `≤ 10`。
- 报告：`backend/evals/reports/grading-stage3.json`，标签来源为 `agent-audited`，`humanReviewed=false`。
- 数据库迁移、幂等、权限、申诉、人工复核和过期保护由 13 条迁移、14 个测试文件 / 121 个用例验证。

**结论：阶段 3 真实模型门禁通过。** 该结论只表示固定 Agent 标注集达到发布门槛，不等同于管理员人工质量确认。
