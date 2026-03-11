# 后端 Dockerfile - 生产环境
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖
RUN npm ci

# 复制源代码
COPY . .

# 编译 TypeScript
RUN npm run build

# 生产镜像
FROM node:18-alpine

WORKDIR /app

# 安装时区数据
RUN apk add --no-cache tzdata

# 从构建阶段复制编译产物和依赖
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src/database/migrations ./src/database/migrations
COPY --from=builder /app/src/services/qrcode ./src/services/qrcode/
COPY --from=builder /app/src/services/qrcode.js ./src/services/qrcode.js 2>/dev/null || true

# 设置时区
ENV TZ=Asia/Shanghai
ENV NODE_ENV=production

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:8080/api/health || exit 1

# 启动服务
CMD ["node", "dist/server.js"]
