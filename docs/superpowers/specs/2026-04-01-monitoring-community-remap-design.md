# 监控小区与户型映射重构设计

日期：2026-04-01

## 1. 目标

将当前监控小区从：

- 鸣泉花园
- 富力津门湖嘉郡花园
- 富力津门湖云舒花园
- 富力津门湖柏溪花园
- 海逸长洲瀚波园

调整为：

- 鸣泉花园
- 柏溪花园
- 恋海园
- 万科东第
- 谊景村

同时将现有“全局共用户型模板”调整为“按小区一一对应的主监控户型段”。

本次变更仍然服务于原始目标：通过公开网页和手工补样，判断重点小区房价方向，而不是构建一个通用房产平台。

本次设计明确拆成两期：

- **一期：确定性重构**
  - 新 5 个小区配置
  - 每小区 1 个专属 segment
  - `pending_verification` 状态贯穿配置、采集、聚合、前端和表单
  - 已验证小区继续自动采集
  - 待复核小区先显示“待复核”，不阻塞系统上线
- **二期：来源复核与启用**
  - 复核 `恋海园`、`万科东第`、`谊景村` 的真实公开源
  - 为这些小区补 fixture、collector 映射和自动采集验证

一期必须能独立落地并通过验证；二期不阻塞一期交付。

## 2. 推荐方案

采用“混合数据源 + 分级启用”方案。

### 2.1 目标户型推荐

基于当前公开挂牌样本、并优先满足总价大致落在 `100–300 万` 的约束，推荐如下：

- 鸣泉花园：`2居 / 87–90㎡`
- 柏溪花园：`2居 / 100–120㎡`
- 恋海园：`2居 / 90–110㎡`
- 万科东第：`3居 / 100–105㎡`
- 谊景村：`2居 / 75–90㎡`

### 2.2 数据源分级

本次搜索后，公开源稳定性并不一致：

- `鸣泉花园`、`柏溪花园`：已有较直接的公开挂牌样本，可视为 `已验证`
- `恋海园`、`万科东第`、`谊景村`：当前找到的部分 Fang 价格页 ID 与小区名不一致或标题异常，可视为 `待复核`

因此推荐的实施方式不是“把所有来源一次性硬切换”，而是：

1. 先把监控名单和每小区户型映射改成目标状态
2. 对 `已验证` 小区立即启用采集
3. 对 `待复核` 小区，在确认真实公开源映射前统一标记为 `pending_verification`

这样做的原因很简单：宁可临时显示“待复核”，也不要把错误来源当成真实小区数据。

## 3. 非目标

本次变更不做：

- 新增城市
- 新增多户型并行监控
- 重构整套前端结构
- 替换现有手工补样机制
- 引入新的第三方数据平台

## 4. 设计原则

### 4.1 监控对象优先于历史兼容

用户新的 5 个小区名单应成为新的主监控对象。旧名单不再出现在首页、详情页和主配置中。

### 4.2 每小区只保留一个主监控户型段

从“每个小区共享两个全局 segment”改成“每个小区一个主 segment”。

这样做的好处：

- 直接对应你的关注目标
- 降低样本稀疏度
- 让前端和周报结论更聚焦

### 4.3 弱数据源允许降级，但不允许误采

如果某小区公开源未验证：

- 配置状态统一记为 `pending_verification`
- 前端统一展示文案为“待复核”
- 允许依赖后续手工补样
- 不允许继续沿用明显不匹配的小区 ID 做自动采集

## 5. 配置模型调整

### 5.1 communities

`data/config/communities.json` 需要替换为新的 5 个目标小区。

字段仍然保持：

- `id`
- `name`
- `city`
- `district`
- `sources`

但 `sources` 的含义需要调整为：

- 若来源已验证：填入真实 Fang 映射，并设置 `status: "active"`
- 若来源待复核：保留空来源值，并设置 `status: "pending_verification"`

推荐的最终结构固定为，且本次变更的 canonical 配置应如下：

```json
[
  {
    "id": "mingquan-huayuan",
    "name": "鸣泉花园",
    "city": "天津",
    "district": "西青",
    "status": "active",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110750643.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110750643/weekreport.htm"
    }
  },
  {
    "id": "boxi-huayuan",
    "name": "柏溪花园",
    "city": "天津",
    "district": "西青",
    "status": "active",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110661679.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110661679/weekreport.htm"
    }
  },
  {
    "id": "lianhai-yuan",
    "name": "恋海园",
    "city": "天津",
    "district": "待确认",
    "status": "pending_verification",
    "sources": {
      "fangCommunityUrl": null,
      "fangWeekreportUrl": null
    }
  },
  {
    "id": "wanke-dongdi",
    "name": "万科东第",
    "city": "天津",
    "district": "待确认",
    "status": "pending_verification",
    "sources": {
      "fangCommunityUrl": null,
      "fangWeekreportUrl": null
    }
  },
  {
    "id": "yijing-cun",
    "name": "谊景村",
    "city": "天津",
    "district": "待确认",
    "status": "pending_verification",
    "sources": {
      "fangCommunityUrl": null,
      "fangWeekreportUrl": null
    }
  }
]
```

### 5.2 segments

当前 `data/config/segments.json` 是全局模板数组，不够表达“每小区一一对应”。

推荐调整为固定结构，且不再允许“等价结构”自由发挥。本次变更的 canonical `segments.json` 应如下：

```json
[
  {
    "communityId": "mingquan-huayuan",
    "id": "mingquan-2br-87-90",
    "label": "2居 87-90㎡",
    "rooms": 2,
    "areaMin": 87,
    "areaMax": 90
  },
  {
    "communityId": "boxi-huayuan",
    "id": "boxi-2br-100-120",
    "label": "2居 100-120㎡",
    "rooms": 2,
    "areaMin": 100,
    "areaMax": 120
  },
  {
    "communityId": "lianhai-yuan",
    "id": "lianhai-2br-90-110",
    "label": "2居 90-110㎡",
    "rooms": 2,
    "areaMin": 90,
    "areaMax": 110
  },
  {
    "communityId": "wanke-dongdi",
    "id": "wanke-3br-100-105",
    "label": "3居 100-105㎡",
    "rooms": 3,
    "areaMin": 100,
    "areaMax": 105
  },
  {
    "communityId": "yijing-cun",
    "id": "yijing-2br-75-90",
    "label": "2居 75-90㎡",
    "rooms": 2,
    "areaMin": 75,
    "areaMax": 90
  }
]
```

固定约束：

- 每个小区恰好一个主监控 segment
- segment ID 全局唯一
- 一个 segment 必须且只能属于一个 `communityId`
- 前端和聚合层都按 `communityId -> segment` 定位

### 5.3 系列数据目录

原有输出目录仍可保留：

- `data/series/communities/<community-id>/<segment-id>.json`

只是 segment ID 将从旧的全局模板 ID 改成小区专属 ID。

### 5.4 运行时聚合契约

本次重构后，运行时不再生成“community × global segments”的笛卡尔积。

唯一允许的运行时契约是：

- pipeline 只处理 `segment.communityId === community.id` 的那一条主监控 segment
- 不为其他不匹配的小区 / segment 组合生成 series
- 前端横向对比时展示“各小区自己的主监控户型”，而不是比较同一个 `segment.id`

因此：

- `data/series/communities/<community-id>/` 下只应存在该小区自己的 1 个主监控 segment 文件
- 不再允许旧的 cross-product 输出继续扩张

### 5.5 weekly report 结构

为减少改动范围，一期保留 `communities` 容器，但每个小区下只允许 1 个主监控 segment。

可接受的结构有且仅有两种，实施计划必须固定其中一种：

一期固定选择第 2 种结构：

- 继续保留 `segments: Record<string, ...>`
- 但每个小区下只能有 1 个 entry
- 该 entry 的 key 必须是该小区自己的主监控 `segment.id`

一期不引入 `primarySegment` 结构，以降低对现有前端和 loader 的改动范围。

本次变更中，以下文件必须围绕这一个固定结构同步修改：

- `scripts/build-weekly-report.ts`
- `site/src/lib/load-json.ts`
- `site/src/App.tsx`
- `site/src/components/DetailView.tsx`

## 6. 采集与聚合的行为调整

### 6.1 已验证小区

对于 `鸣泉花园`、`柏溪花园`：

- 继续走当前 Fang mobile community / price 页采集链路
- 继续使用 teaser 匹配和小区价格 fallback

### 6.2 待复核小区

对于 `恋海园`、`万科东第`、`谊景村`：

- 一期不复核真实公开源，也不启用自动采集
- 二期再单独复核真实公开源映射并决定是否启用自动采集
- 一期内，`status` 固定为 `pending_verification`
- `scripts/collect.ts` 对 `pending_verification` 小区直接跳过采集
- 它们仍然保留在 series / report / frontend 的小区列表中
- 前端统一显示“待复核”

### 6.3 手工补样

手工补样仍然保留，并且对弱源小区更重要。

在这些小区上，手工补样是数据可信度的重要兜底，而不是异常路径。

新增硬约束：

- manual sample 只有在 `sample.communityId === segment.communityId` 时才合法
- 不能只分别校验 communityId 和 segmentId 的存在性

## 7. 前端展示调整

首页和详情页都需要从“旧 5 小区 + 双全局 segment”切换到“新 5 小区 + 每小区单主 segment”。

具体变化：

- 首页主监控对象固定为 `鸣泉花园`
- 对比小区列表改成新的 4 个对比盘
- segment 卡片数量从“固定两个”调整为“按当前主小区配置生成”
- 详情页横向对比改为：展示其他 4 个小区各自的主监控户型摘要，而不是再用同一个 `segment.id` 强行横比
- 当某个小区来源待复核时，前端统一展示“待复核”而不是静默空白

## 8. 测试策略

至少需要覆盖：

1. 配置测试
   - 新 communities 列表
   - 每小区一一对应的 segment 配置
   - 禁止重复 ID

2. 采集/聚合测试
   - 已验证小区仍能正常产出 series
   - 待复核小区在未启用时不会误采错误来源

3. 前端测试
   - 首页与详情页使用新的小区名单
   - 首页主监控对象固定为 `鸣泉花园`
   - 主监控 segment 按新映射显示
   - 详情页横向对比展示“各小区自己的主监控户型”
   - “待复核”状态可见

4. 运维与表单测试
   - `.github/ISSUE_TEMPLATE/manual-sample.yml` 的 community/segment 下拉项与新配置同步
   - 手工补样仍能写入正确的小区与 segment

## 9. 风险与应对

### 风险 1：来源映射错误

应对：

- 在实现阶段先复核 `恋海园`、`万科东第`、`谊景村` 的真实公开源
- 未确认前不启用自动采集

### 风险 2：前端仍假定“两个固定 segment”

应对：

- 将前端改成从配置驱动，而不是写死两个全局卡片

### 风险 3：历史数据目录与新配置不兼容

应对：

- 本次允许把旧小区历史视为历史遗留数据
- 新配置生效后，新名单按新目录继续积累

## 10. 实施建议

### 一期

1. 改 communities / segments 固定结构
2. 改 `lib/types.ts` / `lib/schemas.ts` / `lib/config.ts` 以支持 `status` 和小区专属 segment
3. 改 manual-input 校验，增加 communityId -> segmentId 配对校验
4. 改 issue form 的 community / segment 下拉项
5. 改 `scripts/collect.ts` / `collector/*`，让 `pending_verification` 小区直接跳过采集
6. 改 `scripts/build-series.ts` / `scripts/build-weekly-report.ts`，从笛卡尔积输出改为“每小区 1 个主 segment”
7. 改前端对配置和 `pending_verification` 状态的消费方式
8. 跑全量验证

### 二期

1. 复核 `恋海园`、`万科东第`、`谊景村` 的真实公开源
2. 补 fixture / parser / collector 映射
3. 启用这些小区的自动采集
4. 跑来源验证与全量验证

### 10.1 影响面归属

为便于后续实施计划拆分，本次一期改动的主要归属边界如下：

- 配置 / schema：`lib/types.ts`、`lib/schemas.ts`、`lib/config.ts`、`data/config/*.json`
- 手工补样校验：`lib/manual-input.ts`、`scripts/ingest-manual-issue.ts`、`scripts/promote-manual-inputs.ts`、`.github/ISSUE_TEMPLATE/manual-sample.yml`
- 采集与聚合：`collector/*`、`scripts/collect.ts`、`scripts/build-series.ts`、`scripts/build-weekly-report.ts`
- 前端展示：`site/src/lib/load-json.ts`、`site/src/App.tsx`、`site/src/components/*`
- 运维与 workflow：`.github/workflows/*`

## 11. 本次设计结论

按推荐方案执行：

- 监控小区换成：鸣泉花园、柏溪花园、恋海园、万科东第、谊景村
- 每小区只保留一个主监控户型段
- 鸣泉花园、柏溪花园立即启用自动采集
- 恋海园、万科东第、谊景村先按“待复核来源”处理，确认真实映射后再启用

这能同时满足：

- 你的新关注名单
- 100–300 万总价约束下的主监控户型选择
- 尽量避免错误来源把系统带偏
