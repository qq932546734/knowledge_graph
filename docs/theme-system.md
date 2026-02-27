# 主题系统（换皮）说明

## 目标

- 在不改业务逻辑的前提下提供两套可切换皮肤：
  - `fresh`：清爽青绿
  - `ocean`：海盐蓝橙
- 样式改造基于语义 Token，避免重复维护两份页面样式。

## 关键实现

- 主题配置与工具：`src/lib/theme.ts`
  - 主题枚举、合法性校验、默认主题、切换函数
  - 首屏主题初始化脚本（读取 `localStorage`，写入 `html[data-theme]`）
- 主题切换组件：`src/components/theme-toggle.tsx`
  - 登录页和 AppShell 顶部均可切换
  - 切换后持久化到 `localStorage`
- 全局 Token：`src/app/globals.css`
  - `:root[data-theme="fresh"]` / `:root[data-theme="ocean"]`
  - 语义色：`--primary`、`--surface`、`--muted`、`--border` 等
  - 语义组件类：`.panel`、`.panel-soft`、`.btn-primary`、`.btn-secondary`、`.input-field`、`.chip`
- 图谱联动：`src/app/graph/graph-client.tsx`
  - Cytoscape 颜色改为主题 map
  - 监听 `data-theme` 变化，切换皮肤时同步更新图谱样式

## 布局优化范围

- 顶层框架：`AppShell` 改为“信息层 + 控制层 + 导航层”的分层头部。
- 看板页：新增引导区（今日状态 + 快捷操作）并强化指标卡视觉层级。
- 列表页：筛选区与内容区解耦，补充空态提示与标签 chip 展示。
- 复习/训练页：增加说明文案、进度反馈与结构化卡片，提升阅读节奏。
- 知识点编辑页：补充页面引导、节点状态标识、标签预览与题目空态提示。
- 知识树页：增加树统计信息、层级浏览区块化、二级操作分组与抽屉交互统一。
- 图谱页：增强画布信息层、主题状态与难度图例，节点详情支持快捷跳转编辑/预览。
- 预览页：增加只读概览区、关系统计与题目分组样式，提升扫描效率。
- 备份页：强化导入操作顺序提示、token 状态可视化与预检摘要展示。
- 全局反馈：新增 `alert-error/alert-success/alert-warn`，统一错误与结果提示样式。
- 关系交互：树节点 hover/选中态与抽屉蒙层统一视觉反馈，减少编辑操作误触感。

## 微动效系统

- 动效 token 与关键帧位于 `src/app/globals.css`
  - `motion-fade-up`（页面区块进入）
  - `motion-fade-in`（遮罩淡入）
  - `motion-slide-in-right`（抽屉滑入）
- 语义动效类
  - `motion-enter` / `motion-enter-soft`
  - `motion-stagger`（对子元素按序渐入）
  - `drawer-mask` / `drawer-panel`
- 已接入范围
  - AppShell 头部与内容区进入动画
  - 主要业务页容器（`space-y-4`）的分段渐入
  - 知识树抽屉开启动画与蒙层淡入
  - 按钮按压反馈（active scale）与卡片轻浮起
- 可访问性
  - 对 `prefers-reduced-motion: reduce` 自动降级，禁用非必要动画与过渡。

## 使用方式

- 在已登录页面顶部点击主题切换按钮。
- 在登录页右上角也可提前选择主题。
- 主题会保存在浏览器本地，下次访问自动恢复。

## 扩展第三套主题

1. 在 `src/lib/theme.ts` 的 `THEMES` 中新增主题名。
2. 在 `src/app/globals.css` 增加对应 `[data-theme="..."]` 变量块。
3. 在 `src/components/theme-toggle.tsx` 补充展示文案。
4. 在 `src/app/graph/graph-client.tsx` 的 `GRAPH_PALETTES` 增加图谱配色。

## 测试

- 单测文件：`src/lib/theme.test.ts`
  - 覆盖主题名校验、默认回退、主题轮换、初始化脚本文本检查。
