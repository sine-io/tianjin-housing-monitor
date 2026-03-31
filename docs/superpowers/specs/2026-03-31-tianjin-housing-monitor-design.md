# 天津楼市监测系统设计

日期：2026-03-31

## 1. 目标

构建一套个人使用、手机可访问、尽量全免费的天津楼市监测系统。

第一阶段范围：

- 城市范围固定为天津
- 监测小区固定为鸣泉花园
- 增加 3 到 5 个对比盘
- 重点监测两个户型带：
  - 两居 87-90 平方米
  - 三居 140-150 平方米
- 页面公开可访问
- 自动抓取公开网页
- 支持手工补录贝壳链接或截图形成样本

不在第一阶段范围内：

- 多用户系统
- 私有访问控制
- 贝壳自动登录抓取
- 全国多城市泛化能力
- 全量房源数据库

## 2. 推荐方案

采用 free-first 方案：

- 公开 GitHub 仓库
- GitHub Actions 负责定时采集、解析、聚合和构建
- GitHub Pages 负责发布静态手机端看板
- 仓库内 JSON 数据集负责长期保存结构化历史数据
- Playwright 负责浏览器采集
- ECharts 负责趋势图

该方案的核心原则：

- 优先保留结构化结果，不长期保留全部原始文件
- 自动采集是主流程，手工补录是兜底机制
- 只围绕“判断价格方向”设计数据结构，不追求通用化

## 3. 系统结构

系统由四层组成：

1. 采集层
   - 使用 Playwright 打开公开网页
   - 页面来源包括房天下、国家统计局公开页面，以及用户手工补充的贝壳线索
2. 解析与聚合层
   - 将来源页面转换为统一中间格式
   - 按 segment 计算每日指标
3. 数据层
   - 将聚合结果写入仓库内 JSON 文件
   - 将少量失败截图和关键快照写入仓库产物或短期目录
4. 展示层
   - 使用静态网页展示趋势、结论、异常和补录入口

### 3.1 第一阶段来源矩阵

第一阶段只冻结以下来源：

| 来源 | 用途 | 接入方式 | 第一阶段状态 | 备注 |
|------|------|----------|--------------|------|
| 房天下小区页 | 小区参考均价、在售结构、近期成交线索 | Playwright 自动抓取 | 必做 | 主要小区级公开来源 |
| 房天下小区周报 | 周度挂牌走势、在售量、热度类公开信息 | Playwright 自动抓取 | 必做 | 主要趋势来源 |
| 国家统计局 70 城数据 | 天津二手住宅城市级月度指数 | HTTP/HTML 自动抓取 | 必做 | 首页大盘卡唯一官方来源 |
| 贝壳链接 | 手工补充样本证据 | 用户手工提交 | 手工兜底 | 第一阶段不做自动登录和自动解析 |
| 贝壳截图 | 手工补充样本证据 | 用户手工提交 | 手工兜底 | 以截图配套录入字段为准 |
| 天津地方公开市场页 | 额外验证信息 | 不接入 | 不做 | 留待后续升级 |

来源边界：

- 第一阶段自动抓取只实现 `房天下 + 国家统计局`
- 贝壳只作为手工补录来源，不参与自动抓取
- 如果房天下页面缺测，当日数据标记缺失，不切换到未定义备用源

## 4. 数据模型

### 4.1 communities

记录监测小区基础信息。

字段建议：

- `id`
- `city`
- `district`
- `name`
- `aliases`
- `source_links`
- `enabled`

### 4.2 segments

以户型带为核心监测单元。

字段建议：

- `id`
- `community_id`
- `label`
- `rooms`
- `area_min`
- `area_max`
- `enabled`

初始 segment：

- 鸣泉花园 / 两居 / 87-90
- 鸣泉花园 / 三居 / 140-150
- 对比盘采用相同户型带规则

### 4.3 daily_metrics

每天每个 segment 一条聚合记录。

字段建议：

- `date`
- `segment_id`
- `listings_count`
- `listing_price_median`
- `listing_price_min`
- `listing_unit_price_median`
- `listing_unit_price_min`
- `new_listing_count`
- `suspected_deal_count`
- `heat_score`
- `demand_supply_ratio`
- `source_status`
- `notes`

### 4.4 manual_inputs

记录手工补录样本。

字段建议：

- `date`
- `community_id`
- `segment_id`
- `source_type`
- `url`
- `screenshot_path`
- `total_price`
- `unit_price`
- `area`
- `floor_info`
- `orientation`
- `remarks`

### 4.5 source_runs

记录每次抓取任务。

字段建议：

- `id`
- `run_type`
- `source_name`
- `started_at`
- `finished_at`
- `status`
- `error_message`
- `artifacts`

### 4.6 weekly_reports

记录每周自动摘要。

字段建议：

- `week_start`
- `community_id`
- `segment_id`
- `summary`
- `verdict`
- `anomalies`
- `followups`

### 4.7 city_market_series

记录天津城市级月度大盘数据。

字段建议：

- `month`
- `city`
- `source_name`
- `source_url`
- `secondary_home_price_index_mom`
- `secondary_home_price_index_yoy`
- `market_verdict`
- `published_at`

`market_verdict` 定义：

- `偏强`：最新月度 `secondary_home_price_index_mom >= 100.0`
- `中性`：最新月度 `99.8 <= secondary_home_price_index_mom < 100.0`
- `偏弱`：最新月度 `secondary_home_price_index_mom < 99.8`

首页大盘卡读取天津最新一条月度记录，并同时展示 `published_at`。

## 5. 仓库结构

建议结构：

```text
.
├── .github/workflows/
│   ├── collect.yml
│   ├── weekly-report.yml
│   └── deploy-pages.yml
├── collector/
├── parser/
├── data/
│   ├── config/
│   ├── manual/
│   ├── series/
│   ├── reports/
│   └── runs/
├── site/
└── docs/
```

说明：

- `data/config/` 保存小区、segment、来源配置
- `data/manual/` 保存手工补录 JSON
- `data/series/` 保存最终趋势数据
- `data/reports/` 保存周报 JSON
- `data/runs/` 保存任务日志摘要

额外约定：

- `data/series/city-market/tianjin.json` 保存首页大盘数据
- `data/series/communities/<community-id>/<segment-id>.json` 保存小区 segment 趋势
- `data/manual/` 区分 `incoming/` 和 `accepted/`

## 6. 抓取与构建流程

### 6.1 每日任务

每日两次执行，建议北京时间 `09:30` 和 `21:30`。

流程：

1. 读取小区与 segment 配置
2. 访问公开来源页面
3. 抓取鸣泉花园及对比盘相关页面
4. 检查国家统计局天津城市级月度数据是否有新记录
5. 解析页面为统一结构
6. 聚合为当日 segment 指标
7. 合并手工补录样本
8. 写入 `data/series/`
9. 构建静态页面
10. 发布到 GitHub Pages

说明：

- 国家统计局数据是月度数据，日任务只负责检查更新；无新记录时沿用最新已发布值
- 日任务不尝试抓取贝壳

### 6.2 每周任务

每周执行一次摘要生成：

1. 读取最近 7 天数据
2. 计算结论和异常
3. 输出一句话判断
4. 写入 `data/reports/`
5. 重新构建站点

### 6.3 手工补录流程

第一阶段提供真实可用的补录入口，采用 `GitHub Issue Form`。

流程：

1. 静态站点“新增一条样本”按钮跳转到 GitHub Issue Form
2. 用户填写结构化字段：
   - 小区
   - 户型带
   - 日期
   - 总价
   - 单价
   - 面积
   - 楼层
   - 贝壳链接
   - 备注
3. 用户可在 issue 中附截图
4. `issues` 事件触发 GitHub Action，将表单转换为 `data/manual/incoming/<issue-id>.json`
5. 每日任务校验并合并有效样本到 `data/manual/accepted/`

边界：

- 第一阶段不做站内表单提交
- 第一阶段不自动解析贝壳页面
- issue 中的结构化字段是唯一机器可信输入
- 链接和截图只作为复核证据

## 7. 页面结构

### 7.1 首页

首页只解决三件事：

- 天津二手大盘偏强还是偏弱
- 鸣泉花园两个核心户型带怎么走
- 今天是否有需要复核的异常

首页模块：

- 大盘状态卡
- 鸣泉花园两居状态卡
- 鸣泉花园三居状态卡
- 异常提醒卡
- 最近周报入口

### 7.2 小区详情页

小区详情页模块：

- segment 切换
- 趋势图
- 最近结论
- 对比盘对照图
- 数据质量说明
- 手工补录入口按钮

补录入口定义：

- 首页和详情页都提供“新增一条样本”按钮
- 按钮跳转到 GitHub Issue Form
- 页面明确说明第一阶段补录走 GitHub Issue Form，而不是站内表单

### 7.3 手机端原则

- 默认单列布局
- 首屏只保留判断结果和核心数字
- 趋势图可横向滑动或切换时间范围
- 补录入口不隐藏过深

## 8. 判断逻辑

系统围绕以下规则输出结论。

### 8.1 指标定义

- `W0`：最新 7 日窗口
- `W-1`：W0 之前的 7 日窗口
- `W-2`：W-1 之前的 7 日窗口
- `连续两期`：同时比较 `W-2 -> W-1` 和 `W-1 -> W0` 两次变化
- `核心价格指标`：默认使用 `listing_unit_price_median`
- `样本不足`：某 7 日窗口内 `listings_count < 3`
- `库存变化不显著`：最近两个 7 日窗口的 `listings_count` 同时满足：
  - 绝对数量差 `< 2`
  - 百分比变化绝对值 `< 10%`
- `明显异常波动`：单日 `listing_unit_price_median` 相比前 7 日中位数偏离 `> 15%`
- `最低挂牌价上移/下移`：最近 7 日窗口的 `listing_unit_price_min` 相比上一个 7 日窗口变化绝对值 `>= 3%`
- `库存下降/增加`：最近 7 日窗口 `listings_count` 相比上一个 7 日窗口变化绝对值 `>= 10%` 或绝对数量差 `>= 2`

### 8.2 展示字段定义

- `heat_score`：若来源页面提供明确热度值，则归一化到 `0-100`；否则为 `null`
- `demand_supply_ratio`：若来源页面提供明确供需比，则写入；否则为 `null`

这两个字段只用于展示，不参与第一阶段自动结论。

### 8.3 结论规则

- `上涨`：`W-2 -> W-1` 和 `W-1 -> W0` 两次变化中，`listing_unit_price_median` 均抬升 `>= 2%`，且 `W0` 相比 `W-1` 库存下降，且最低挂牌价上移
- `下跌`：`W-2 -> W-1` 和 `W-1 -> W0` 两次变化中，`listing_unit_price_median` 均下降 `>= 2%`，且 `W0` 相比 `W-1` 库存增加，且最低挂牌价下移
- `横盘`：`W-1 -> W0` 价格变化绝对值 `< 2%`，且库存变化不显著
- `以价换量`：`W-1 -> W0` 价格下降 `>= 2%`，但 `W0` 的 `suspected_deal_count` 或 `manual_inputs` 数量高于 `W-1`
- `假回暖`：`W-1 -> W0` 价格上升 `>= 2%`，但 `W0` 库存未下降，且最低挂牌价未上移
- `样本不足`：若参与判断的任一窗口样本不足，则直接输出 `样本不足`

## 9. 异常处理

系统需要明确处理以下异常：

- 来源页面无法访问
- 页面结构变更导致解析失败
- 当日样本不足
- 同一来源数据明显异常波动
- 官方月度数据尚未更新

处理规则：

- 抓取失败时保留日志，页面标记缺测
- 解析失败时不覆盖历史结果
- 异常样本进入待复核列表
- 官方数据未更新时沿用上次值并标记日期
- 单日价格异常波动时，不直接写入周结论，页面标记“异常待复核”

## 10. 验证策略

实施阶段至少覆盖以下验证：

- 解析器单元测试
- 聚合逻辑测试
- 示例数据快照测试
- 构建站点成功验证
- Playwright 采集流程冒烟测试

对外宣称“可用”前，必须验证：

- 每日任务成功生成 JSON
- 静态页面在手机端正常访问
- 至少一个 segment 的趋势图和结论正确渲染

## 11. 成本控制策略

为了尽量全免费，系统执行以下约束：

- 页面与仓库保持公开
- 公开 GitHub 仓库运行 Actions
- 历史保留结构化 JSON，不保存全部原始 HTML
- 失败截图只短期保留
- 每日任务频率控制为两次

## 12. 实施方式

实现阶段采用 subagents 模式并行开发，但具体分工在实施计划中冻结，不作为产品需求的一部分。

## 13. 非目标与后续升级

第一阶段不做：

- 账号系统
- 私有权限控制
- 在线数据库
- 实时推送通知

后续升级方向：

- 接入 Supabase Free 改善补录体验
- 增加更多天津小区
- 增加月报归档和多维筛选
