# 算法知识图谱复习系统（V1）

基于 Next.js + TypeScript + Prisma + PostgreSQL 的单账号知识复习系统，覆盖知识管理、SM-2 复习、随机训练、图谱可视化与备份恢复。

## 功能范围

- 账号与安全
  - Auth.js Credentials 登录
  - bcrypt 密码哈希与强度校验
  - 登录失败限流（IP + email，15 分钟 5 次）
  - 会话 7 天、写接口 CSRF 防护
- 知识管理
  - 知识点 CRUD、软删除/恢复
  - 题目 CRUD
  - 知识树父子关系管理（单父 + 成环校验，默认浏览，按需抽屉新增）
  - 新增节点草稿自动保存与恢复（按父节点分桶）
  - 节点详情维护关联关系（RELATED 规范化）
- 复习与训练
  - SM-2 复习调度与 ReviewEvent 留痕
  - 今日到期队列（30 上限 + 排序 + 顺延）
  - 随机知识点复述
  - 随机面试题（80% 加权 + 20% 探索 + 冷启动）
- 可视化与备份
  - Cytoscape 图谱视图（支持触控拖拽、缩放、点选详情、移动端简化模式）
  - 备份导出
  - 备份导入预检（validationToken 10 分钟）
  - 全量覆盖导入（事务回滚）
- 界面与体验
  - 双主题换皮（清爽青绿 / 海盐蓝橙）
  - 全局设计 Token（语义色变量 + 页面统一风格）
  - 主题选择本地持久化（登录页与系统页均可切换）

## 项目结构

- `src/app` 页面与 API Route
- `src/components` UI 组件
- `src/lib` 公共工具
- `src/server` 业务逻辑、校验、算法、测试
- `prisma` 数据模型、迁移与 seed
- `e2e` Playwright 端到端测试
- `docs` 备份回滚与移动端测试说明

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

> 如果你在新机器上直接 `npm run dev` 后没有跳转到登录页，通常是因为缺少 `.env`（尤其是 `AUTH_SECRET` 与 `DATABASE_URL`）或数据库尚未初始化。请先完成下面第 3、4 步。

3. 迁移数据库并生成客户端

```bash
npm run prisma:migrate:dev
npm run prisma:generate
```

4. 初始化管理员账号

```bash
npm run db:seed
```

5. 启动开发环境

```bash
npm run dev
```

## 质量检查

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:e2e
npm run format:check
```

`test:e2e` 默认跳过；设置 `E2E_ENABLED=true` 后执行。

## 部署

- 本地容器启动

```bash
docker compose up -d db
./scripts/release.sh
```

- 烟雾测试

```bash
./scripts/smoke-test.sh http://localhost
```

- 参考文档
  - `docs/knowledge-tree.md`
  - `docs/backup-and-rollback.md`
  - `docs/mobile-test-report.md`
  - `docs/theme-system.md`

## 关键接口

- 节点/关系/题目
  - `POST /api/nodes`
  - `GET /api/nodes`
  - `GET /api/nodes/:id`
  - `PUT /api/nodes/:id`
  - `DELETE /api/nodes/:id`
  - `POST /api/nodes/:id/restore`
  - `POST /api/nodes/:id/relations`
  - `DELETE /api/relations/:id`
  - `POST /api/nodes/:id/questions`
  - `PUT /api/questions/:id`
  - `DELETE /api/questions/:id`
- 复习
  - `GET /api/review/due`
  - `POST /api/review/submit`
- 训练
  - `GET /api/practice/random-node`
  - `GET /api/practice/random-question`
  - `POST /api/practice/submit`
- 图谱
  - `GET /api/graph`
- 备份
  - `GET /api/backup/export`
  - `POST /api/backup/import/validate`
  - `POST /api/backup/import`
- 安全
  - `GET /api/security/csrf`
