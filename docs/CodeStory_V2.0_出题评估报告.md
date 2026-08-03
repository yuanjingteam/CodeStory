# CodeStory V2.0 AI 出题评估报告

> 阶段：阶段 2 工程终审通过，真实模型质量门禁未通过
> 日期：2026-08-01  
> Prompt 版本：`exercise-gen-v1`

## 1. 指标口径

- 首次结构化成功率、修复后成功率和最终失败率的分母均为发起的候选题生成次数，包含最终失败请求。
- 每道有效候选平均模型调用次数为模型调用总数除以最终通过 Schema 的候选题数。
- 答案正确率只统计管理员已人工标注的候选题；未标注项不进入该指标分母。
- Agent 审核使用独立的 `agentAnswerCorrect`、`agentConfirmedDuplicate` 字段和指标，标记为 `agent-audited`，不得计入人工分母。
- 重复率同时记录 `0.92` 阈值机器初筛数和管理员人工确认数，最终重复率以人工确认结果为准。机器初筛使用提交到仓库的 `backend/evals/datasets/exercise-generation-approved-baseline.ts`，只比较同小节 `approved` 题目；向量、阈值和结果可由单元测试复现。
- 管理员采用率样本达到 100 后再用于上线判断。

## 2. 当前证据

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 固定构造数据 Schema | `100 / 100` 通过 | `backend/test/unit/exercise-generation-stage2.test.ts` |
| 非法候选拒绝 | 通过 | 答案不在选项、缺少自检、不支持题型均被拒绝 |
| 解析修复次数 | 最多 1 次 | 首次链失败后只进入一次 repair chain；模型内部重试关闭 |
| 重复初筛 | 已实现 | 同小节已采用题目的 embedding 相似度阈值 `0.92` |
| 固定 approved baseline 初筛 | 已验证 | `pnpm test -- test/unit/eval-gates.test.ts`：同小节命中、跨小节及无 baseline 均可复现 |
| 草稿原子落库 | 已实现 | 候选完成 Schema、自检和去重后，单一 Prisma 事务整批写入 |
| 线上 100 候选实测 | `99 / 100` 最终成功 | `backend/evals/datasets/exercise-generation-results-final-v2.json` |
| Agent 语义复核 | 99 个有效候选全部复核 | 答案正确 `95 / 99`；跨课程语义重复 `22 / 99`；`humanReviewed=false` |
| 管理页浏览器回归 | `3 / 3` 通过 | `cd frontend && pnpm run test:e2e:stage2`，使用稳定 API Mock，覆盖桌面、390px、全量层级、多页和审核流 |

## 3. 评测命令

真实端点运行、Agent 审查合并和评分命令：

```powershell
cd backend
pnpm run eval:exercise-generation:run -- `
  --limit=100 --concurrency=3 `
  --output=evals/datasets/exercise-generation-results-final-v2.json
pnpm run eval:exercise-generation:audit
pnpm run eval:exercise-generation -- `
  --input=evals/datasets/exercise-generation-results-audited.json `
  --output=evals/reports/exercise-generation.json
```

每条记录包含：`id`、`firstPassStructured`、`repaired`、`finalSuccess`、`modelCallCount`、`validCandidateCount`，人工标注字段 `answerCorrect`、`humanConfirmedDuplicate`、`accepted`，以及独立的 Agent 审核字段 `agentAnswerCorrect`、`agentConfirmedDuplicate`。脚本分别输出人工与 `agent-audited` 指标，不混用分母。

机器初筛字段（`machineDuplicate`、`machineDuplicateSimilarity`）仅表示同小节 approved baseline 的可复现预警，不能替代管理员确认；`score-exercise-generation` 报告会同时输出 `machineDuplicatePolicy` 与覆盖数量。

## 4. 发布判断

真实模型使用 SiliconFlow `deepseek-ai/DeepSeek-V4-Flash` 完成 100 条固定分层样本。结果如下：

| 指标 | 门禁 | 实测 | 结论 |
| --- | --- | --- | --- |
| 首次结构化成功率 | `≥ 90%` | `89%` | ❌ |
| 修复后成功率 | `≥ 99%` | `99%` | ✅ |
| 最终失败率 | `≤ 1%` | `1%` | ✅ |
| 每道有效候选模型调用次数 | `≤ 1.3` | `1.1212` | ✅ |
| Agent 复核答案正确率 | `≥ 95%` | `95 / 99 = 95.96%` | ✅ |
| Agent 跨课程语义重复率 | `≤ 5%` | `22 / 99 = 22.22%` | ❌ |

重复率为压力测试口径：跨全部 hierarchy 比较“仅替换场景或实体、核心题意与解法同构”的候选；生产机器去重按同一 lesson 执行，本次同课机器重复数为 0，两者不可混为同一指标。

**结论：阶段 2 真实模型质量门禁未通过，不标记完全完成。** 未通过项为首次结构化成功率和跨课程语义重复率；答案复核为 `agent-audited`，不是管理员人工标注。

目标门禁保持为：

- 首次结构化成功率 `≥ 90%`；
- 修复后成功率 `≥ 99%`；
- 最终失败率 `≤ 1%`；
- 每道有效候选平均模型调用次数 `≤ 1.3`；
- 人工复核答案正确率 `≥ 95%`；
- 人工确认重复率 `≤ 5%`。
