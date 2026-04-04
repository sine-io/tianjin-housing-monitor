import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { loadCommunities, loadSegments } from "../../lib/config";

const temporaryDirectories: string[] = [];

function writeJsonFixture(fileName: string, data: unknown): string {
  const directory = mkdtempSync(join(tmpdir(), "config-test-"));
  const filePath = join(directory, fileName);

  writeFileSync(filePath, JSON.stringify(data), "utf8");
  temporaryDirectories.push(directory);

  return filePath;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();

    if (directory) {
      rmSync(directory, { force: true, recursive: true });
    }
  }
});

describe("loadCommunities", () => {
  it("returns the frozen provider-aware community contract", () => {
    const communities = loadCommunities();

    expect(communities.map((community) => community.id)).toEqual([
      "mingquan-huayuan",
      "boxi-huayuan",
      "wanke-dongdi",
      "lianhai-yuan",
      "yijing-cun",
    ]);

    expect(communities.find((community) => community.id === "mingquan-huayuan")).toEqual({
      id: "mingquan-huayuan",
      name: "鸣泉花园",
      city: "天津",
      district: "西青",
      status: "active",
      sourceProvider: "fang_mobile",
      sources: {
        fangCommunityUrl: "https://tj.esf.fang.com/loupan/1110750643.htm",
        fangWeekreportUrl:
          "https://tj.esf.fang.com/loupan/1110750643/weekreport.htm",
        anjukeSaleSearchUrl: null,
      },
    });

    expect(communities.find((community) => community.id === "wanke-dongdi")).toEqual({
      id: "wanke-dongdi",
      name: "万科东第",
      city: "天津",
      district: "待确认",
      status: "active",
      sourceProvider: "anjuke_sale_search",
      sources: {
        fangCommunityUrl: null,
        fangWeekreportUrl: null,
        anjukeSaleSearchUrl:
          "https://m.anjuke.com/tj/sale/?kw=%E4%B8%87%E7%A7%91%E4%B8%9C%E7%AC%AC",
      },
    });

    expect(communities.find((community) => community.id === "lianhai-yuan")).toEqual({
      id: "lianhai-yuan",
      name: "恋海园",
      city: "天津",
      district: "待确认",
      status: "pending_verification",
      sourceProvider: "none",
      sources: {
        fangCommunityUrl: null,
        fangWeekreportUrl: null,
        anjukeSaleSearchUrl: null,
      },
    });
  });

  it("requires sourceProvider on every community", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "missing-provider",
        name: "缺少来源",
        city: "天津",
        district: "西青",
        status: "active",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: "https://example.com/community/weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/sourceProvider/i);
  });

  it("requires all three source URL keys with explicit nulls", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "missing-source-key",
        name: "缺少来源字段",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: "https://example.com/community/weekreport",
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/anjukeSaleSearchUrl/i);
  });

  it("keeps pending-verification communities on provider none with all null URLs", () => {
    expect(
      loadCommunities().filter(
        (community) => community.status === "pending_verification",
      ),
    ).toEqual([
      {
        id: "lianhai-yuan",
        name: "恋海园",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sourceProvider: "none",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
          anjukeSaleSearchUrl: null,
        },
      },
      {
        id: "yijing-cun",
        name: "谊景村",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sourceProvider: "none",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
          anjukeSaleSearchUrl: null,
        },
      },
    ]);
  });

  it("rejects unknown source providers", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "unknown-provider",
        name: "错误来源",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "mystery_feed",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: "https://example.com/community/weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/sourceProvider/i);
  });

  it("rejects active fang-mobile communities with a missing Fang URL", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "invalid-fang-provider-combination",
        name: "房天下配置错误",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: "https://example.com/community/weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(
      /fangCommunityUrl|sourceProvider|active/i,
    );
  });

  it("rejects active fang-mobile communities with a live Anjuke search URL", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "invalid-fang-provider-anjuke-url",
        name: "房天下来源混入安居客链接",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: "https://example.com/community/weekreport",
          anjukeSaleSearchUrl: "https://example.com/anjuke-search",
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(
      /anjukeSaleSearchUrl|sourceProvider|active/i,
    );
  });

  it("rejects active anjuke communities without an Anjuke search URL", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "invalid-anjuke-provider-combination",
        name: "安居客配置错误",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "anjuke_sale_search",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
          anjukeSaleSearchUrl: null,
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(
      /anjukeSaleSearchUrl|sourceProvider|active/i,
    );
  });

  it("rejects pending-verification communities unless provider is none with all null URLs", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "invalid-pending-provider-combination",
        name: "待核验配置错误",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
          anjukeSaleSearchUrl: null,
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(
      /pending|sourceProvider|none/i,
    );
  });

  it("rejects pending-verification none communities with a live Anjuke search URL", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "invalid-pending-anjuke-url",
        name: "待核验来源混入安居客链接",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sourceProvider: "none",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
          anjukeSaleSearchUrl: "https://example.com/anjuke-search",
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(
      /anjukeSaleSearchUrl|pending/i,
    );
  });

  it("rejects duplicate community ids at load time", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "duplicate-community",
        name: "社区一",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: "https://example.com/community-1",
          fangWeekreportUrl: "https://example.com/community-1/weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
      {
        id: "duplicate-community",
        name: "社区二",
        city: "天津",
        district: "西青",
        status: "active",
        sourceProvider: "fang_mobile",
        sources: {
          fangCommunityUrl: "https://example.com/community-2",
          fangWeekreportUrl: "https://example.com/community-2/weekreport",
          anjukeSaleSearchUrl: null,
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/Duplicate community id/);
  });
});

describe("loadSegments", () => {
  it("returns one provider-aware primary segment per community", () => {
    const communities = loadCommunities();
    const segments = loadSegments();
    const communityIds = new Set(communities.map((community) => community.id));

    expect(segments).toEqual([
      {
        communityId: "mingquan-huayuan",
        id: "mingquan-2br-87-90",
        label: "2居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
      {
        communityId: "boxi-huayuan",
        id: "boxi-2br-100-120",
        label: "2居 100-120㎡",
        rooms: 2,
        areaMin: 100,
        areaMax: 120,
      },
      {
        communityId: "wanke-dongdi",
        id: "wanke-2br-85-90",
        label: "2居 85-90㎡",
        rooms: 2,
        areaMin: 85,
        areaMax: 90,
      },
      {
        communityId: "lianhai-yuan",
        id: "lianhai-2br-90-110",
        label: "2居 90-110㎡",
        rooms: 2,
        areaMin: 90,
        areaMax: 110,
      },
      {
        communityId: "yijing-cun",
        id: "yijing-2br-75-90",
        label: "2居 75-90㎡",
        rooms: 2,
        areaMin: 75,
        areaMax: 90,
      },
    ]);

    expect(segments).toHaveLength(communities.length);
    expect(new Set(segments.map((segment) => segment.communityId)).size).toBe(
      communities.length,
    );
    expect(segments.every((segment) => communityIds.has(segment.communityId))).toBe(
      true,
    );
  });

  it("rejects duplicate segment ids at load time", () => {
    const fixturePath = writeJsonFixture("segments.json", [
      {
        communityId: "mingquan-huayuan",
        id: "duplicate-segment",
        label: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
      {
        communityId: "boxi-huayuan",
        id: "duplicate-segment",
        label: "两居 100-120㎡",
        rooms: 2,
        areaMin: 100,
        areaMax: 120,
      },
    ]);

    expect(() => loadSegments(fixturePath)).toThrow(/Duplicate segment id/);
  });

  it("rejects segments that reference an unknown community id", () => {
    const fixturePath = writeJsonFixture("segments.json", [
      {
        communityId: "unknown-community",
        id: "unknown-community-2br-87-90",
        label: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
    ]);

    expect(() => loadSegments(fixturePath, [])).toThrow(
      /Unknown segment communityId/,
    );
  });

  it("rejects fixtures when one community is missing a segment", () => {
    const fixturePath = writeJsonFixture("segments.json", [
      {
        communityId: "community-a",
        id: "community-a-2br-87-90",
        label: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
    ]);

    expect(() =>
      loadSegments(fixturePath, [
        {
          id: "community-a",
          name: "社区 A",
          city: "天津",
          district: "西青",
          status: "active",
          sourceProvider: "fang_mobile",
          sources: {
            fangCommunityUrl: "https://example.com/community-a",
            fangWeekreportUrl: "https://example.com/community-a/weekreport",
            anjukeSaleSearchUrl: null,
          },
        },
        {
          id: "community-b",
          name: "社区 B",
          city: "天津",
          district: "西青",
          status: "active",
          sourceProvider: "fang_mobile",
          sources: {
            fangCommunityUrl: "https://example.com/community-b",
            fangWeekreportUrl: "https://example.com/community-b/weekreport",
            anjukeSaleSearchUrl: null,
          },
        },
      ]),
    ).toThrow(/Expected exactly one segment for community: community-b/);
  });

  it("rejects fixtures when one community has multiple segments", () => {
    const fixturePath = writeJsonFixture("segments.json", [
      {
        communityId: "community-a",
        id: "community-a-2br-87-90",
        label: "两居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
      {
        communityId: "community-a",
        id: "community-a-3br-100-110",
        label: "三居 100-110㎡",
        rooms: 3,
        areaMin: 100,
        areaMax: 110,
      },
    ]);

    expect(() =>
      loadSegments(fixturePath, [
        {
          id: "community-a",
          name: "社区 A",
          city: "天津",
          district: "西青",
          status: "active",
          sourceProvider: "fang_mobile",
          sources: {
            fangCommunityUrl: "https://example.com/community-a",
            fangWeekreportUrl: "https://example.com/community-a/weekreport",
            anjukeSaleSearchUrl: null,
          },
        },
      ]),
    ).toThrow(/Expected exactly one segment for community: community-a/);
  });

  it("does not freeze exact primary segment ids for non-wanke communities", () => {
    const fixturePath = writeJsonFixture("segments.json", [
      {
        communityId: "mingquan-huayuan",
        id: "mingquan-custom-primary",
        label: "两居 自定义主段",
        rooms: 2,
        areaMin: 86,
        areaMax: 91,
      },
    ]);

    expect(() =>
      loadSegments(fixturePath, [
        {
          id: "mingquan-huayuan",
          name: "鸣泉花园",
          city: "天津",
          district: "西青",
          status: "active",
          sourceProvider: "fang_mobile",
          sources: {
            fangCommunityUrl: "https://example.com/mingquan-huayuan",
            fangWeekreportUrl: "https://example.com/mingquan-huayuan/weekreport",
            anjukeSaleSearchUrl: null,
          },
        },
      ]),
    ).not.toThrow();
  });

  it("does not freeze exact primary segment ids for wanke communities in shared loader", () => {
    const fixturePath = writeJsonFixture("segments.json", [
      {
        communityId: "wanke-dongdi",
        id: "wanke-custom-primary",
        label: "两居 自定义主段",
        rooms: 2,
        areaMin: 84,
        areaMax: 91,
      },
    ]);

    expect(() =>
      loadSegments(fixturePath, [
        {
          id: "wanke-dongdi",
          name: "万科东第",
          city: "天津",
          district: "待确认",
          status: "active",
          sourceProvider: "anjuke_sale_search",
          sources: {
            fangCommunityUrl: null,
            fangWeekreportUrl: null,
            anjukeSaleSearchUrl: "https://example.com/anjuke-search",
          },
        },
      ]),
    ).not.toThrow();
  });
});
