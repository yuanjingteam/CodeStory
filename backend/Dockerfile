# 这个文件做的事情就是 准备 Node 环境 -> 安装依赖 -> 生成 Prisma -> 编译后端 -> 启动 Express 服务
FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@10.23.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN pnpm build

RUN mkdir -p dist/generated && cp -R src/generated/prisma dist/generated/prisma

EXPOSE 4001

CMD ["pnpm", "start"]
