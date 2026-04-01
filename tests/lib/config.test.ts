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
  it("returns the frozen phase-1 community contract", () => {
    const communities = loadCommunities();

    expect(communities.map((community) => community.id)).toEqual([
      "mingquan-huayuan",
      "boxi-huayuan",
      "lianhai-yuan",
      "wanke-dongdi",
      "yijing-cun",
    ]);

    expect(communities.map((community) => community.status)).toEqual([
      "active",
      "active",
      "pending_verification",
      "pending_verification",
      "pending_verification",
    ]);

    expect(communities[0]).toEqual({
      id: "mingquan-huayuan",
      name: "鸣泉花园",
      city: "天津",
      district: "西青",
      status: "active",
      sources: {
        fangCommunityUrl: "https://tj.esf.fang.com/loupan/1110750643.htm",
        fangWeekreportUrl:
          "https://tj.esf.fang.com/loupan/1110750643/weekreport.htm",
      },
    });

    expect(communities[2]).toEqual({
      id: "lianhai-yuan",
      name: "恋海园",
      city: "天津",
      district: "待确认",
      status: "pending_verification",
      sources: {
        fangCommunityUrl: null,
        fangWeekreportUrl: null,
      },
    });
  });

  it("requires status on every community", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "missing-status",
        name: "缺少状态",
        city: "天津",
        district: "西青",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: "https://example.com/community/weekreport",
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/status/i);
  });

  it("rejects unsupported community status values", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "invalid-status",
        name: "错误状态",
        city: "天津",
        district: "西青",
        status: "disabled",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: "https://example.com/community/weekreport",
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/status/i);
  });

  it("allows pending-verification communities to keep null Fang source URLs", () => {
    const communities = loadCommunities();

    expect(
      communities.filter(
        (community) => community.status === "pending_verification",
      ),
    ).toEqual([
      {
        id: "lianhai-yuan",
        name: "恋海园",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
        },
      },
      {
        id: "wanke-dongdi",
        name: "万科东第",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
        },
      },
      {
        id: "yijing-cun",
        name: "谊景村",
        city: "天津",
        district: "待确认",
        status: "pending_verification",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: null,
        },
      },
    ]);
  });

  it("rejects active communities with null Fang source URLs", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "active-missing-community-url",
        name: "缺少房天下链接",
        city: "天津",
        district: "西青",
        status: "active",
        sources: {
          fangCommunityUrl: null,
          fangWeekreportUrl: "https://example.com/community/weekreport",
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/fang.*url|active/i);
  });

  it("rejects active communities with a null Fang weekreport URL", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "active-missing-weekreport-url",
        name: "缺少周报链接",
        city: "天津",
        district: "西青",
        status: "active",
        sources: {
          fangCommunityUrl: "https://example.com/community",
          fangWeekreportUrl: null,
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/fang.*url|active/i);
  });

  it("rejects duplicate community ids at load time", () => {
    const fixturePath = writeJsonFixture("communities.json", [
      {
        id: "duplicate-community",
        name: "社区一",
        city: "天津",
        district: "西青",
        status: "active",
        sources: {
          fangCommunityUrl: "https://example.com/community-1",
          fangWeekreportUrl: "https://example.com/community-1/weekreport",
        },
      },
      {
        id: "duplicate-community",
        name: "社区二",
        city: "天津",
        district: "西青",
        status: "active",
        sources: {
          fangCommunityUrl: "https://example.com/community-2",
          fangWeekreportUrl: "https://example.com/community-2/weekreport",
        },
      },
    ]);

    expect(() => loadCommunities(fixturePath)).toThrow(/Duplicate community id/);
  });
});

describe("loadSegments", () => {
  it("returns one primary segment per community in phase 1", () => {
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
        communityId: "lianhai-yuan",
        id: "lianhai-2br-90-110",
        label: "2居 90-110㎡",
        rooms: 2,
        areaMin: 90,
        areaMax: 110,
      },
      {
        communityId: "wanke-dongdi",
        id: "wanke-3br-100-105",
        label: "3居 100-105㎡",
        rooms: 3,
        areaMin: 100,
        areaMax: 105,
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
          sources: {
            fangCommunityUrl: "https://example.com/community-a",
            fangWeekreportUrl: "https://example.com/community-a/weekreport",
          },
        },
        {
          id: "community-b",
          name: "社区 B",
          city: "天津",
          district: "西青",
          status: "active",
          sources: {
            fangCommunityUrl: "https://example.com/community-b",
            fangWeekreportUrl: "https://example.com/community-b/weekreport",
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
          sources: {
            fangCommunityUrl: "https://example.com/community-a",
            fangWeekreportUrl: "https://example.com/community-a/weekreport",
          },
        },
      ]),
    ).toThrow(/Expected exactly one segment for community: community-a/);
  });
});
