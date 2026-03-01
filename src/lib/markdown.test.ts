import { describe, expect, it } from "vitest";

import { createHeadingId, extractMarkdownHeadings, slugifyHeadingText } from "@/lib/markdown";

describe("markdown helpers", () => {
  it("slugifies unicode headings", () => {
    expect(slugifyHeadingText("概率 论 / Bayes!")).toBe("概率-论-bayes");
  });

  it("creates unique heading ids with counters", () => {
    const seen = new Map<string, number>();
    expect(createHeadingId("Overview", seen)).toBe("overview");
    expect(createHeadingId("Overview", seen)).toBe("overview-2");
  });

  it("extracts headings and skips fenced code blocks", () => {
    const md = [
      "# 第一章",
      "```md",
      "## not heading",
      "```",
      "## 第二节",
      "### [带链接](https://example.com)",
    ].join("\n");

    expect(extractMarkdownHeadings(md, 3)).toEqual([
      { id: "第一章", text: "第一章", level: 1 },
      { id: "第二节", text: "第二节", level: 2 },
      { id: "带链接", text: "带链接", level: 3 },
    ]);
  });
});
