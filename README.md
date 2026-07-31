# CodeStory

CodeStory 是一个面向编程学习场景的全栈教学平台，包含课程学习、交互式练习、学习进度、AI 学习助手，以及面向管理员的课程内容和用户管理能力。

## 功能概览

### 学习端

- 邮箱注册、登录、验证码、找回密码与登录状态恢复
- Access Token + Refresh Token 双 Token 认证，使用 Redis 管理会话与刷新轮换
- 课程浏览、章节与小节学习、课程进度记录
- 选择题与 Python 编程题练习、答案提交和结果反馈
- 分级提示、选择题解析与代码作答记录
- 基于课程、小节和练习上下文的 AI 对话，支持流式回答与历史消息恢复

### 管理端

- 用户查询、编辑、软删除与恢复
- 课程、章节、小节和练习的创建、编辑与删除
- 基于 Tiptap 的富文本课程内容编辑
- 课程封面与用户头像上传，支持本地存储或阿里云 OSS

## 技术栈

| 层级 | 主要技术 |
| --- | --- |
| 前端 | Next.js 16、React 19、TypeScript 5、Tailwind CSS 4 |
| 编辑与交互 | Tiptap 3、CodeMirror 6、Zustand 5、Axios |
| 后端 | Express 5、TypeScript、Prisma 6 |
| 数据与会话 | PostgreSQL 16、Redis 7、JWT、bcrypt |
| AI | LangChain、SiliconFlow OpenAI 兼容接口、DeepSeek / Qwen Embedding |
| 文件存储 | 本地上传目录、阿里云 OSS |
| 部署 | Docker、Docker Compose、Nginx |

## 项目结构

~~~text
CodeStory/
├─ frontend/                 # Next.js 前端
│  ├─ src/app/               # App Router 页面与路由
│  ├─ src/components/        # 页面组件、编辑器和通用组件
│  ├─ src/api/               # API 客户端
│  ├─ src/hooks/             # 自定义 Hooks
│  ├─ src/store/             # Zustand 状态
│  └─ src/utils/             # 请求、认证等工具
├─ backend/                  # Express API
│  ├─ src/controllers/       # 请求处理
│  ├─ src/services/          # 业务逻辑
│  ├─ src/routes/            # API 路由
│  ├─ src/middleware/        # 认证、上传与错误处理
│  ├─ src/config/            # 数据库、Redis、AI、OSS 等配置
│  └─ prisma/                # Prisma Schema 与迁移
├─ docs/                     # 开发、认证、AI 与部署文档
├─ nginx/                    # Nginx 反向代理配置
├─ docker-compose.dev.yml    # 本地 PostgreSQL 与 Redis
└─ docker-compose.yml        # 生产容器编排
~~~

## 本地开发

### 1. 环境要求

- Node.js 22（Docker 镜像使用 Node.js 22）
- pnpm 10
- Docker 与 Docker Compose（推荐用于启动 PostgreSQL 和 Redis）

### 2. 安装依赖

前后端使用独立的依赖锁文件，需要分别安装：

~~~bash
cd backend
pnpm install

cd ../frontend
pnpm install
~~~

### 3. 启动 PostgreSQL 和 Redis

开发编排只启动基础设施，不会启动前后端应用：

~~~bash
docker compose -f docker-compose.dev.yml up -d
~~~

默认连接信息：

| 服务 | 地址 | 默认账号 |
| --- | --- | --- |
| PostgreSQL | localhost:55432/codestory | postgres / devpass |
| Redis | redis://localhost:6379 | 无 |

可通过根目录环境变量 POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_DB、POSTGRES_PORT 和 REDIS_PORT 覆盖默认值。

### 4. 配置环境变量

在 backend/.env 中配置后端：

~~~env
NODE_ENV=development
PORT=4001

DATABASE_URL=postgresql://postgres:devpass@localhost:55432/codestory
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:3001

JWT_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_SECRET=replace-with-another-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-third-long-random-secret

# 邮箱验证码与找回密码需要
EMAIL_USER=
EMAIL_PASS=

# AI 助手需要；当前使用 SiliconFlow OpenAI 兼容端点
AI_API_KEY=
AI_MODEL=deepseek-ai/DeepSeek-V4-Flash
AI_BASE_URL=https://api.siliconflow.cn/v1
AI_TIMEOUT_MS=30000
AI_MAX_TOKENS=1000
AI_TUTOR_PROMPT_VERSION=grounded-v3
AI_EMBEDDING_MODEL=Qwen/Qwen3-Embedding-4B
AI_EMBEDDING_DIMENSIONS=1024
AI_RAG_ENABLED=false
CONTENT_RETENTION_DAYS=30
CONTENT_PURGE_ENABLED=false

# 可选；不配置时文件保存到 backend/uploads
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_DOMAIN=
~~~

在 frontend/.env.local 中配置浏览器访问的后端地址：

~~~env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4001
NEXT_PUBLIC_UPLOAD_PROXY_URL=http://localhost:4001
~~~

不要提交环境文件或任何真实密钥。

### 5. 初始化数据库

~~~bash
cd backend
pnpm exec prisma generate
pnpm exec prisma migrate dev
~~~

### 6. 启动应用

分别打开两个终端：

~~~bash
# 终端 1：API，http://localhost:4001
cd backend
pnpm dev
~~~

~~~bash
# 终端 2：Web，http://localhost:3001
cd frontend
pnpm dev --port 3001
~~~

API 基础地址为 http://localhost:4001/api/v1。

## 常用命令

以下命令需要在对应的应用目录中执行：

| 目录 | 命令 | 说明 |
| --- | --- | --- |
| frontend | pnpm dev | 启动 Next.js 开发服务器 |
| frontend | pnpm check | 依次执行 TypeScript 检查和 ESLint |
| frontend | pnpm build | 构建生产版本 |
| backend | pnpm dev | 启动 Express 开发服务器 |
| backend | pnpm build | 编译 TypeScript |
| backend | pnpm check:auth | 执行认证会话检查，需要完整的数据库、Redis、JWT 与 API 环境 |
| backend | pnpm check | 编译后执行全部认证检查 |

## API 概览

所有业务 API 均使用 /api/v1 前缀：

| 前缀 | 用途 | 权限 |
| --- | --- | --- |
| /api/v1/auth | 注册、登录、刷新、退出、验证码、当前用户 | 部分公开 |
| /api/v1/home | 首页课程与学习数据 | 部分公开 |
| /api/v1/courses | 课程列表与详情 | 列表公开，详情需登录 |
| /api/v1/chapter/lesson | 小节内容 | 登录用户 |
| /api/v1/exercises | 练习详情、提交、提示与解析 | 登录用户 |
| /api/v1/ai | AI 对话历史与流式对话 | 登录用户 |
| /api/v1/profile | 个人资料、头像与学习中的课程 | 登录用户 |
| /api/v1/admin/* | 用户、课程、章节与小节管理 | 管理员 |

上传文件通过 /uploads/* 访问。详细行为以 backend/src/routes、backend/src/controllers 与 backend/src/services 中的实现为准。

## Docker 部署

生产编排包含 frontend、backend、PostgreSQL 和 Redis。frontend 与 backend 仅映射到
宿主机回环地址，由宿主机 Nginx 统一处理域名、HTTPS 和公网流量。

~~~bash
# 1. 创建并填写生产环境变量
cp .env.production.example .env

# 2. 构建镜像
docker compose build

# 3. 应用数据库迁移
docker compose run --rm backend pnpm exec prisma migrate deploy

# 4. 启动服务
docker compose up -d
~~~

将 nginx/conf.d/default.conf 安装到宿主机 Nginx，并检查配置后重新加载：

~~~bash
sudo cp nginx/conf.d/default.conf /etc/nginx/conf.d/codestory.conf
sudo nginx -t
sudo systemctl reload nginx
~~~

课程、章节、小节和题目使用 30 天软删除。开发环境默认不自动清理；
生产环境可设置 `CONTENT_PURGE_ENABLED=true`。过期且没有学习进度、答题、
代码提交或聊天记录的内容才会永久删除；存在学习记录的内容会继续归档。
可先执行 `pnpm run content:cleanup` 查看 dry-run，再用
`pnpm run content:cleanup -- --execute` 手动清理。

容器端口只监听 `127.0.0.1:3001` 和 `127.0.0.1:4001`，不会绕过宿主机
Nginx 直接暴露到公网。正式部署时应按实际域名修改 Nginx 的 `server_name` 并配置 HTTPS。

常用运维命令：

~~~bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
~~~

更详细的部署说明见 [Docker 部署入门](./docs/DEPLOY_DOCKER.md)。

## 相关文档

- [开发文档 V1.1](./docs/CodeStory_开发文档_V1.1.md)
- [前端设计规范](./docs/CodeStory_前端设计规范.md)
- [Docker 部署入门](./docs/DEPLOY_DOCKER.md)
- [双 Token 认证契约（已过时）](./docs/CodeStory_双Token认证契约_V1.md)
- [双 Token 与草稿验收清单（已过时）](./docs/CodeStory_双Token与草稿验收清单.md)
- [AI 助手模块需求（已过时）](./docs/CodeStory_AI助手模块需求文档_V1.0.md)
- [AI 助手开发路线（已过时）](./docs/CodeStory_AI助手_V1开发路线.md)
- [AI 助手验收清单（已过时）](./docs/CodeStory_AI助手_V1验收清单.md)

## 贡献约定

- 使用 TypeScript 和项目现有代码风格，保持两空格缩进与分号。
- 前端改动提交前运行 pnpm check，后端至少运行 pnpm build。
- Commit 使用英文 Conventional Commit 类型和简洁中文描述，例如 feat: 增加课程搜索功能。
- 不要提交环境文件、密钥、上传文件、数据库备份或构建产物。
