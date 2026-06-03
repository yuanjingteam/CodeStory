# CodeStory

一个基于 Next.js + Express + PostgreSQL 的在线编程学习平台。

## 🎯 项目简介

CodeStory 是一个现代化的在线编程教育平台，提供交互式编程练习、课程管理和用户学习进度追踪功能。

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 3
- **状态管理**: Zustand
- **编辑器**: Tiptap

### 后端
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: PostgreSQL 15 + Prisma ORM
- **缓存**: Redis 7
- **认证**: JWT + bcrypt
- **验证码**: svg-captcha

### 部署
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx

## ✨ 功能特性

### 用户功能
- 用户注册/登录/密码找回
- 个人资料管理（头像上传）
- 学习进度追踪
- 交互式编程练习

### 课程管理
- 课程创建与编辑
- 章节与课时管理
- 练习题目配置（选择题、代码题）
- 课程封面图片上传

### 学习体验
- 代码编辑器集成
- 实时练习反馈
- 提示系统
- 进度保存

## 📁 项目结构

```
CodeStory/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 业务逻辑
│   │   ├── routes/          # 路由配置
│   │   ├── middleware/      # 中间件
│   │   ├── config/          # 配置文件
│   │   ├── utils/           # 工具函数
│   │   └── types/           # 类型定义
│   ├── prisma/              # Prisma 配置
│   ├── uploads/             # 上传文件目录
│   └── package.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── app/             # Next.js 路由
│   │   ├── components/      # React 组件
│   │   ├── api/             # API 调用
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── store/           # 状态管理
│   │   ├── types/           # 类型定义
│   │   └── utils/           # 工具函数
│   └── package.json
├── nginx/                   # Nginx 配置
│   └── conf.d/
├── docker-compose.yml       # Docker Compose 配置
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 15.0
- Redis >= 7.0
- Docker (可选)

### 本地开发

#### 1. 安装依赖

```bash
# 后端
cd backend
pnpm install

# 前端
cd ../frontend
pnpm install
```

#### 2. 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=4001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/codepractice
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
```

#### 3. 数据库迁移

```bash
cd backend
npx prisma migrate dev
```

#### 4. 启动服务

```bash
# 启动后端 (端口 4001)
cd backend
pnpm run dev

# 启动前端 (端口 3001)
cd frontend
pnpm run dev
```

### Docker 部署

#### 开发环境

```bash
# 使用开发配置
docker-compose -f docker-compose.dev.yml up -d
```

#### 生产环境

```bash
# 使用生产配置
docker-compose up -d
```

**访问地址**:
- 前端: http://localhost
- 后端 API: http://localhost/api/

## 📡 API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/forgot-password` - 忘记密码
- `POST /api/auth/captcha` - 获取验证码

### 课程
- `GET /api/courses` - 获取课程列表
- `GET /api/courses/:id` - 获取课程详情
- `GET /api/lessons/:id` - 获取课时详情
- `POST /api/exercises/submit` - 提交练习

### 用户管理
- `GET /api/user-manage/users` - 获取用户列表
- `PUT /api/user-manage/users/:id` - 更新用户信息
- `DELETE /api/user-manage/users/:id` - 删除用户

### 课程管理
- `POST /api/course-manage/courses` - 创建课程
- `PUT /api/course-manage/courses/:id` - 更新课程
- `DELETE /api/course-manage/courses/:id` - 删除课程
- `POST /api/course-manage/chapters` - 创建章节
- `POST /api/course-manage/lessons` - 创建课时

## 🔧 开发指南

### 代码规范

- 使用 TypeScript 进行类型检查
- ESLint 进行代码风格检查
- 遵循 RESTful API 设计规范

### Git 工作流

1. Fork 仓库
2. 创建功能分支 `feature/xxx`
3. 提交代码
4. 创建 Pull Request

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件

---

**CodeStory** - 让编程学习更有趣！