# Dashboard 重点关注小区导航设计

日期：2026-04-05

## 1. 目标

修复首页左侧导航里“重点关注小区”点击无反应的问题，并把它补成一个可用的单页导航入口。

本次改动目标：

- 让左侧“重点关注小区”点击后有明确页面反馈
- 在 Dashboard 中新增“重点关注小区”专区
- 复用当前真实数据链路展示监控小区摘要
- 保持当前单页 SaaS 看板结构，不引入新路由

## 2. 当前现状

- `site/src/components/dashboard/Sidebar.tsx` 中菜单项当前使用 `href="#"` 占位
- `site/src/App.tsx` 目前只有 KPI、图表区、榜单、时间线，没有“重点关注小区”专区
- `site/src/lib/dashboard-view.ts` 已能从真实数据构建首页视图模型，但没有面向“小区摘要卡片”的输出结构

因此当前根因不是样式或事件失效，而是导航目标和目标内容都不存在。

## 3. 设计结论

采用“单页锚点导航 + 真实数据驱动的小区专区”方案。

### 3.1 导航行为

- Sidebar 菜单使用真实锚点而不是 `#`
- “首页”指向概览区
- “重点关注小区”指向新增专区
- 侧边栏根据当前 hash 显示激活态

### 3.2 新增专区

在图表区与底部榜单之间新增“重点关注小区”区块，展示每个监控小区的摘要卡片。

每张卡片展示：

- 小区名
- 区域
- 主监控户型
- 最新挂牌中位价
- 最新挂牌套数
- 最新结论
- 监控状态

### 3.3 数据来源

基于现有真实数据构建，不新增后端接口：

- `data/config/communities.json`
- `data/config/segments.json`
- `data/reports/*.json`
- `data/series/communities/*/*.json`

优先使用 `latestReport` 中该小区主户型的最新快照；如缺失，则回退到 `communitySeries` 最新点。

## 4. 非目标

本次不做：

- 引入 React Router
- 新增独立小区详情页
- 补全所有侧边栏菜单的业务页面
- 重做 Dashboard 页面结构

## 5. 组件与文件边界

- `site/src/App.tsx`
  - 组装锚点区块并接入新专区
- `site/src/components/dashboard/Sidebar.tsx`
  - 修复导航链接与激活态
- `site/src/components/dashboard/FocusedCommunitiesSection.tsx`
  - 新增小区摘要展示组件
- `site/src/lib/dashboard-view.ts`
  - 新增 focused community 视图模型构建逻辑
- `tests/site/app.test.tsx`
  - 覆盖导航跳转与专区渲染
- `tests/e2e/site-smoke.spec.ts`
  - 覆盖真实页面点击后的 hash/可见性反馈

## 6. 验证要求

- 单测验证“重点关注小区”导航指向真实锚点，点击后激活态切换
- 单测验证“重点关注小区”专区基于真实数据渲染
- E2E 验证点击导航后 URL hash 更新，专区可见
