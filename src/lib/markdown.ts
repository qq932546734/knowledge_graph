export type MarkdownHeading = {
  id: string;
  text: string;
  level: number;
};

const CODE_FENCE_RE = /^\s*(```|~~~)/;
const ATX_HEADING_RE = /^(#{1,6})\s+(.*)$/;

export function slugifyHeadingText(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || "section";
}

export function createHeadingId(text: string, seen: Map<string, number>): string {
  const base = slugifyHeadingText(text);
  const count = seen.get(base) ?? 0;
  const nextCount = count + 1;
  seen.set(base, nextCount);
  return nextCount === 1 ? base : `${base}-${nextCount}`;
}

function stripInlineMarkdown(input: string): string {
  return input
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]+/g, "")
    .trim();
}

export function extractMarkdownHeadings(markdown: string, maxDepth = 4): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const seen = new Map<string, number>();
  let inCodeFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (CODE_FENCE_RE.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    const matched = line.match(ATX_HEADING_RE);
    if (!matched) {
      continue;
    }

    const level = matched[1].length;
    if (level > maxDepth) {
      continue;
    }

    const rawTitle = matched[2].replace(/\s+#+\s*$/, "");
    const text = stripInlineMarkdown(rawTitle);
    if (!text) {
      continue;
    }

    headings.push({
      id: createHeadingId(text, seen),
      text,
      level,
    });
  }

  return headings;
}
