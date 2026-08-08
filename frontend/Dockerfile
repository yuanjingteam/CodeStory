# syntax=docker/dockerfile:1
# 准备 Node 环境 -> 安装依赖 -> 读取前端接口地址 -> 构建 Next.js -> 启动前端服务
FROM node:22-alpine

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_UPLOAD_PROXY_URL
ARG NPM_REGISTRY=https://registry.npmmirror.com

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_UPLOAD_PROXY_URL=$NEXT_PUBLIC_UPLOAD_PROXY_URL
ENV npm_config_registry=$NPM_REGISTRY

WORKDIR /app

RUN npm install --global pnpm@10.33.2 --registry=$NPM_REGISTRY

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN --mount=type=cache,target=/app/.next/cache \
    pnpm build

EXPOSE 3001

CMD ["pnpm", "start"]
