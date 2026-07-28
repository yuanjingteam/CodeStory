# 阶段 4：LangGraph 引导式学习状态机

## 阶段定位

新增一个可关闭、可恢复、跨请求的引导式学习模式。它与自由对话并存，不改写现有聊天和普通做题链路。

- 主计划依据：3.1、3.4、3.6、第 4 节、阶段 4。
- 前置依赖：阶段 2、3 审核通过。
- 后继解锁：阶段 6。

## 执行范围

### 后端图与一致性

1. 用 `StateGraph` 实现：
   `INIT → EXPLAIN → QUESTION → WAIT_ANSWER → EVALUATE → HINT/REVIEW`。
2. `PostgresSaver` 使用 `current_run_id` 作为 thread ID；关键节点同步持久化。
3. `QUESTION` 只从当前小节 `approved` 题库选题，不即时生成。
4. 评分、提示和掌握度分别复用阶段 3 评分链、既有提示服务和事件矩阵。
5. 推进请求必须携带 `run_id + expected_state_version`，条件更新失败返回 409 和当前状态。
6. 所有业务副作用通过唯一 `effect_key` 幂等执行；副作用与 effect 状态处于同一 Prisma 事务。
7. checkpoint 是图状态事实源；session 字段只是投影。投影失败留下可补偿状态，不从投影反向恢复图。
8. 提供 effect/checkpoint/业务投影对账补偿脚本。
9. 启动时固定 `graph_version`，实现兼容、迁移或 `restart_required` 策略。

### 接口与前端

1. 新增启动、推进、恢复路由。
2. NDJSON 增加向后兼容的 `state` 事件。
3. `GET /ai/chat/history` 下发 `guidedModeAvailable`。
4. 小节 AI 面板增加模式切换和状态条。
5. `AI_GRAPH_ENABLED` 默认 false；关闭时不注册状态机路由，前端不显示入口。

## 关键不变量

- 一次学习运行一个 UUID；重学必须换发 run ID。
- `state_version` 解决请求并发，`effect_key` 解决节点重放，两者不能互相替代。
- `hint_level` 最终写回服务端事实源，不能由前端声明。
- 状态机失败不得阻塞自由对话和普通做题。
- 已运行线程固定 graph version，部署新版图不能静默套用。

## 禁止事项

- 不在 QUESTION 节点调用出题链。
- 不把 checkpoint 与 Prisma 业务写入描述成同一数据库事务。
- 不用进程内锁解决多实例并发。
- 不在前端读取后端环境变量判断能力。
- 不默认开启功能开关。

## 必须验证

- 完整走通未通过、三次提示、复盘和未掌握人工前置路径。
- 在 `WAIT_ANSWER` 关闭页面并重启后端，恢复同一节点和 hint level。
- 完成后重学，run ID 更换且从 INIT 开始。
- 两标签页并发、快速双击和旧 run ID 均只有一个请求推进，冲突返回 409。
- 在副作用成功而响应/checkpoint 未完成处故障注入，恢复后不重复：
  - 写答案。
  - 扣提示。
  - 建复核单。
  - 改掌握度。
  - 加积分。
- 至少一个旧 graph version checkpoint 完成升级演练。
- approved 题不足时走明确空分支。
- 开关关闭时路由 404、入口隐藏、自由对话和普通做题回归通过。
- 旧客户端忽略新增 state 事件且不报错。

## 交付物

- `services/ai/learning-graph/**`、路由、session 投影与补偿脚本。
- 前端模式切换、状态条和协议解析。
- 并发、重放、恢复、图升级的可复现故障测试/手工脚本。
- 独立记录引导模式首 Token P95 基线。

## 审核门禁

- feature flag 关闭路径真正隔离。
- checkpoint、投影、业务副作用的事实源与补偿边界清楚。
- state version CAS 和 effect 幂等均有故障证据。
- 没有改动自由对话控制流。
- 旧图升级策略不是仅写文档，至少演练一个样本。

