# 二期：万科东第启用与混合来源设计

日期：2026-04-02

## 1. 目标

在不破坏一期稳定性的前提下，进入二期并完成最小可交付升级：

- 启用 `万科东第` 的自动采集
- 将 `万科东第` 的主监控户型从 `3居 / 100–105㎡` 调整为 `2居 / 85–90㎡`
- 保持 `恋海园`、`谊景村` 为 `pending_verification`
- 允许按小区使用不同公开来源

本次二期不追求一次性解决所有待复核小区，而是先把“有稳定公开源”的目标小区转正。

## 2. 设计结论

### 2.1 小区状态

- 鸣泉花园：`active`
- 柏溪花园：`active`
- 万科东第：`active`
- 恋海园：`pending_verification`
- 谊景村：`pending_verification`

### 2.2 主监控户型

- 鸣泉花园：`2居 / 87–90㎡`
- 柏溪花园：`2居 / 100–120㎡`
- 万科东第：`2居 / 85–90㎡`
- 恋海园：`2居 / 90–110㎡`
- 谊景村：`2居 / 75–90㎡`

### 2.3 数据源策略

- 鸣泉花园：继续使用 `fang_mobile`
- 柏溪花园：继续使用 `fang_mobile`
- 万科东第：启用 `anjuke_sale_search`
- 恋海园：继续 `pending_verification`
- 谊景村：继续 `pending_verification`

### 2.4 状态与来源职责分离

二期显式区分两个概念：

- `status`：只负责产品状态和前端表达
- `sourceProvider`：负责运行时采集路径和配置校验规则

这意味着：

- `active` 不再等于“必须有 Fang URL”
- 一个小区是否可自动采集，取决于 `status + sourceProvider` 的组合
- 前端是否显示“待复核”，只看 `status`

### 2.5 Provider 命名边界

二期将 provider 命名固定为“来源族 + 页面契约”，而不是“小区名 + 特例实现”。

- `fang_mobile`：房天下移动端小区页 / 周报页契约
- `anjuke_sale_search`：安居客搜索结果页契约
- `none`：无自动来源

这意味着：

- `sourceProvider` 是可复用的来源类型，不是 `万科东第` 的别名
- 但在二期里，只有 `万科东第` 会配置成 `anjuke_sale_search`
- collector 实现允许暂时只服务一个小区，不影响 provider 命名保持通用

## 3. 推荐方案

采用“最小二期”方案：

1. 配置层新增 `sourceProvider`
2. collector 层按 provider 分发
3. 只为 `万科东第` 补 `anjuke_sale_search` 适配
4. 复用现有 normalized run artifact、series、weekly report、frontend

这样可以最小化改动范围，同时验证“按小区混合来源”这条架构是否可行。

## 4. 非目标

本次二期不做：

- 启用 `恋海园`
- 启用 `谊景村`
- 重构整套 pipeline
- 替换现有 Fang collector
- 改造 issue form 交互模式
- 新增多户型监控

## 5. 配置调整

### 5.1 communities

在 `communities.json` 中新增 `sourceProvider` 字段，并扩展 `sources` 以支持 provider-specific URL。

一期后，推荐的二期 canonical 配置为：

```json
[
  {
    "id": "mingquan-huayuan",
    "name": "鸣泉花园",
    "city": "天津",
    "district": "西青",
    "status": "active",
    "sourceProvider": "fang_mobile",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110750643.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110750643/weekreport.htm",
      "anjukeSaleSearchUrl": null
    }
  },
  {
    "id": "boxi-huayuan",
    "name": "柏溪花园",
    "city": "天津",
    "district": "西青",
    "status": "active",
    "sourceProvider": "fang_mobile",
    "sources": {
      "fangCommunityUrl": "https://tj.esf.fang.com/loupan/1110661679.htm",
      "fangWeekreportUrl": "https://tj.esf.fang.com/loupan/1110661679/weekreport.htm",
      "anjukeSaleSearchUrl": null
    }
  },
  {
    "id": "wanke-dongdi",
    "name": "万科东第",
    "city": "天津",
    "district": "待确认",
    "status": "active",
    "sourceProvider": "anjuke_sale_search",
    "sources": {
      "fangCommunityUrl": null,
      "fangWeekreportUrl": null,
      "anjukeSaleSearchUrl": "https://m.anjuke.com/tj/sale/?kw=%E4%B8%87%E7%A7%91%E4%B8%9C%E7%AC%AC"
    }
  },
  {
    "id": "lianhai-yuan",
    "name": "恋海园",
    "city": "天津",
    "district": "待确认",
    "status": "pending_verification",
    "sourceProvider": "none",
    "sources": {
      "fangCommunityUrl": null,
      "fangWeekreportUrl": null,
      "anjukeSaleSearchUrl": null
    }
  },
  {
    "id": "yijing-cun",
    "name": "谊景村",
    "city": "天津",
    "district": "待确认",
    "status": "pending_verification",
    "sourceProvider": "none",
    "sources": {
      "fangCommunityUrl": null,
      "fangWeekreportUrl": null,
      "anjukeSaleSearchUrl": null
    }
  }
]
```

### 5.2 配置校验矩阵

二期推荐的 schema / loader 运行时契约固定为：

- `active + fang_mobile`
  - `fangCommunityUrl` 必须为非空字符串
  - `fangWeekreportUrl` 必须为非空字符串
  - `anjukeSaleSearchUrl` 必须为 `null`
- `active + anjuke_sale_search`
  - `anjukeSaleSearchUrl` 必须为非空字符串
  - `fangCommunityUrl` 允许为 `null`
  - `fangWeekreportUrl` 允许为 `null`
- `pending_verification + none`
  - 所有来源 URL 都必须为 `null`

二期不允许出现 `status` 和 `sourceProvider` 的其他组合。

除此之外，schema 还需要显式固定这些约束：

- `sourceProvider` 在 public config 中是必填字段
- `sources` 必须始终包含 `fangCommunityUrl`、`fangWeekreportUrl`、`anjukeSaleSearchUrl` 这 3 个 key
- 未使用的来源字段必须显式写 `null`
- `sources` 不允许额外 key
- 未知 `sourceProvider` 必须在 loader 阶段 fail fast

### 5.3 segments

二期 canonical `segments.json` 应调整为：

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
    "communityId": "wanke-dongdi",
    "id": "wanke-2br-85-90",
    "label": "2居 85-90㎡",
    "rooms": 2,
    "areaMin": 85,
    "areaMax": 90
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
    "communityId": "yijing-cun",
    "id": "yijing-2br-75-90",
    "label": "2居 75-90㎡",
    "rooms": 2,
    "areaMin": 75,
    "areaMax": 90
  }
]
```

## 6. 采集与聚合行为

### 6.1 Provider 分发

`scripts/collect.ts` 不再默认所有 `active` 小区都走 Fang collector。

它应按 `community.sourceProvider` 分发：

- `fang_mobile` -> 现有 Fang mobile collectors
- `anjuke_sale_search` -> 新的安居客搜索 collector
- `none` -> 跳过

### 6.2 万科东第

`万科东第` 在二期中升级为可采集小区：

- 走 `anjuke_sale_search` collector
- collector 负责把该来源的字段归一化到现有 `RunArtifact.communities[communityId]` 结构
- downstream 的 `build-series.ts` 和 `build-weekly-report.ts` 不应因为来源不同而分叉逻辑

#### 6.2.1 来源契约

`anjuke_sale_search` 的来源契约在二期中固定为：

- 入口 URL：`sources.anjukeSaleSearchUrl`
- 当前只在 `万科东第` 上启用
- 只抓取搜索结果第一页
- parser 只保留通过“标准化后小区名精确命中 `万科东第`”的挂牌项
- 不允许“只因为搜索结果出现在同页”就把其他小区混入结果

标准化与接纳规则固定为：

- 对标题中的空格、标点、全半角差异做标准化
- 必须能在标题中抽出标准化后精确等于 `万科东第` 的小区名片段
- 不能仅依赖模糊子串，例如 `万科` 或 `东第附近`
- 不额外抓详情页；二期只依赖搜索结果页可见字段
- 去重规则为 `标题 + 房间数 + 面积 + 总价` 的组合键
- 页面空结果、反爬页、关键字段整体缺失时，source status 记为 `failed`

最小字段抽取范围：

- 标题
- 户型房间数
- 建筑面积
- 总价
- 单价
- 详情链接

如果页面缺少上述核心字段，collector 应将该 listing 丢弃，而不是输出半残数据。

#### 6.2.2 Run artifact 归一化契约

二期不重写下游 series pipeline，所以 `anjuke_sale_search` 必须写入现有的社区级 artifact 壳：

- `communities[wanke-dongdi].fangCommunity.status`
  - 成功抓取并完成解析时写 `success`
  - 反爬、空页、解析失败时写 `failed`
- `communities[wanke-dongdi].fangCommunity.currentListingTeasers`
  - 写入安居客结果页归一化后的 teaser 列表
- `communities[wanke-dongdi].fangCommunity.listingCount`
  - 写入去重后的 teaser 数量
- `communities[wanke-dongdi].fangCommunity.referenceUnitPrice`
  - 可选；如果能稳定从 teaser 计算中位数则写入，否则写 `null`
- `communities[wanke-dongdi].fangWeekreport.status`
  - 固定写 `skipped`
- `communities[wanke-dongdi].fangWeekreport.pricePoints`
  - 固定为空或省略，不伪造周报曲线

因此二期对 `万科东第` 的价格推导规则也要显式固定：

- 当匹配到的 `2居 85–90㎡` teaser 数量 `>= 3` 时，`build-series.ts` 继续走 `segment-teasers`
- 当匹配 teaser 数量 `< 3` 时，`build-series.ts` 会落到 `community-fallback`
- 由于 `fangWeekreport.pricePoints` 不可用，这种 fallback 的 `listingUnitPriceMedian` 允许为 `null`
- 这不是 bug，而是显式的“样本不足”表达；二期不伪造社区级替代价格

### 6.3 恋海园、谊景村

二期内保持：

- `status = pending_verification`
- `sourceProvider = none`
- collection skipped
- frontend 继续显示“待复核”

## 7. 运行时契约

本次二期不改变一期已确立的运行时约束：

- 每个小区只生成自己的 1 个主监控 segment
- weekly report 继续保留 `segments: Record<string, ...>`，但每个小区只有 1 个 entry
- `community.status` 仍然是“待复核”展示的唯一来源
- `sourceProvider` 仍然是 collect 分发和配置校验的唯一来源
- `万科东第` 没有 Fang 周报兜底价时，允许出现“样本不足 / listingUnitPriceMedian = null”的运行结果

## 8. 前端变化

二期前端只需要体现：

- `万科东第` 从“待复核”切换成正常自动监控小区
- `万科东第` 的主监控户型切换为 `2居 85–90㎡`
- `恋海园`、`谊景村` 继续显示“待复核”

不需要重构前端结构。

## 9. 手工补样与历史兼容

二期虽然不改 issue form 的交互模式，但必须同步更新手工补样的 canonical 选项：

- `.github/ISSUE_TEMPLATE/manual-sample.yml`
- `scripts/ingest-manual-issue.ts`
- `scripts/promote-manual-inputs.ts`
- 对应测试夹具与断言

`万科东第` 的 segment ID 从 `wanke-3br-100-105` 切换到 `wanke-2br-85-90` 后，兼容规则固定为：

- 新 issue 只能提交新的 `wanke-2br-85-90`
- 旧的 `wanke-3br-100-105` 不允许被自动重映射到新 segment
- 如果 `manual/incoming` 或 `manual/accepted` 里存在旧 Wanke segment 的样本，二期实施必须先人工清理或移出构建路径，再跑生成流程

原因很简单：旧 segment 和新 segment 语义不同，自动改写会污染样本历史。

## 10. 测试策略

至少覆盖：

1. 配置与 schema
   - `sourceProvider` 的合法枚举
   - `status + sourceProvider + sources` 组合校验
   - `sources` 必须包含全部 provider keys 且禁止额外 key
   - `万科东第` 状态与 segment 更新

2. collector / pipeline
   - `sourceProvider = anjuke_sale_search` 能被正确分发
   - `万科东第` 产出 normalized run artifact
   - `万科东第` 在无 weekreport 情况下的 fallback 行为可预测
   - `恋海园`、`谊景村` 继续 skipped

3. 前端
   - `万科东第` 在对比视图中不再显示“待复核”
   - `恋海园`、`谊景村` 继续显示“待复核”

4. 手工补样
   - issue form 选项更新为 `wanke-2br-85-90`
   - ingest / promote 会拒绝旧 Wanke segment ID

5. 全量验证
   - `npm run test`
   - `npm run typecheck`
   - `npm run build`
   - `npm run test:e2e -- tests/e2e/site-smoke.spec.ts`

## 11. 实施建议

推荐顺序：

1. 扩展 config/schema 支持 `sourceProvider`
2. 调整 `万科东第` 的 segment 和 issue-form canonical 选项
3. 补 `anjuke_sale_search` fixture / parser / collector
4. 改 `scripts/collect.ts` provider 分发
5. 清理旧 Wanke manual artifacts（如果存在）
6. 跑 pipeline 与手工补样测试
7. 跑前端测试
8. 更新生成数据并验收

## 12. 结论

二期按最小方案执行：

- 只启用 `万科东第`
- `万科东第` 主监控户型改成 `2居 / 85–90㎡`
- `恋海园`、`谊景村` 继续 `pending_verification`
- 通过 `anjuke_sale_search` 这个新 provider 验证“按小区混合来源”策略可行

这条路径最稳，也最符合你目前的目标。
