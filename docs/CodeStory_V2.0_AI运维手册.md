# CodeStory V2.0 AI 运维手册

## 1. 安全默认值

生产部署完成 migration、索引重建和冒烟前，保持 `AI_RAG_ENABLED=false` 与
`AI_GRAPH_ENABLED=false`。AI 调用日志只保存结构化元数据，不保存原始 Prompt、
密钥、Token、验证码或联系方式；默认保留 90 天。checkpoint 默认保留 30 天，
但时间不是删除的充分条件。

所有维护命令默认 dry-run。只有显式传入 `--execute` 才写数据库；`--limit` 均有
硬上限。标准输出是一行结构化 JSON：成功为 0，发现需处理事项或门槛告警为 2，
指标样本不足为 3，脚本异常为 1。

## 2. 定时任务

以下示例在 backend 容器中运行；实际部署可换成 systemd timer 或 cron。不要并行
运行同一维护任务。

```cron
*/5 * * * * cd /app && pnpm run ops:ai-report
*/10 * * * * cd /app && pnpm run ops:rag-maintain -- --age-minutes=10 --limit=100 --execute
15 3 * * * cd /app && pnpm run ops:checkpoint-cleanup -- --retention-days=30 --limit=100 --execute
30 3 * * * cd /app && pnpm run ops:ai-log-cleanup -- --retention-days=90 --limit=1000 --execute
```

首次部署先移除 `--execute`，确认候选、数据库账号权限和日志接收位置后再启用。

## 3. 指标与告警

`ops:ai-report` 按场景输出最近 5 分钟成功率、P50/P95、token、重试与降级，另按
数据库时区统计当日成本。结果状态为：

- `OK`：样本充分且无门槛命中；
- `WARN`：P95 超过对应基线两倍，或成本达到日预算 80%；
- `ALERT`：成功率低于 95%，或成本达到日预算 100%；
- `INSUFFICIENT_DATA`：窗口调用数不足、任一场景 token/成本覆盖少于调用数、
  当日成本覆盖不完整，或该场景没有实测 P95 基线；不能当作通过。流式响应若
  provider 未在最终 chunk 返回 usage，也会明确落入此状态。

`AI_INPUT_COST_USD_PER_MILLION_TOKENS` 与
`AI_OUTPUT_COST_USD_PER_MILLION_TOKENS` 必须按当前供应商价目表填写；示例值不是
价格承诺。基线变量必须使用日志中的精确 scene 名，例如 `lesson-chat`，不能用
`chat` 或下划线别名代替。

退出码和 JSON 日志由 cron/systemd 捕获即可形成最小告警闭环。日预算达到 100%
时，值班人应保持或关闭非必要高成本能力开关；脚本不擅自改生产配置。

## 4. RAG 补偿

`ops:rag-maintain` 只选择 `failed` 或超过阈值的 `pending/repairing` generation。
执行时以 expected generation、status 和 age 原子 claim 为 `repairing`；queue 前
再锁行核验。source 缺失的失效写入也带 expected-generation CAS。运行中 generation
变化时计入 `generationConflicts`，旧任务不会覆盖新索引；进程中断留下的 stale
`repairing` 可被后续运行重新 claim。dry-run 发现悬挂项返回 2。

## 5. checkpoint 清理

`guided_learning_runs` 是可审计生命周期注册表。候选必须同时满足：状态为
`terminal`、终态为 `REVIEW/COMPLETE/EMPTY/RESTART_REQUIRED`、完成时间超过保留期、
尚未清理 checkpoint，且 run 已被新 run 替代，不是 session 的 `current_run_id`。
执行时在同一事务锁定 run 并复核；当前 run、进行中、superseded 但未确认终态或
缺失注册记录的线程均跳过。删除 writes、blobs、checkpoints 后写入
`checkpoint_deleted_at`；任一步失败整批回滚，重复执行不会扩大范围。

当前依赖版本未提供可复用且可与 Prisma 业务行复核共享事务的 `deleteThread` API，
因此脚本按 PostgresSaver 当前三张线程表显式删除；升级 LangGraph 依赖时必须先核对
表结构与官方 API，再运行 execute。

`learning_run_effects` 不随 checkpoint 删除：它既是业务幂等凭据也是故障审计记录。
当前版本长期保留并由数据库备份覆盖；未来若要增加保留期，必须另建只选择
`checkpoint_deleted_at` 非空且超过独立审计保留期的清理命令，不得复用 checkpoint
的 30 天窗口。

## 6. 发布与回滚

发布前冻结模型、Prompt、Embedding、检索和数据集版本，完整运行评测，不只重跑
失败项。0C 未完成时最多判定“发布候选就绪”。维护脚本异常时不要提高 limit 或
绕过 CAS；停止相应定时任务，保留 JSON 审计输出并按备份恢复流程处理。
