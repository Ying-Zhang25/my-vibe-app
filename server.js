/**
 * 个人作品集 + 留言板
 * Node.js 20 + Express + SQLite（better-sqlite3）
 * 数据文件路径由环境变量 DATA_DIR 控制，便于挂载持久化卷。
 */
'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SITE_NAME = process.env.SITE_NAME || '我的作品集';
const MAX_MESSAGE_LEN = 200;

// ---------- 数据层 ----------
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

const listMessages = db.prepare(
  'SELECT id, name, content, created_at FROM messages ORDER BY id DESC LIMIT 100'
);
const insertMessage = db.prepare(
  'INSERT INTO messages (name, content) VALUES (?, ?)'
);
const countMessages = db.prepare('SELECT COUNT(*) AS n FROM messages');

// ---------- 作品数据 ----------
const works = [
  {
    title: '云端部署实践',
    desc: '用 Docker 把服务搬到轻量应用服务器，打通从本地到公网的完整链路。',
    tag: 'DevOps'
  },
  {
    title: '数据看板',
    desc: '把零散的数据整理成一眼能看懂的图表，重点在信息层级而非花哨动效。',
    tag: '可视化'
  },
  {
    title: '这个留言板',
    desc: '本站本身。Express + SQLite，容器化运行，数据落在挂载卷里。',
    tag: '全栈'
  }
];

// ---------- Web 层 ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// 健康检查：供容器 HEALTHCHECK 与外部探活使用
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/works', (req, res) => {
  res.json({ site: SITE_NAME, works });
});

app.get('/api/messages', (req, res) => {
  const rows = listMessages.all();
  res.json({ count: rows.length, messages: rows });
});

app.post('/api/messages', (req, res) => {
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const rawContent = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

  if (!rawContent) {
    return res.status(400).json({ error: '留言内容不能为空' });
  }
  if (rawContent.length > MAX_MESSAGE_LEN) {
    return res.status(400).json({ error: `留言不能超过 ${MAX_MESSAGE_LEN} 字` });
  }

  const name = (rawName || '匿名访客').slice(0, 40);
  const info = insertMessage.run(name, rawContent);
  const created = db
    .prepare('SELECT id, name, content, created_at FROM messages WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json(created);
});

// API 404 兜底（静态资源之外）
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

const server = app.listen(PORT, HOST, () => {
  const total = countMessages.get().n;
  console.log(`[${SITE_NAME}] listening on http://${HOST}:${PORT}`);
  console.log(`  数据目录: ${DATA_DIR}（已有 ${total} 条留言）`);
});

// 优雅退出，便于容器平滑重启
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`收到 ${sig}，正在关闭……`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
