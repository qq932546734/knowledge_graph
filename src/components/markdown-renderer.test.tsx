// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { MarkdownRenderer } from "@/components/markdown-renderer";

describe("MarkdownRenderer", () => {
  it("adds safe attrs for external links", () => {
    render(<MarkdownRenderer>{"[OpenAI](https://openai.com)"}</MarkdownRenderer>);

    const link = screen.getByRole("link", { name: "OpenAI" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
  });

  it("keeps internal links in same tab", () => {
    render(<MarkdownRenderer>{"[Node Detail](/nodes/1)"}</MarkdownRenderer>);

    const link = screen.getByRole("link", { name: "Node Detail" });
    expect(link.getAttribute("target")).toBeNull();
    expect(link.getAttribute("rel")).toBeNull();
  });

  it("renders GFM tables and task list items", () => {
    const markdown = [
      "| col-a | col-b |",
      "| --- | --- |",
      "| v1 | v2 |",
      "",
      "- [x] done",
      "- [ ] todo",
    ].join("\n");

    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);
    expect(container.querySelector("table")).not.toBeNull();

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it("renders task list class hooks for markdown styling", () => {
    const markdown = ["- [x] done", "- [ ] todo"].join("\n");

    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);
    const taskItems = container.querySelectorAll("li.task-list-item");
    expect(taskItems).toHaveLength(2);

    const checkboxes = container.querySelectorAll('li.task-list-item input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
  });

  it("keeps nested ordered and unordered list structure", () => {
    const markdown = [
      "1. first",
      "   1. child ordered",
      "   2. child ordered two",
      "2. second",
      "   - child bullet",
      "     - grand child bullet",
    ].join("\n");

    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    const nestedOrderedLists = container.querySelectorAll("ol ol");
    expect(nestedOrderedLists.length).toBeGreaterThan(0);

    const nestedUnorderedLists = container.querySelectorAll("ol ul, ul ul");
    expect(nestedUnorderedLists.length).toBeGreaterThan(0);
  });

  it("renders fenced code blocks with highlight class", () => {
    const { container } = render(<MarkdownRenderer>{"```ts\nconst a = 1;\n```"}</MarkdownRenderer>);

    const code = container.querySelector("pre code");
    expect(code).not.toBeNull();
    expect(code?.className).toContain("hljs");
  });

  it("wraps tables with a scroll container", () => {
    const markdown = ["| c1 | c2 | c3 |", "| --- | --- | --- |", "| a | b | c |"].join("\n");

    const { container } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);
    const tableWrap = container.querySelector(".markdown-table-wrap");
    const table = tableWrap?.querySelector("table");

    expect(tableWrap).not.toBeNull();
    expect(table).not.toBeNull();
  });

  it("converts single line breaks to br via remark-breaks", () => {
    const { container } = render(<MarkdownRenderer>{"line 1\nline 2"}</MarkdownRenderer>);

    const paragraph = container.querySelector("p");
    expect(paragraph).not.toBeNull();
    expect(paragraph?.querySelector("br")).not.toBeNull();
  });

  it("does not auto-detect language class for unlabeled fenced code blocks", () => {
    const { container } = render(<MarkdownRenderer>{"```\nconst x = 1;\n```"}</MarkdownRenderer>);

    const code = container.querySelector("pre code");
    expect(code).not.toBeNull();
    expect(code?.className).not.toContain("language-");
  });

  it("renders inline math with katex markup", () => {
    const { container } = render(<MarkdownRenderer>{"内联公式 $E=mc^2$"}</MarkdownRenderer>);
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("renders block math with katex display markup", () => {
    const { container } = render(<MarkdownRenderer>{"$$\n\\int_0^1 x^2 dx\n$$"}</MarkdownRenderer>);
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("adds heading anchors and deterministic ids", () => {
    const { container } = render(<MarkdownRenderer>{"## 标题\n\n## 标题"}</MarkdownRenderer>);

    const headings = container.querySelectorAll("h2");
    expect(headings).toHaveLength(2);
    expect(headings[0]?.id).toBe("标题");
    expect(headings[1]?.id).toBe("标题-2");
    expect(headings[0]?.querySelector(".markdown-heading-anchor")).not.toBeNull();
  });

  it("keeps heading ids stable across rerenders", () => {
    const markdown = "## 标题\n\n## 标题";
    const { container, rerender } = render(<MarkdownRenderer>{markdown}</MarkdownRenderer>);

    const firstPass = [...container.querySelectorAll("h2")].map((heading) => heading.id);
    rerender(<MarkdownRenderer>{markdown}</MarkdownRenderer>);
    const secondPass = [...container.querySelectorAll("h2")].map((heading) => heading.id);

    expect(firstPass).toEqual(["标题", "标题-2"]);
    expect(secondPass).toEqual(firstPass);
  });
});
