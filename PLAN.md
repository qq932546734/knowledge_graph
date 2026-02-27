# 算法知识图谱复习系统 V1 方案

## 1. 项目目标

打造一个面向个人学习的 Web 系统，解决“算法知识学后易忘”的问题，形成完整学习闭环：

1. 知识体系化管理：用知识图谱组织知识点（父子 + 关联）。
2. 间隔复习：依据 SM-2 算法安排下一次复习时间。
3. 随机训练：随机抽知识点复述、随机抽面试题作答。
4. 历史留痕：记录复习与训练事件，支撑复盘和统计。

## 2. 核心范围（V1 一次到位）

### 2.1 In Scope

1. 单账号登录（你本人使用）。
2. 知识点 CRUD（Markdown 正文 + 标签 + 难度 + 来源）。
3. 关系管理：知识树父子关系、节点关联关系。
4. 两种图谱视图：
   - 知识树管理视图（父子）
   - 可视化关系图视图
5. 复习系统：
   - SM-2 调度
   - 今日到期队列
   - 复习评分 0-5
6. 随机训练：
   - 随机知识点复述
   - 随机面试题作答
   - 自评分记录
7. 统计看板（基础指标）。
8. 备份恢复：JSON 导出/导入（全量覆盖）。

### 2.2 Out of Scope

1. 多用户协作。
2. AI 自动生成题目/自动判分。
3. 邮件或浏览器推送提醒。
4. 离线能力。
5. 多格式批量导入（CSV 等）。

## 3. 技术方案

1. 前端/后端：Next.js（App Router，全栈）。
2. 语言：TypeScript。
3. 数据库：PostgreSQL。
4. ORM：Prisma。
5. 认证：Auth.js（Credentials）。
6. 可视化图谱：Cytoscape.js。
7. Markdown 渲染：react-markdown。
8. 部署：云主机自部署（Docker Compose + Nginx）。

## 4. 数据模型（核心实体）

### 4.1 User

- id
- email
- passwordHash
- createdAt

### 4.2 KnowledgeNode

- id
- userId
- title
- contentMd
- tags (string[])
- difficulty (1-5)
- sourceUrl (nullable)
- lastReviewedAt (nullable)
- nextReviewAt (nullable)
- sm2EF (default 2.5)
- sm2Repetition (default 0)
- sm2IntervalDays (default 0)
- deletedAt (nullable, 软删除)
- createdAt
- updatedAt

### 4.3 NodeRelation

- id
- userId
- fromNodeId
- toNodeId
- relationType (`PARENT_CHILD` | `RELATED`)
- deletedAt (nullable)
- createdAt

### 4.4 InterviewQuestion

- id
- userId
- nodeId
- question
- referenceAnswerMd
- deletedAt (nullable)
- createdAt
- updatedAt

### 4.5 ReviewEvent

- id
- userId
- nodeId
- reviewedAt
- quality (0-5)
- efBefore
- efAfter
- intervalBefore
- intervalAfter
- nextReviewAt

### 4.6 PracticeEvent

- id
- userId
- mode (`NODE_RECALL` | `QUESTION_ANSWER`)
- nodeId
- questionId (nullable)
- answeredAt
- selfScore (1-5)
- note (nullable)

## 5. 关键业务规则

### 5.1 关系规则

1. 父子关系为有向无环结构，且单父（每个子节点最多一个有效父节点）。
2. 仅对未删除节点做成环校验。
3. 对未删除父子关系执行单父校验（创建 / 恢复 / 导入）。
4. `RELATED` 关系去重。
5. 方向语义固定：
   - `PARENT_CHILD` 中 `fromNodeId = parentId`，`toNodeId = childId`。
6. 基础约束：
   - `fromNodeId != toNodeId`。
   - 两端节点都必须属于当前 user 且未软删除。
7. `RELATED` 关系标准化：
   - 写入前将 `(a,b)` 标准化为 `(min(a,b), max(a,b))`。
   - 数据库唯一索引：`(userId, relationType, fromNodeId, toNodeId, deletedAt IS NULL)`。
8. 同一对节点不允许同时存在两条相同类型的有效关系（软删除记录不计）。

### 5.2 删除与恢复

1. 节点采用软删除。
2. 删除节点后，关系和题目对前台隐藏。
3. 复习历史与训练历史保留。
4. 恢复节点时，一并恢复其关系和题目；恢复前再次做 DAG + 单父校验。

### 5.3 复习规则（SM-2）

1. 使用 0-5 分评分。
2. `quality < 3`：
   - repetition 重置为 0
   - interval 设为 1 天
3. `quality >= 3`：
   - repetition +1
   - 第 1 次 interval=1，第 2 次 interval=6，之后 `round(interval * EF)`
4. EF 更新公式：
   - `EF' = max(1.3, EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))`
5. 逾期补做：按本次评分重算，不做额外惩罚。
6. 新知识点节奏：
   - 创建当天安排 1 次复习
   - 次日安排 1 次复习
   - 若当天首轮评分 <3，当天追加 1 次（默认 4 小时后）
7. 主观信心评分锚点（降低评分漂移）：
   - 0：完全想不起来，无法展开回答。
   - 1：仅有模糊印象，关键概念大多缺失。
   - 2：能回忆少量关键点，但逻辑不完整、错误较多。
   - 3：能说出主干思路，但细节不稳，需要提示。
   - 4：基本完整且正确，细节偶有遗漏。
   - 5：无需提示即可完整、准确、结构化复述。

### 5.4 到期队列规则

1. 每日处理上限 30 个。
2. 超限项自动顺延到次日，并保持逾期状态。
3. 排序优先级：
   - 逾期天数降序
   - 上次评分升序
   - nextReviewAt 升序
   - createdAt 升序
4. 学习日切：按本地时区 00:00。
5. 顺延实现方式：
   - 不修改超限节点的 `nextReviewAt`。
   - 每日仅从“当前已到期集合”中取前 30 条作为执行队列，其余自然在次日继续保持逾期并参与排序。
6. 新节点无历史评分时：
   - 排序中的“上次评分”按 `-1` 处理（优先于 0-5），确保新节点首轮复习不会被挤压。
7. “上次评分”取值来源：
   - 取该节点最新一条 `ReviewEvent.quality`。
   - 若无复习历史，按规则 6 视为 `-1`。

### 5.5 随机训练规则

1. 知识点随机：抽节点 -> 自述 -> 自评分 -> 记录。
2. 面试题随机：抽题 -> 作答 -> 看参考答案 -> 自评分 -> 记录。
3. 题目抽样策略：
   - 80% 加权随机 + 20% 纯随机探索
   - 权重：`0.75*weakness + 0.25*stale`
   - `weakness = (5-avgSelfScore)/4`（无历史按 0.5）
   - `stale = min(daysSinceLastPractice/14,1)`（无历史按 1）
4. 冷启动：题目历史覆盖率 <30% 时，先纯随机。
5. 统计窗口：
   - `avgSelfScore` 取该题目最近 5 次且最近 60 天内练习记录；不足 5 次则用现有记录。
   - `daysSinceLastPractice` 取该题目最近一次 `answeredAt` 到当前时间的天数。
6. 权重下限：
   - 为避免题目永远抽不到，最终 `weight = max(weight, 0.05)`。

### 5.6 标签治理

1. 采用受控词表 + 可新增。
2. 新标签需确认加入词表，避免同义词碎片化。

### 5.7 看板指标口径

1. `todayDueCount`：
   - `nextReviewAt < 今日结束时间` 且节点未删除的数量。
2. `todayDoneCount`：
   - 当地日内产生的 `ReviewEvent` 数量。
3. `streakDays`（连续天数）：
   - 从今天向前连续统计“每天 `todayDoneCount >= 1`”的天数。
4. `weakTagsTopN`：
   - 节点弱项分：`nodeWeakness = (5 - avgLast3Quality) / 5`，其中 `avgLast3Quality` 为最近 3 次复习均分；无记录按 `2.5`。
   - 标签分：`tagWeakness = avg(nodeWeakness)`，按包含该标签的节点做简单平均（每节点等权）。
   - 样本门槛：仅统计 `sampleCount >= 3` 的标签，避免噪声。
   - 输出：按 `tagWeakness` 降序取前 5，返回 `tagName, tagWeakness, sampleCount`。

## 6. API 规划

1. `POST /api/auth/login`
2. `POST /api/auth/logout`
3. `GET /api/nodes`
4. `POST /api/nodes`
5. `GET /api/nodes/:id`
6. `PUT /api/nodes/:id`
7. `DELETE /api/nodes/:id`（软删除）
8. `POST /api/nodes/:id/restore`
9. `POST /api/nodes/:id/relations`
10. `DELETE /api/relations/:id`
11. `POST /api/nodes/:id/questions`
12. `PUT /api/questions/:id`
13. `DELETE /api/questions/:id`
14. `GET /api/review/due`
15. `POST /api/review/submit`
16. `GET /api/practice/random-node`
17. `GET /api/practice/random-question`
18. `POST /api/practice/submit`
19. `GET /api/dashboard/summary`
20. `GET /api/backup/export`
21. `POST /api/backup/import`
22. `POST /api/backup/import/validate`

### 6.1 API 通用约定

1. 响应结构统一：
   - 成功：`{ "data": ..., "meta": ... }`
   - 失败：`{ "error": { "code": "...", "message": "...", "details": ... } }`
2. 列表分页参数：
   - `page` 默认 1
   - `pageSize` 默认 20，最大 100
3. 时间字段统一 ISO 8601（UTC 存储，前端按本地时区展示）。
4. 所有写接口要求登录态，且 userId 从会话注入，不接受客户端透传。

### 6.2 关键接口请求/响应字段

1. `GET /api/nodes`
   - request query:
     - `page?`, `pageSize?`
     - `q?`（模糊匹配 `title + contentMd`）
     - `tags?`（逗号分隔，默认“任一匹配”）
     - `difficultyMin?`, `difficultyMax?`
     - `dueOnly?`（`true` 时仅返回 `nextReviewAt <= now` 且未删除节点）
     - `includeDeleted?`（默认 `false`）
     - `sortBy?`（`updatedAt | createdAt | nextReviewAt | title`，默认 `updatedAt`）
     - `sortOrder?`（`asc | desc`，默认 `desc`）
   - response: `{ data: { items }, meta: { total, page, pageSize } }`
2. `POST /api/nodes`
   - request: `{ title, contentMd, tags, difficulty, sourceUrl }`
   - response: `{ data: { node } }`
3. `PUT /api/nodes/:id`
   - request: `{ title?, contentMd?, tags?, difficulty?, sourceUrl? }`
   - response: `{ data: { node } }`
4. `POST /api/review/submit`
   - request: `{ nodeId, quality }`
   - response: `{ data: { reviewEvent, node: { lastReviewedAt, nextReviewAt, sm2EF, sm2Repetition, sm2IntervalDays } } }`
5. `GET /api/review/due`
   - request query: `{ page?, pageSize? }`
   - response: `{ data: { items }, meta: { total, page, pageSize } }`
6. `POST /api/practice/submit`
   - request: `{ mode, nodeId, questionId?, selfScore, note? }`
   - response: `{ data: { practiceEvent } }`
7. `POST /api/backup/import/validate`
   - request: `multipart/form-data`，字段 `file`
   - response: `{ data: { valid, schemaVersion, previewCounts, warnings, errors, validationToken } }`
   - 说明：仅预检，不写库；`validationToken` 默认 10 分钟有效。
8. `POST /api/backup/import`
   - request: `multipart/form-data`，字段 `file`
   - response: `{ data: { importedCounts, schemaVersion } }`
   - 说明：若传 `validationToken`，服务端校验 token 后跳过重复预检并执行正式导入。

### 6.3 错误码约定

1. `AUTH_REQUIRED`：未登录或会话失效。
2. `AUTH_INVALID_CREDENTIALS`：账号或密码错误。
3. `AUTH_RATE_LIMITED`：登录尝试过频。
4. `VALIDATION_ERROR`：参数校验失败。
5. `NODE_NOT_FOUND`：节点不存在或不可访问。
6. `RELATION_CYCLE_DETECTED`：父子关系成环。
7. `RELATION_DUPLICATE`：关系重复。
8. `IMPORT_SCHEMA_UNSUPPORTED`：导入版本不支持。
9. `IMPORT_VALIDATION_FAILED`：导入数据结构/引用校验失败。
10. `IMPORT_TOKEN_INVALID`：导入预检 token 无效或已过期。
11. `INTERNAL_ERROR`：服务端未知错误。

## 7. 导入/导出设计

### 7.1 导出

1. 导出为单个 JSON。
2. 内容包含：
   - meta（schemaVersion, exportedAt）
   - nodes
   - relations
   - questions
   - reviewEvents
   - practiceEvents
   - tagVocabulary

### 7.2 导入（全量覆盖）

1. 导入前展示风险提示（会覆盖当前数据）。
2. 二次确认后执行。
3. 后端在一个事务内执行：
   - 校验版本、字段、引用完整性、DAG 约束
   - 清空当前用户数据
   - 批量写入导入数据
   - 完整性复检
4. 任一步失败则整批回滚，原数据不变。

### 7.3 导入预检（Dry Run）

1. 客户端先调用 `POST /api/backup/import/validate` 上传文件。
2. 服务端返回：
   - `previewCounts`（各类实体数量）
   - `warnings`（可导入但有风险）
   - `errors`（阻断导入）
   - `validationToken`（预检通过时签发）
3. 只有 `valid=true` 才允许进入正式导入确认流程。

### 7.4 版本与 ID 策略

1. `schemaVersion` 固定为语义化版本，V1 首发为 `1.0.0`。
2. 导入支持策略：
   - 仅接受 `major` 相同版本（`1.x.x`）。
   - `major` 不同直接拒绝导入。
3. ID 处理策略：
   - 采用 UUID，导入时保留原始 ID，不重建。
   - 因为是全量覆盖导入，不存在与本地存量数据主键冲突问题。

## 8. 手机 Web 适配（硬性要求）

1. 移动优先设计，先覆盖 `360-430px` 宽度。
2. 兼容基线：
   - iOS Safari 最近 2 个大版本
   - Android Chrome 最近 2 个大版本
3. 核心流程必须单手可完成：
   - 登录
   - 今日复习
   - 打分提交
   - 随机抽题
   - 查看参考答案
   - 自评分记录
4. 图谱视图必须支持触控拖拽/缩放，并提供“切换到列表视图”入口。
5. 不允许关键页面出现横向滚动。
6. 表单输入时需处理键盘遮挡主操作按钮的问题。
7. 验收必须包含真实手机浏览器测试，不仅依赖桌面模拟器。
8. 交互可用性阈值：
   - 可点击区域最小 `44x44px`。
   - 主要操作按钮在常见输入法弹起后仍可见或可滚动到可见区。
9. 性能阈值（移动 4G 常规网络）：
   - Dashboard 首屏 LCP <= 2.5s。
   - 主要页面 CLS <= 0.1。
   - 图谱视图在 300 节点规模下拖拽缩放无明显卡顿（目标 >= 30 FPS）。
10. 真机验收矩阵（最低）：
   - iPhone SE 2（Safari，最新大版本与次新大版本）。
   - iPhone 13（Safari，最新大版本与次新大版本）。
   - Pixel 7（Chrome，最新大版本与次新大版本）。

## 9. 安全与稳定性

1. 密码哈希（bcrypt）。
2. 登录限流（防暴力破解）。
3. CSRF 防护。
4. 会话有效期 7 天。
5. 所有写操作返回明确错误码与人类可读提示。
6. 导入失败必须可定位到具体记录与原因。
7. 登录限流细则：
   - 按 `IP + email` 维度，15 分钟内最多 5 次失败尝试。
8. Cookie 安全属性：
   - `HttpOnly`, `Secure`, `SameSite=Lax`。

## 10. 测试与验收

### 10.1 单元测试

1. SM-2 算法计算。
2. DAG 成环检测与恢复校验。
3. 随机加权抽样逻辑。

### 10.2 集成测试

1. 节点/关系/题目 CRUD。
2. 软删除与恢复链路。
3. 到期队列的上限、排序、顺延。
4. 导出-导入一致性。
5. 导入版本不兼容时正确拒绝并返回错误码。

### 10.3 E2E 测试

1. 登录 -> 新建知识点 -> 建关系 -> 到期复习 -> 看板更新。
2. 随机题 -> 作答 -> 看参考答案 -> 自评分 -> 历史可查。
3. 删除节点 -> 恢复 -> 图谱与列表一致。
4. 手机端实测完整流程可完成。

## 11. 实施里程碑（3-4 周）

1. 第 1 阶段（3-4 天）：项目骨架、鉴权、数据库模型。
2. 第 2 阶段（5-6 天）：知识点/关系/题目管理、软删除恢复。
3. 第 3 阶段（4-5 天）：SM-2 复习引擎、到期队列机制。
4. 第 4 阶段（3-4 天）：随机训练、统计看板。
5. 第 5 阶段（3-4 天）：图谱可视化、导入导出、测试、部署。

## 12. 当前默认约定

1. 中文界面优先。
2. 单账号使用，但数据表保留 userId 扩展位。
3. 修改知识点内容默认不自动重置复习节奏（后续可配置）。
