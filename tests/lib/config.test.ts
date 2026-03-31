import { describe, expect, it } from "vitest";

import { loadCommunities, loadSegments } from "../../lib/config";

describe("loadCommunities", () => {
  it("returns the frozen community ids", () => {
    expect(loadCommunities().map((community) => community.id)).toEqual([
      "mingquan-huayuan",
      "jiajun-huayuan",
      "yunshu-huayuan",
      "boxi-huayuan",
      "haiyi-changzhou-hanboyuan",
    ]);
  });
});

describe("loadSegments", () => {
  it("returns the frozen segment ids", () => {
    expect(loadSegments().map((segment) => segment.id)).toEqual([
      "2br-87-90",
      "3br-140-150",
    ]);
  });
});
