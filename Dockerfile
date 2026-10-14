# ============================================================
# 个人作品集 + 留言板 · 容器构建定义
# 要点：多阶段构建（编译原生模块）· alpine 精简镜像 · 非 root 运行 · 健康检查
# 说明：better-sqlite3 是原生模块，需在构建阶段编译，运行阶段只保留产物
# ============================================================

# ---------- 阶段 1：安装依赖（含原生模块编译） ----------
FROM node:20-alpine AS deps

# better-sqlite3 在 alpine 上需要编译工具链
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# ---------- 阶段 2：运行时 ----------
FROM node:20-alpine

# 创建非 root 运行用户
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# 复用上一阶段编译好的依赖
COPY --from=deps /app/node_modules ./node_modules

# 再复制源码
COPY . .

# 数据目录（配合卷挂载持久化）
RUN mkdir -p /app/data && chown -R app:app /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

USER app

EXPOSE 3000

# 健康检查：与应用内的 /healthz 路由配合
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
