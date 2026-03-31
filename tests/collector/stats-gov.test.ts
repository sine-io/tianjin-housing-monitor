import { describe, expect, it } from "vitest";

import * as statsGovCollector from "../../collector/stats-gov";

describe("collector/stats-gov", () => {
  it("resolves fallback index links against the fallback releases base URL", () => {
    const findLatestStatsGovReportUrl = (
      statsGovCollector as {
        findLatestStatsGovReportUrl?: (
          html: string,
          baseUrl: string,
        ) => string | null;
      }
    ).findLatestStatsGovReportUrl;

    expect(findLatestStatsGovReportUrl).toBeTypeOf("function");
    expect(
      findLatestStatsGovReportUrl?.(
        `
          <html>
            <body>
              <a href="./202603/t20260317_1967590.html">
                2026年2月份70个大中城市商品住宅销售价格变动情况
              </a>
            </body>
          </html>
        `,
        "https://www.stats.gov.cn/sj/zxfbhjd/",
      ),
    ).toBe(
      "https://www.stats.gov.cn/sj/zxfbhjd/202603/t20260317_1967590.html",
    );
  });
});
