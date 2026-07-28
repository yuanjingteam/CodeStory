# CodeStory Docker 部署与数据迁移

> **✅ 状态：当前有效**
>
> **最后核对：2026-07-27**
>
> 适用范围：单台服务器上的 Docker Compose 生产部署

生产环境由 5 个容器组成：

- `postgres`：PostgreSQL 16 + pgvector，仅接入内部数据网络，不发布宿主机端口。
- `redis`：缓存与会话，仅接入内部数据网络。
- `backend`：Express API，同时接入边缘网络与数据网络。
- `frontend`：Next.js，容器内端口 `3001`。
- `nginx`：唯一 HTTP 入口，把 `/api/` 和 `/uploads/` 转给后端，其余请求转给前端。

PostgreSQL 数据保存在外部命名卷 `codestory_postgres_data`。外部卷不会被
`docker compose down -v` 自动删除，但它仍不是备份，必须另做定期异地副本。

历史头像和课程封面已迁入自有 OSS。Bucket 保持 `private`，数据库只保存
`/uploads/...` 相对路径；nginx 将该路径转给后端，由后端使用 OSS 凭据读取对象。
浏览器不会直连 OSS，因此无需为浏览器开放 Bucket，也不依赖 OSS CORS。

## 1. 选择公网入口

直接由 Compose nginx 对公网提供 HTTP：

```env
HTTP_BIND_ADDRESS=0.0.0.0
HTTP_PORT=80
NEXT_PUBLIC_API_BASE_URL=http://你的服务器公网IP
NEXT_PUBLIC_UPLOAD_PROXY_URL=http://你的服务器公网IP
```

如果宿主机已有 nginx/Caddy 负责域名和 HTTPS，让 Compose 只监听本机：

```env
HTTP_BIND_ADDRESS=127.0.0.1
HTTP_PORT=18080
NEXT_PUBLIC_API_BASE_URL=https://codestory.example.com
NEXT_PUBLIC_UPLOAD_PROXY_URL=https://codestory.example.com
```

宿主反向代理的上游填写 `http://127.0.0.1:18080`。两个 `NEXT_PUBLIC_*`
值必须是浏览器实际访问的完整 origin；非默认端口不能省略。它们会在构建期进入
前端产物，修改后必须重新构建 frontend 镜像。

## 2. 准备服务器与配置

```bash
mkdir -p ~/apps
cd ~/apps
git clone 你的仓库地址 CodeStory
cd CodeStory

cp .env.production.example .env
nano .env
```

至少替换以下值：

```env
POSTGRES_USER=codestory_admin
POSTGRES_PASSWORD=数据库管理员强密码
POSTGRES_DB=codestory
POSTGRES_APP_USER=codestory_app
POSTGRES_APP_PASSWORD=另一份应用强密码
DATABASE_URL=postgresql://codestory_app:经过URL编码的应用密码@postgres:5432/codestory

NEXT_PUBLIC_API_BASE_URL=https://你的域名
NEXT_PUBLIC_UPLOAD_PROXY_URL=https://你的域名
JWT_SECRET=很长的随机字符串
JWT_ACCESS_SECRET=另一串随机字符串
JWT_REFRESH_SECRET=再一串随机字符串

OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=RAM用户AccessKey
OSS_ACCESS_KEY_SECRET=RAM用户AccessKeySecret
OSS_BUCKET=你的私有Bucket名称
```

`POSTGRES_USER` 是仅供初始化、扩展安装、恢复和运维使用的数据库超级用户。
后端只使用 `DATABASE_URL` 中的 `POSTGRES_APP_USER`。若密码包含 `@`、`:`、
`/`、`#`、`%` 等保留字符，写入 `DATABASE_URL` 前必须进行 URL 编码。

创建持久卷和宿主目录：

```bash
docker volume create codestory_postgres_data
mkdir -p backups backend/uploads
```

生产凭据只允许存在于服务器 `.env` 或受控的密码管理系统中。工作站取回的生产
`.env` 不应继续放在仓库根目录，因为 Docker Compose 会默认读取它。

## 3. 首次初始化数据库

先只启动数据库和 Redis，不启动业务入口：

```bash
docker compose up -d postgres redis
docker compose ps
docker compose logs postgres
```

首次创建空卷时，`docker/postgres/init-app-user.sh` 会创建非超级用户应用账号。
这些初始化脚本只会在数据目录为空时执行；如果日志报错，不要在未知状态下继续恢复。

确认 pgvector 二进制可用并创建扩展：

```bash
docker compose exec postgres sh -lc \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "CREATE EXTENSION IF NOT EXISTS vector"'
```

## 4. 恢复已完成媒体迁移的数据库归档

将归档复制到服务器项目目录。数据库 dump 放入已挂载的 `backups/`：

```bash
cp codestory_backup/codestory_db_migrated_20260727.dump backups/
docker compose exec postgres \
  pg_restore --list /backups/codestory_db_migrated_20260727.dump
```

该归档的 SHA-256 应为：

```text
69E2517415782F70935D1D5C12C64A70217FC92A240ED5B5F402FE014780628B
```

必须恢复到尚未写入业务对象的空数据库。当前迁移明确放弃旧 owner `codezoo`
及旧 ACL，恢复出的业务对象统一归 `POSTGRES_APP_USER` 所有：

```bash
docker compose exec postgres sh -lc \
  'pg_restore \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --role="$POSTGRES_APP_USER" \
  --no-owner \
  --no-acl \
  --exit-on-error \
  --single-transaction \
  /backups/codestory_db_migrated_20260727.dump'
```

不要把用户名写死成 `postgres`。设置了自定义 `POSTGRES_USER` 后，应使用容器内
的真实管理员变量。`--exit-on-error --single-transaction` 确保对象恢复失败时
不会留下半套业务 Schema。

本次迁移已经把可恢复媒体上传到自有私有 OSS，并把数据库地址统一成
`/uploads/...`。原始 uploads 归档仍应恢复到本地作为兼容回退和额外副本：

```bash
mkdir -p restore-staging
tar -tzf codestory_backup/codestory_uploads_20260722.tar.gz
tar -xzf codestory_backup/codestory_uploads_20260722.tar.gz -C restore-staging
test -d restore-staging/uploads
cp -a restore-staging/uploads/. backend/uploads/
```

## 5. Prisma 迁移记录对账

仓库当前有 3 个历史迁移目录：

```text
20260505014519_init_full_schema
20260511123704_change_score_to_int
20260611120000_add_ai_chat_messages_and_code_submissions
```

先构建后端并检查状态：

```bash
docker compose build backend
docker compose run --rm backend pnpm exec prisma migrate status
```

同时检查 `_prisma_migrations` 的 `migration_name`、`checksum`、`finished_at`
和 `rolled_back_at`。只有迁移记录、校验和与实际 Schema 一致时，才可以执行：

```bash
docker compose run --rm backend pnpm exec prisma migrate deploy
```

如果 Prisma 报迁移缺失、失败或漂移，立即停止。不得仅为了让状态变绿而直接运行
`prisma migrate resolve`；只有在已经证明实际 Schema 等价时才可按具体故障处理。

阶段 0B 新增 LangGraph checkpointer 后，再单独执行一次
`scripts/setup-checkpointer.ts`。该脚本不挂在应用启动流程上。

## 6. 构建、启动与验证

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 nginx
```

至少验证：

1. 登录、刷新 Token 和退出。
2. 课程、章节、小节与题目详情。
3. 无提示答对后，再使用提示重复答对，历史最高分不得下降。
4. 代码题提交与 AI 评阅降级路径。
5. 头像和课程图片中的历史 `/uploads/...` 地址。
   响应应来自本站 `/uploads/...`，不应重定向或泄露 OSS AccessKey。
6. 关键表迁移前后行数、序列最大值及下一次写入。
7. `SELECT extversion FROM pg_extension WHERE extname = 'vector';` 有结果。

确认回归通过前不要开放 nginx 公网入口，也不要让新库产生正式用户写入。

## 7. 日常操作与备份

停止业务容器但保留数据：

```bash
docker compose stop nginx frontend backend
```

重新构建：

```bash
docker compose up -d --build
```

完整数据库 dump 会自动覆盖 Prisma 表和未来的 LangGraph checkpoint 表：

```bash
sh scripts/backup-production.sh
```

脚本会先把私有 OSS 的 `uploads/` 对象同步到 `backend/uploads/`（不删除仅存在于
本地的兼容文件），再打包 uploads；任一步失败都会返回非零状态，不应把残缺结果
计作成功备份。

生产要求：

- 至少每日一次数据库与 uploads 备份。
- 本机保留 7 份日备份、4 份周备份；具体保留任务由服务器定时器执行。
- 至少复制一份到服务器之外，并加密保存。
- 每月至少在隔离数据库做一次真实恢复演练，记录耗时和结果。

## 8. 故障与回滚边界

如果恢复或验证失败，保持 nginx/backend 停止，对空的新卷重新执行恢复。不要在
部分恢复的库上继续修补。

`codestory_db_migrated_20260727.dump` 只在新库产生首批业务写入前是完整回滚点。
一旦开放访问并产生新数据，就不能直接回退到该 dump，否则会丢失切换后的提交。
开放访问前必须完成行数核对、迁移状态核对和主流程回归。

旧内网库凭据应在切换成功后立即轮换失效；归档不得提交到 Git 或发送到非受控位置。
