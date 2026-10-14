# my-vibe-app · 个人作品集 + 留言板

Node.js 20 + Express + SQLite 的极简全栈应用，容器化部署到腾讯云 Lighthouse + Coolify。

## 功能

- **首页**：展示 3 个作品，移动端单列、桌面端三列
- **留言板**：访客提交留言后立即出现在列表顶部，无需刷新整页
- **校验**：留言超过 200 字返回 400 并给出提示
- **健康检查**：`GET /healthz` 返回 `200 {"status":"ok"}`

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 运行时 | Node.js 20 | alpine 基础镜像 |
| Web | Express 4 | 无前端框架，原生 HTML/CSS/JS |
| 存储 | better-sqlite3 | 单文件数据库，落在挂载卷 |
| 容器 | Docker 多阶段构建 | 非 root 运行，内置 HEALTHCHECK |

## 环境变量

见 `.env.example`：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务监听端口 |
| `HOST` | `0.0.0.0` | 监听地址（容器内必须是 0.0.0.0） |
| `SITE_NAME` | `我的作品集` | 页面标题与页头文案 |
| `DATA_DIR` | `/app/data` | 数据目录，配合卷挂载持久化 |

## 本地运行

```bash
npm install
cp .env.example .env
npm start
```

访问 http://localhost:3000

## Docker 运行

```bash
docker build -t my-vibe-app:latest .

docker run -d --name my-vibe-app \
  -p 127.0.0.1:3000:3000 \
  -v "$PWD/data:/app/data" \
  --restart unless-stopped \
  my-vibe-app:latest

curl -i http://127.0.0.1:3000/healthz
```

> `better-sqlite3` 是原生模块，Dockerfile 采用**多阶段构建**：构建阶段带编译工具链，运行阶段只保留产物，最终镜像不含 python/g++。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/healthz` | 健康检查 |
| `GET` | `/api/works` | 作品列表 |
| `GET` | `/api/messages` | 留言列表（最多 100 条，倒序） |
| `POST` | `/api/messages` | 提交留言，body：`{name, content}` |

## 部署到 Lighthouse + Coolify

1. 推送到 Git 仓库（GitHub / Gitea）
2. Coolify 面板 → New Resource → Application → 绑定仓库与 `main` 分支
3. 构建方式选 **Dockerfile**
4. 环境变量按 `.env.example` 逐条填入
5. 端口填 `3000`
6. 访问地址填 `http://43.142.76.225`（**不要填域名**，国内节点未备案会被拦截）
7. Deploy

> ⚠️ 纯 IP 访问无法申请 Let's Encrypt 证书，故 HTTPS 暂不可用。需要 HTTPS 须先完成 ICP 备案。

## 数据持久化

SQLite 文件落在 `DATA_DIR`（容器内 `/app/data`）。Coolify 里需配置卷映射到宿主机，否则容器重建会丢数据。

建议映射到 `/data/my-vibe-app`（Coolify 默认的持久化目录）。
