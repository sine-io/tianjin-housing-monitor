# Housing Price Monitor SaaS Dashboard 设计

日期：2026-04-05

## 1. 目标

为当前项目新增一个现代 SaaS 风格的“Housing Price Monitor”仪表盘首页，并以它替换现有前端首页展示。

本次首页的核心目标是：

- 提供固定左侧导航栏与顶部状态栏
- 在首屏展示核心监控指标
- 为趋势图表预留高质量布局位置
- 用表格突出“高优降价房源”
- 用信息流补充当日动态
- 让页面具备后续接真实数据和真实图表的扩展边界

本次交付是一个可运行、可继续扩展的静态 Dashboard 首页，而不是完整后台系统。

## 2. 当前项目现状

当前仓库前端基础为：

- `React + TypeScript + Vite`
- 当前首页入口为 `site/src/App.tsx`
- 当前样式入口为 `site/src/styles.css`

同时，仓库当前并不具备以下依赖：

- `tailwindcss`
- `lucide-react`
- `recharts`

这意味着本次工作不能只写一份独立 JSX 片段，而需要同时完成页面实现所需的最小前端基础接入。

另外，当前工作区存在用户侧未提交改动：

- `site/src/App.tsx`

因此实现阶段必须先读取并理解该文件的当前状态，再决定如何安全整合，不应直接盲目覆盖。

## 3. 设计结论

### 3.1 页面范围

本次只实现一个 Dashboard 首页，信息结构固定为：

```text
App
├── Sidebar
└── MainContent
    ├── TopHeader
    ├── KPICards
    ├── ChartsSection
    └── BottomSection
        ├── DroppedListingsTable
        └── TimelineFeed
```

### 3.2 推荐方案

采用“单页面壳层 + 轻量组件拆分”方案。

具体做法：

- 保持单个首页入口，不引入路由系统
- 用多个小型展示组件拆分页面，而不是把所有 JSX 写进一个文件
- 用 Tailwind CSS 作为样式实现层
- 用 `lucide-react` 作为图标库
- 图表区暂不引入真实图表实现，只保留 Recharts 占位面板

这个方案的原因是：

- 与用户给定的 Dashboard 蓝图一一对应
- 结构清楚，后续接真实数据与图表时无需重写页面骨架
- 不会把当前仓库扩展成超出范围的多页面管理后台

## 4. 非目标

本次不做：

- 接入真实后端接口
- 接入真实 Recharts 图表
- 实现搜索交互逻辑
- 实现菜单跳转逻辑
- 新增路由系统
- 完整移动端适配
- 做成完整权限后台

本次目标是高保真静态 Dashboard 首页，不是完整产品后台。

## 5. 页面结构设计

### 5.1 页面骨架

页面整体采用全屏布局：

- 根容器：`h-screen bg-slate-50 text-slate-900`
- 左侧 Sidebar：固定宽度 `w-64`
- 右侧主内容：占据剩余空间
- Header 固定在主内容顶部
- Dashboard 主体区域独立滚动

这样可以保证：

- 左侧导航始终固定
- 顶部搜索与状态区域始终可见
- 表格和信息流只在右侧主区域滚动

### 5.2 Sidebar

Sidebar 为深色背景的固定导航区，包含：

- Logo：`Tianjin Housing Monitor`
- 菜单项：
  - 首页（激活态）
  - 重点关注小区
  - 房源全库
  - 降价雷达
  - 系统设置

样式要求：

- 背景使用深 `slate`
- 当前激活项使用更亮底色和白字
- 非激活项保留 hover 态

### 5.3 TopHeader

Header 高度固定为 `h-16`，包含两部分：

- 左侧全局搜索框：`全局搜索小区或房源...`
- 右侧数据状态文案：`数据最后更新于: 10分钟前`

Header 的职责只限于承载入口和状态，不引入复杂交互。

### 5.4 KPI 区

KPI 区为 4 列网格，承载宏观数据：

- 监控小区总数
- 在售房源总数
- 今日降价套数
- 市场均价走势

其中“今日降价套数”必须是重点卡片，视觉上比其他卡片更突出：

- 使用 `emerald-50` 或同级浅绿色背景
- 使用 `emerald-200` 或同级边框
- 明确表达“买方机会”

趋势表达规则固定为：

- 降价或下跌：`emerald`
- 涨价或上升：`rose`
- 普通数量变化：`slate`

### 5.5 图表区

图表区采用 2 列布局：

- 左：`核心小区挂牌均价走势 (近30天)`
- 右：`单价洼地雷达`

本次不接真实图表，只保留视觉完整的占位区域：

- 卡片容器完整
- 内部为虚线边框占位区
- 占位文案明确指向后续 Recharts：
  - `[ Recharts Line Chart Placeholder ]`
  - `[ Recharts Scatter / Bubble Chart Placeholder ]`

### 5.6 底部区

底部区采用 `2:1` 布局：

- 左侧：`今日高优降价房源榜`
- 右侧：`最新动态信息流`

左侧为表格，右侧为 timeline/feed。

## 6. 组件边界

推荐最小组件集合如下：

- `site/src/App.tsx`
  - 页面组装入口
  - 本地假数据注入
- `site/src/components/dashboard/Sidebar.tsx`
- `site/src/components/dashboard/TopHeader.tsx`
- `site/src/components/dashboard/KpiCard.tsx`
- `site/src/components/dashboard/ChartPanel.tsx`
- `site/src/components/dashboard/DroppedListingsTable.tsx`
- `site/src/components/dashboard/TimelineFeed.tsx`

边界原则：

- `App.tsx` 只负责组装页面与喂入数据
- 展示逻辑尽量下沉到对应组件
- 不为本次静态页面提前抽象通用数据层

这样可以避免两个问题：

- 组件过大，难以后续维护
- 为了“将来可能会用到”而过度设计

## 7. 数据结构

本次页面使用页面内本地假数据驱动，不直接绑定现有业务 JSON。

推荐使用 3 组数据：

### 7.1 KPI 数据

```ts
const kpiData = [
  { title, value, unit, trend, isHighlight? }
];
```

### 7.2 降价房源数据

```ts
const droppedListings = [
  { id, compound, layout, size, oldPrice, newPrice, drop, days }
];
```

### 7.3 动态信息流数据

```ts
const timelineEvents = [
  { id, time, title, detail, type }
];
```

`type` 用于控制动态项的状态色，例如：

- `new`
- `drop`
- `alert`

这样能让页面先拥有完整结构，后续再逐步接真实数据来源。

## 8. 视觉系统

### 8.1 颜色

本次颜色体系固定为：

- 中性色：`slate`
- 买方利好 / 降价：`emerald`
- 风险 / 上涨：`rose`

不使用厚重渐变，不使用复杂玻璃拟态。

重点依赖：

- 白色卡片
- 轻阴影
- 细边框
- 大圆角
- 字重层次

### 8.2 卡片样式

卡片统一保持：

- `bg-white`
- `border border-slate-200`
- `rounded-2xl`
- `shadow-sm`

这样可以维持现代 SaaS 的清爽感。

### 8.3 表格样式

表格风格固定为：

- 表头：`bg-slate-50`
- 表头字体较小但清晰
- 行 hover 时出现轻微背景变化
- 原价弱化
- 现价强化
- “降幅”列使用 `emerald`，带向下箭头图标

### 8.4 信息流样式

信息流不做成新闻列表，而做成 activity feed：

- 时间字段靠左
- 内容块靠右
- 使用小圆点或状态徽标辅助阅读
- 保持窄栏高密度展示能力

## 9. Tailwind 与依赖接入策略

由于当前仓库没有 Tailwind，本次实现阶段需要补齐最小接入链路。

预计涉及：

- 安装 Tailwind CSS 相关依赖
- 新增 Tailwind 配置
- 配置 Vite / PostCSS 所需入口
- 将 `site/src/styles.css` 调整为 Tailwind 驱动入口

同时补充：

- `lucide-react`

本次不安装 `recharts`，因为图表仅为占位布局。

## 10. 风险与兼容性

### 10.1 与当前 App 的兼容

由于 `site/src/App.tsx` 当前已有未提交改动，实现前必须先读取其最新内容。

如果这些改动与新 Dashboard 首页直接冲突，则需要在实现时基于现状整合，而不是回退或覆盖未知改动。

### 10.2 与现有测试的兼容

当前测试可能依赖旧首页结构。实现后，至少需要检查：

- 类型检查
- 前端页面构建
- 与首页结构直接相关的测试

如果旧测试显式断言老文案或老 DOM 结构，需要做最小必要更新。

## 11. 验证方式

实现完成后，至少执行：

```bash
npm run typecheck
npm run build:site
```

如相关测试依赖当前首页结构，再补跑：

```bash
npm run test -- tests/site/app.test.tsx
```

验证标准固定为：

- 页面可编译
- 类型通过
- 首页布局符合蓝图
- 关键展示组件正确渲染

## 12. 实施顺序

推荐实施顺序如下：

1. 读取并理解当前 `site/src/App.tsx`
2. 接入 Tailwind CSS 与 `lucide-react`
3. 新建 Dashboard 相关展示组件
4. 重写首页布局壳层
5. 接入 KPI、图表占位、表格、信息流
6. 跑类型检查和前端构建
7. 如有必要，更新首页相关测试

## 13. 最终交付

本次交付完成后，仓库将具备：

- 一个可运行的 React + TypeScript + Tailwind SaaS 风格 Dashboard 首页
- 与用户蓝图一致的页面结构
- 清晰的组件边界
- 可继续接真实数据和图表的扩展位置

本次交付不追求“所有功能都完成”，而追求首页结构正确、视觉质量高、后续可持续迭代。
