# CodeStory Docker 部署入门

这个项目部署时会启动 4 个容器：

- `frontend`: 前端 Next.js，容器内端口 `3001`。
- `backend`: 后端 Express，容器内端口 `4001`。
- `redis`: 后端用的缓存服务。
- `nginx`: 对外入口，占用服务器 `80` 端口，把网页请求转给前端，把 `/api/` 和 `/uploads/` 转给后端。

本项目的 PostgreSQL 数据库不在这台部署服务器上，而是在远程数据库服务器上，所以这里不需要再启动 PostgreSQL 容器。

## 1. 浏览器应该访问什么

浏览器访问的是你的部署服务器公网地址：

```text
http://你的服务器公网IP
```

不要在浏览器里使用 `http://backend:4001`。`backend` 这个名字只在 Docker 容器内部能用。

## 2. 把项目放到服务器

登录服务器后，先找一个目录放项目：

```bash
mkdir -p ~/apps
cd ~/apps
```

如果你会用 Git：

```bash
git clone 你的仓库地址 CodeStory
cd CodeStory
```

如果暂时不会 Git，就把整个项目文件夹上传到服务器的 `~/apps/CodeStory`。

## 3. 配置 .env

进入服务器上的项目根目录后执行：

```bash
cp .env.production.example .env
nano .env
```

至少要改这些值：

```env
DATABASE_URL=postgresql://数据库账号:数据库密码@老师数据库IP:5432/数据库名
NEXT_PUBLIC_API_BASE_URL=http://你的服务器公网IP
NEXT_PUBLIC_UPLOAD_PROXY_URL=http://你的服务器公网IP
JWT_SECRET=换成一串很长的随机字符串
EMAIL_USER=你的邮箱
EMAIL_PASS=你的邮箱授权码
```

如果你有域名，就把 `http://你的服务器公网IP` 换成你的域名。

## 4. 第一次启动

在项目根目录执行：

```bash
docker compose up -d --build
```

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

如果都正常，浏览器打开：

```text
http://你的服务器公网IP
```

## 5. 常用命令

停止项目：

```bash
docker compose down
```

重启项目：

```bash
docker compose restart
```

改代码后重新构建并启动：

```bash
docker compose up -d --build
```

只看后端日志：

```bash
docker compose logs -f backend
```

进入后端容器：

```bash
docker compose exec backend sh
```

## 6. 常见问题

如果页面能打开，但接口请求失败，先检查 `.env` 里的这两个值：

```env
NEXT_PUBLIC_API_BASE_URL=http://你的服务器公网IP
NEXT_PUBLIC_UPLOAD_PROXY_URL=http://你的服务器公网IP
```

如果后端日志提示数据库连接失败，检查：

- 老师数据库是否允许你的部署服务器 IP 访问。
- `DATABASE_URL` 的账号、密码、IP、端口、数据库名是否正确。
- 老师数据库服务器或云服务器防火墙是否放行 PostgreSQL 端口，一般是 `5432`。

如果浏览器打不开 `http://你的服务器公网IP`，检查：

- 云服务器安全组是否放行 `80` 端口。
- `docker compose ps` 里 `codestory-nginx` 是否正在运行。
- 服务器上是否已经有其他程序占用了 `80` 端口。
