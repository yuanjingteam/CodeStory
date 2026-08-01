# CodeStory V2.0 AI 出题评估报告

> 阶段：阶段 2 工程终审条件通过，真实模型质量门禁待补跑  
> 日期：2026-08-01  
> Prompt 版本：`exercise-gen-v1`

## 1. 指标口径

- 首次结构化成功率、修复后成功率和最终失败率的分母均为发起的候选题生成次数，包含最终失败请求。
- 每道有效候选平均模型调用次数为模型调用总数除以最终通过 Schema 的候选题数。
- 答案正确率只统计管理员已人工标注的候选题；未标注项不进入该指标分母。
- Agent 审核使用独立的 `agentAnswerCorrect`、`agentConfirmedDuplicate` 字段和指标，标记为 `agent-audited`，不得计入人工分母。
- 重复率同时记录 `0.92` 阈值机器初筛数和管理员人工确认数，最终重复率以人工确认结果为准。
- 管理员采用率样本达到 100 后再用于上线判断。

## 2. 当前证据

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 固定构造数据 Schema | `100 / 100` 通过 | `backend/test/unit/exercise-generation-stage2.test.ts` |
| 非法候选拒绝 | 通过 | 答案不在选项、缺少自检、不支持题型均被拒绝 |
| 解析修复次数 | 最多 1 次 | 首次链失败后只进入一次 repair chain；模型内部重试关闭 |
| 重复初筛 | 已实现 | 同小节已采用题目的 embedding 相似度阈值 `0.92` |
| 草稿原子落库 | 已实现 | 候选完成 Schema、自检和去重后，单一 Prisma 事务整批写入 |
| 线上 ≥100 候选实测 | **待补跑** | 本次未自动消耗外部模型额度，也未伪造人工答案/重复标注 |
| 管理页浏览器回归 | `3 / 3` 通过 | `cd frontend && pnpm run test:e2e:stage2`，使用稳定 API Mock，覆盖桌面、390px、全量层级、多页和审核流 |

## 3. 评测命令

将真实端点运行结果与管理员标注整理为 JSON 数组后执行：

```powershell
cd backend
pnpm run eval:exercise-generation -- `
  --input=evals/datasets/exercise-generation-results.json `
  --output=evals/reports/exercise-generation.json
```

每条记录包含：`id`、`firstPassStructured`、`repaired`、`finalSuccess`、`modelCallCount`、`validCandidateCount`，人工标注字段 `answerCorrect`、`humanConfirmedDuplicate`、`accepted`，以及独立的 Agent 审核字段 `agentAnswerCorrect`、`agentConfirmedDuplicate`。脚本分别输出人工与 `agent-audited` 指标，不混用分母。

## 4. 发布判断

当前工程实现、数据安全回归和可重复浏览器门禁已经补齐，仍不能证明外部模型质量门槛。以下指标补齐真实样本前，阶段 2 只能进入独立工程复审，不应被审核为完全通过：

- 首次结构化成功率 `≥ 90%`；
- 修复后成功率 `≥ 99%`；
- 最终失败率 `≤ 1%`；
- 每道有效候选平均模型调用次数 `≤ 1.3`；
- 人工复核答案正确率 `≥ 95%`；
- 人工确认重复率 `≤ 5%`。
