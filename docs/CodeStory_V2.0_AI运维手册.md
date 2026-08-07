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
- `INSUFFICIENT_DATA`：窗口调用数低于 `--minimum-calls`，不能当作通过。

退出码和 JSON 日志由 cron/systemd 捕获即可形成最小告警闭环。日预算达到 100%
时，值班人应保持或关闭非必要高成本能力开关；脚本不擅自改生产配置。

## 4. RAG 补偿

`ops:rag-maintain` 只选择 `failed` 或超过阈值的 `pending` generation。执行前再次
核对 generation；补偿仍调用业务层的整源换代与 CAS，不直接写 chunk。运行中
generation 变化或完成时 CAS 返回 stale，计入 `generationConflicts`，旧任务不会
覆盖新索引。dry-run 发现悬挂项返回 2，便于调度器报警。

## 5. checkpoint 清理

候选必须同时满足：session 未删除、有 `current_run_id`、投影处于
`REVIEW/COMPLETE/EMPTY/RESTART_REQUIRED`、更新时间超过保留期。执行时在同一事务
加锁并复核；进行中、已换 run、缺失投影或刚更新的线程均跳过。删除顺序为 writes、
blobs、checkpoints，并在同一事务清空 `current_run_id`，保留终态投影供界面展示，
避免 session 悬挂引用；任一步失败整批回滚。重复执行没有候选，不会扩大删除范围。

当前依赖版本未提供可复用且可与 Prisma 业务行复核共享事务的 `deleteThread` API，
因此脚本按 PostgresSaver 当前三张线程表显式删除；升级 LangGraph 依赖时必须先核对
表结构与官方 API，再运行 execute。

当前模型没有历史 run 生命周期表，因此被新 run 替换后且缺失投影的孤儿线程不做
推断性清理。若产品需要清理这类线程，应先增加可审计的运行历史，不得仅按时间删。

## 6. 发布与回滚

发布前冻结模型、Prompt、Embedding、检索和数据集版本，完整运行评测，不只重跑
失败项。0C 未完成时最多判定“发布候选就绪”。维护脚本异常时不要提高 limit 或
绕过 CAS；停止相应定时任务，保留 JSON 审计输出并按备份恢复流程处理。
