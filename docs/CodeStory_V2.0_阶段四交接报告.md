# CodeStory V2.0 阶段四交接报告

> 状态：核心状态机、发布级证据与工程门禁已补齐，提交审核
>
> 日期：2026-08-05

## 已实现

- `StateGraph` 实现 `EXPLAIN → QUESTION → WAIT_ANSWER → EVALUATE → HINT/REVIEW`，
  使用 `current_run_id` 作为 PostgreSQL checkpoint thread ID，并以同步 durability
  持久化。
- 题目节点只读取当前小节 `review_status='approved'` 的既有题目；无题时进入
  `EMPTY`。
- 启动、推进、恢复接口已实现。推进必须提交 `runId +
  expectedStateVersion`，session CAS 失败返回 409 和当前状态。
- 答案、积分、掌握度与提示等级分别使用确定性 `effect_key`；
  业务写入和 effect applied 状态位于同一 Prisma 事务。
- 三级提示后仍未通过时展示参考答案与解析并结束本轮，不创建人工复核单，
  也不自动下调掌握度。
- checkpoint 是事实源，session 只保存投影；`check:learning-runs` 可从 checkpoint
  重建 session 投影并报告缺失 checkpoint 或 pending effect。
- 运行固定 `AI_GRAPH_VERSION`；版本不一致返回 `RESTART_REQUIRED`，不会静默
  套用新图。
- `AI_GRAPH_ENABLED=false` 时不注册 `/ai/guided/*` 路由，历史接口下发
  `guidedModeAvailable=false`，前端隐藏入口。
- AI 面板已增加模式切换和状态条；自由问答 NDJSON 新增向后兼容的 `state`
  事件，未知事件仍可被旧客户端忽略。

## 自动化结果

- 后端：14 条迁移从空临时库通过，21 个测试文件 / 170 个用例全过。
- 阶段四专项 6 条：关闭路径、状态投影、真实 PostgreSQL checkpoint 跨实例恢复、
  CAS 单胜与 effect 幂等、响应故障注入、三级提示后结束/重学/旧 run/图版本升级。
- 后端 `pnpm run build` 通过。
- 前端 `pnpm run check` 与 `pnpm run build` 通过。

## 发布级证据

- Chrome 登录态中完成 `WAIT_ANSWER` 后端重启恢复：恢复同一 run、题目、
  `state_version` 和 `hint_level`；恢复结果已纳入本报告的故障恢复验收记录。
- 新增 `pnpm run check:learning-graph-faults`：在图 checkpoint 与答案/提示副作用
  完成后注入响应失败，恢复后旧版本请求返回 409，答案只增加一次，effect key
  只有 `evaluate:0` 与 `hint:1`。
- Chrome 390×844 回归通过：移动端改为“目录 / 练习 / AI 助手”单工作区切换，
  自由问答、引导入口和普通练习可用，无横向三栏挤压。
- 引导启动接口是非流式 JSON，不存在独立 Token 事件；按“首个可用响应”记录
  3 次预热 + 20 次样本：成功率 100%，P50 99ms、P95 111ms、最小 88ms、
  最大 131ms。该基线不与自由问答流式首 Token 指标混算。
- 浏览器请求复验确认学习页的短 course/lesson ID 已被推荐接口解析，相关学习
  正常展示，不再出现 404 通知。

## 实际命令

```powershell
cd backend
pnpm run build
pnpm run check:learning-graph-faults
pnpm run test

cd ..\frontend
pnpm run check
pnpm run build
```

阶段四现提交审核；按照任务书约定，由审核者给出通过、条件通过或退回结论。
