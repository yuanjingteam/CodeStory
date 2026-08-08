# syntax=docker/dockerfile:1
# 这个文件做的事情就是 准备 Node 环境 -> 安装依赖 -> 生成 Prisma -> 编译后端 -> 启动 Express 服务
FROM node:22-alpine

ARG NPM_REGISTRY=https://registry.npmmirror.com

ENV npm_config_registry=$NPM_REGISTRY

WORKDIR /app

RUN npm install --global pnpm@10.33.2 --registry=$NPM_REGISTRY

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY prisma ./prisma

RUN pnpm exec prisma generate

COPY . .

RUN pnpm build

RUN mkdir -p dist/generated && cp -R src/generated/prisma dist/generated/prisma

EXPOSE 4001

CMD ["pnpm", "start"]
