import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseFangCommunity } from "../../parser/fang-community";

interface CommunityFixtureExpectation {
  fileName: string;
  communityName: string;
  referencePriceYuanPerSqm: number;
  listingCount: number;
  teaserCount: number;
  recentDealHints: string[];
  firstListing: {
    title: string;
    roomCount: number;
    areaSqm: number;
    totalPriceWan: number;
    unitPriceYuanPerSqm: number;
  };
  secondListing: {
    title: string;
    roomCount: number;
    areaSqm: number;
    totalPriceWan: number;
    unitPriceYuanPerSqm: number;
  };
}

const communityFixtures: CommunityFixtureExpectation[] = [
  {
    fileName: "mingquan-huayuan.html",
    communityName: "富力津门湖鸣泉花园",
    referencePriceYuanPerSqm: 23007,
    listingCount: 90,
    teaserCount: 3,
    recentDealHints: [
      "西青热搜小区榜第60名",
      "关注量超过同城98%的楼盘",
      "二手房历史成交(177)",
    ],
    firstListing: {
      title: "富力津门湖鸣泉花园 2室1厅!可议价!",
      roomCount: 2,
      areaSqm: 88.42,
      totalPriceWan: 199,
      unitPriceYuanPerSqm: 22506,
    },
    secondListing: {
      title: "鸣泉花园精装三室临梅江公园小区临湖",
      roomCount: 3,
      areaSqm: 132.77,
      totalPriceWan: 280,
      unitPriceYuanPerSqm: 21090,
    },
  },
  {
    fileName: "jiajun-huayuan.html",
    communityName: "富力津门湖嘉郡花园",
    referencePriceYuanPerSqm: 22234,
    listingCount: 144,
    teaserCount: 3,
    recentDealHints: [
      "西青人气小区榜第66名",
      "关注量超过同城98%的楼盘",
      "二手房历史成交(193)",
    ],
    firstListing: {
      title: "西青 富力津门湖嘉郡花园 5室3厅 280.00㎡ 580万",
      roomCount: 5,
      areaSqm: 280,
      totalPriceWan: 580,
      unitPriceYuanPerSqm: 20714,
    },
    secondListing: {
      title: "嘉郡精装大平层没个税高楼层景观房",
      roomCount: 4,
      areaSqm: 276.56,
      totalPriceWan: 500,
      unitPriceYuanPerSqm: 18080,
    },
  },
  {
    fileName: "yunshu-huayuan.html",
    communityName: "富力津门湖云舒花园",
    referencePriceYuanPerSqm: 23403,
    listingCount: 104,
    teaserCount: 3,
    recentDealHints: [
      "西青人气小区榜第63名",
      "关注量超过同城98%的楼盘",
      "二手房历史成交(234)",
      "法拍房历史成交(1)",
    ],
    firstListing: {
      title: "富力津门湖云舒花园2室2厅1卫南朝向173.00万出售",
      roomCount: 2,
      areaSqm: 89,
      totalPriceWan: 173,
      unitPriceYuanPerSqm: 19438,
    },
    secondListing: {
      title: "津门湖纯洋房带阁楼带露台精装修小区中间位置",
      roomCount: 4,
      areaSqm: 160.85,
      totalPriceWan: 530,
      unitPriceYuanPerSqm: 32950,
    },
  },
  {
    fileName: "boxi-huayuan.html",
    communityName: "富力津门湖柏溪花园",
    referencePriceYuanPerSqm: 25302,
    listingCount: 58,
    teaserCount: 3,
    recentDealHints: [
      "西青热搜小区榜第37名",
      "关注量超过同城98%的楼盘",
      "二手房历史成交(122)",
    ],
    firstListing: {
      title: "采光棒能观湖新装修3个月拎包入住给孩子换房出售",
      roomCount: 3,
      areaSqm: 160.08,
      totalPriceWan: 418,
      unitPriceYuanPerSqm: 26112,
    },
    secondListing: {
      title: "梅江,1楼大两室,H户型,环境好,适合养老。",
      roomCount: 2,
      areaSqm: 116.25,
      totalPriceWan: 258,
      unitPriceYuanPerSqm: 22194,
    },
  },
  {
    fileName: "haiyi-changzhou-hanboyuan.html",
    communityName: "海逸长洲瀚波园",
    referencePriceYuanPerSqm: 28064,
    listingCount: 70,
    teaserCount: 3,
    recentDealHints: [
      "西青热搜小区榜第85名",
      "关注量超过同城98%的楼盘",
      "二手房历史成交(210)",
    ],
    firstListing: {
      title: "河西精装海逸长洲瀚波园 2室1厅",
      roomCount: 2,
      areaSqm: 89.14,
      totalPriceWan: 198,
      unitPriceYuanPerSqm: 22212,
    },
    secondListing: {
      title: "西青 海逸长洲瀚波园 4室3厅",
      roomCount: 4,
      areaSqm: 260,
      totalPriceWan: 399,
      unitPriceYuanPerSqm: 15346,
    },
  },
];

function readFixtureHtml(fileName: string): string {
  return readFileSync(
    resolve("tests/fixtures/fang/community", fileName),
    "utf8",
  );
}

function makeZeroListingCommunityHtml(html: string): string {
  return html
    .replace('data-allcount="90"', 'data-allcount="0"')
    .replace(
      /<ul class="esfallhouse" style="display: none;">[\s\S]*?<\/ul>/,
      '<ul class="esfallhouse" style="display: none;"></ul>',
    );
}

describe("parseFangCommunity", () => {
  it.each(communityFixtures)(
    "parses the mobile community fixture for $fileName",
    (fixture) => {
      const parsed = parseFangCommunity(readFixtureHtml(fixture.fileName));

      expect(parsed.communityName).toBe(fixture.communityName);
      expect(parsed.referencePriceYuanPerSqm).toBe(
        fixture.referencePriceYuanPerSqm,
      );
      expect(parsed.listingCount).toBe(fixture.listingCount);
      expect(parsed.recentDealHints).toEqual(
        expect.arrayContaining(fixture.recentDealHints),
      );

      expect(parsed.currentListingTeasers).toHaveLength(fixture.teaserCount);
      expect(parsed.currentListingTeasers[0]).toEqual(
        expect.objectContaining(fixture.firstListing),
      );
      expect(parsed.currentListingTeasers[1]).toEqual(
        expect.objectContaining(fixture.secondListing),
      );
    },
  );

  it("throws when given a structurally wrong page", () => {
    const weekreportHtml = readFileSync(
      resolve("tests/fixtures/fang/weekreport/mingquan-huayuan.html"),
      "utf8",
    );

    expect(() => parseFangCommunity(weekreportHtml)).toThrow();
    expect(() => parseFangCommunity("<html><body>blocked</body></html>")).toThrow();
  });

  it("accepts a structurally valid zero-listing community page", () => {
    const zeroListingHtml = makeZeroListingCommunityHtml(
      readFixtureHtml("mingquan-huayuan.html"),
    );

    expect(parseFangCommunity(zeroListingHtml)).toEqual(
      expect.objectContaining({
        communityName: "富力津门湖鸣泉花园",
        referencePriceYuanPerSqm: 23007,
        listingCount: 0,
        currentListingTeasers: [],
      }),
    );
  });
});
