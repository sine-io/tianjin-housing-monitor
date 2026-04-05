import { existsSync, readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadDashboardData,
  loadRecentRunArtifacts,
} from "../../site/src/lib/load-json";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function installFetchMock(routes: Record<string, Response>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      for (const [suffix, response] of Object.entries(routes)) {
        if (url.endsWith(suffix)) {
          return response.clone();
        }
      }

      return new Response("not found", { status: 404 });
    }),
  );
}

function installPublicDataFetchMock(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const relativePath = url.match(/data\/.+$/)?.[0];

      if (!relativePath) {
        return new Response("not found", { status: 404 });
      }

      const fileUrl = new URL(`../../site/public/${relativePath}`, import.meta.url);

      if (!existsSync(fileUrl)) {
        return new Response("not found", { status: 404 });
      }

      return new Response(readFileSync(fileUrl, "utf8"), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("loadDashboardData", () => {
  it("builds an explicit primary segment lookup keyed by communityId", async () => {
    installFetchMock({
      "data/config/communities.json": jsonResponse([
        {
          id: "mingquan-huayuan",
          name: "鸣泉花园",
          city: "天津",
          district: "西青",
          status: "active",
          sourceProvider: "fang_mobile",
          sources: {
            fangCommunityUrl: "https://example.com/mingquan/community",
            fangWeekreportUrl: "https://example.com/mingquan/weekreport",
            anjukeSaleSearchUrl: null,
          },
        },
        {
          id: "boxi-huayuan",
          name: "柏溪花园",
          city: "天津",
          district: "西青",
          status: "active",
          sourceProvider: "fang_mobile",
          sources: {
            fangCommunityUrl: "https://example.com/boxi/community",
            fangWeekreportUrl: "https://example.com/boxi/weekreport",
            anjukeSaleSearchUrl: null,
          },
        },
      ]),
      "data/config/segments.json": jsonResponse([
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
      ]),
      "data/series/city-market/tianjin.json": jsonResponse({
        city: "天津",
        series: [
          {
            date: "2026-04-01",
            generatedAt: "2026-04-01T07:32:04.312Z",
            sourceMonth: "2026-02",
            secondaryHomePriceIndexMom: 99.5,
            secondaryHomePriceIndexYoy: 94,
            verdict: "偏弱",
          },
        ],
      }),
    });

    const data = await loadDashboardData();

    expect(data.primarySegmentsByCommunityId).toEqual({
      "mingquan-huayuan": {
        communityId: "mingquan-huayuan",
        id: "mingquan-2br-87-90",
        label: "2居 87-90㎡",
        rooms: 2,
        areaMin: 87,
        areaMax: 90,
      },
      "boxi-huayuan": {
        communityId: "boxi-huayuan",
        id: "boxi-2br-100-120",
        label: "2居 100-120㎡",
        rooms: 2,
        areaMin: 100,
        areaMax: 120,
      },
    });
  });

  it("fails loudly when a community status is missing from the generated public config", async () => {
    installFetchMock({
      "data/config/communities.json": jsonResponse([
        {
          id: "lianhai-yuan",
          name: "恋海园",
          city: "天津",
          district: "待确认",
          sourceProvider: "none",
          sources: {
            fangCommunityUrl: null,
            fangWeekreportUrl: null,
            anjukeSaleSearchUrl: null,
          },
        },
      ]),
      "data/config/segments.json": jsonResponse([
        {
          communityId: "lianhai-yuan",
          id: "lianhai-2br-90-110",
          label: "2居 90-110㎡",
          rooms: 2,
          areaMin: 90,
          areaMax: 110,
        },
      ]),
      "data/series/city-market/tianjin.json": jsonResponse({
        city: "天津",
        series: [
          {
            date: "2026-04-01",
            generatedAt: "2026-04-01T07:32:04.312Z",
            sourceMonth: "2026-02",
            secondaryHomePriceIndexMom: 99.5,
            secondaryHomePriceIndexYoy: 94,
            verdict: "偏弱",
          },
        ],
      }),
    });

    await expect(loadDashboardData()).rejects.toThrow(/lianhai-yuan.+status/i);
  });

  it("fails loudly when a community has more than one primary segment", async () => {
    installFetchMock({
      "data/config/communities.json": jsonResponse([
        {
          id: "mingquan-huayuan",
          name: "鸣泉花园",
          city: "天津",
          district: "西青",
          status: "active",
          sourceProvider: "fang_mobile",
          sources: {
            fangCommunityUrl: "https://example.com/mingquan/community",
            fangWeekreportUrl: "https://example.com/mingquan/weekreport",
            anjukeSaleSearchUrl: null,
          },
        },
      ]),
      "data/config/segments.json": jsonResponse([
        {
          communityId: "mingquan-huayuan",
          id: "mingquan-2br-87-90",
          label: "2居 87-90㎡",
          rooms: 2,
          areaMin: 87,
          areaMax: 90,
        },
        {
          communityId: "mingquan-huayuan",
          id: "mingquan-3br-120-140",
          label: "3居 120-140㎡",
          rooms: 3,
          areaMin: 120,
          areaMax: 140,
        },
      ]),
      "data/series/city-market/tianjin.json": jsonResponse({
        city: "天津",
        series: [
          {
            date: "2026-04-01",
            generatedAt: "2026-04-01T07:32:04.312Z",
            sourceMonth: "2026-02",
            secondaryHomePriceIndexMom: 99.5,
            secondaryHomePriceIndexYoy: 94,
            verdict: "偏弱",
          },
        ],
      }),
    });

    await expect(loadDashboardData()).rejects.toThrow(
      /mingquan-huayuan.+exactly one primary segment/i,
    );
  });

  it("loads generated public communities with sourceProvider and all three source keys", async () => {
    installPublicDataFetchMock();

    const data = await loadDashboardData();
    const wanke = data.communities.find((community) => community.id === "wanke-dongdi");

    expect(wanke).toMatchObject({
      id: "wanke-dongdi",
      sourceProvider: "anjuke_sale_search",
      sources: {
        fangCommunityUrl: null,
        fangWeekreportUrl: null,
      },
    });
    expect(wanke?.sources.anjukeSaleSearchUrl).toMatch(/anjuke\.com/);

    for (const community of data.communities) {
      expect(Object.keys(community.sources).sort()).toEqual([
        "anjukeSaleSearchUrl",
        "fangCommunityUrl",
        "fangWeekreportUrl",
      ]);
    }
  });
});

describe("loadRecentRunArtifacts", () => {
  it("loads the most recent run artifacts from index.json in ascending generatedAt order", async () => {
    installFetchMock({
      "data/runs/index.json": jsonResponse({
        files: [
          "2026-04-05T04-10-57.573Z.json",
          "2026-04-04T13-59-55.172Z.json",
          "2026-04-03T14-08-04.569Z.json",
        ],
      }),
      "data/runs/2026-04-04T13-59-55.172Z.json": jsonResponse({
        generatedAt: "2026-04-04T13:59:55.172Z",
        sources: {},
        communities: {},
      }),
      "data/runs/2026-04-05T04-10-57.573Z.json": jsonResponse({
        generatedAt: "2026-04-05T04:10:57.573Z",
        sources: {},
        communities: {},
      }),
      "data/runs/2026-04-03T14-08-04.569Z.json": jsonResponse({
        generatedAt: "2026-04-03T14:08:04.569Z",
        sources: {},
        communities: {},
      }),
      "data/runs/latest.json": jsonResponse({
        generatedAt: "2026-04-05T04:10:57.573Z",
        sources: {},
        communities: {},
      }),
    });

    const runs = await loadRecentRunArtifacts(2);

    expect(runs.map((run) => run.generatedAt)).toEqual([
      "2026-04-04T13:59:55.172Z",
      "2026-04-05T04:10:57.573Z",
    ]);
  });

  it("falls back to latest.json when index.json is missing", async () => {
    installFetchMock({
      "data/runs/latest.json": jsonResponse({
        generatedAt: "2026-04-05T04:10:57.573Z",
        sources: {},
        communities: {},
      }),
    });

    const runs = await loadRecentRunArtifacts();

    expect(runs.map((run) => run.generatedAt)).toEqual([
      "2026-04-05T04:10:57.573Z",
    ]);
  });

  it("skips missing indexed files and still returns available artifacts in ascending order", async () => {
    installFetchMock({
      "data/runs/index.json": jsonResponse({
        files: [
          "2026-04-05T04-10-57.573Z.json",
          "2026-04-04T13-59-55.172Z.json",
        ],
      }),
      "data/runs/2026-04-05T04-10-57.573Z.json": jsonResponse({
        generatedAt: "2026-04-05T04:10:57.573Z",
        sources: {},
        communities: {},
      }),
      "data/runs/latest.json": jsonResponse({
        generatedAt: "2026-04-05T04:10:57.573Z",
        sources: {},
        communities: {},
      }),
    });

    const runs = await loadRecentRunArtifacts(5);

    expect(runs.map((run) => run.generatedAt)).toEqual([
      "2026-04-05T04:10:57.573Z",
    ]);
  });
});
