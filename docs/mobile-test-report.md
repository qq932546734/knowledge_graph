# 移动端适配测试记录

## 目标断点

- 360px-430px 主流程页面

## 设备矩阵（Playwright 设备配置）

- iPhone SE
- iPhone 13
- Pixel 7

## 检查项

- 所有主按钮最小点击区域 >= 44x44
- 关键页面无横向滚动
- 输入框 focus 时可滚动到可见区域（scroll-margin-bottom）
- 图谱页简化模式默认在小屏启用

## 覆盖页面

- /login
- /dashboard
- /nodes
- /nodes/new
- /review
- /practice/node
- /practice/question
- /graph
