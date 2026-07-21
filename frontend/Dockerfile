# 准备 Node 环境 -> 安装依赖 -> 读取前端接口地址 -> 构建 Next.js -> 启动前端服务
FROM node:22-alpine

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_UPLOAD_PROXY_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_UPLOAD_PROXY_URL=$NEXT_PUBLIC_UPLOAD_PROXY_URL

WORKDIR /app

RUN npm install -g pnpm@10.23.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install

COPY . .

RUN pnpm build

EXPOSE 3001

CMD ["pnpm", "start"]

