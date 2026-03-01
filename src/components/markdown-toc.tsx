"use client";

import type { MouseEvent } from "react";

import { extractMarkdownHeadings } from "@/lib/markdown";

export function MarkdownToc({
  markdown,
  className,
  title = "目录",
  maxDepth = 4,
}: {
  markdown: string;
  className?: string;
  title?: string;
  maxDepth?: number;
}) {
  const headings = extractMarkdownHeadings(markdown, maxDepth);
  if (headings.length < 2) {
    return null;
  }

  function scrollToHeading(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  }

  return (
    <nav className={className ? `markdown-toc ${className}` : "markdown-toc"} aria-label="目录">
      <p className="markdown-toc-title">{title}</p>
      <ol className="markdown-toc-list">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 0.75}rem` }}
          >
            <a href={`#${heading.id}`} onClick={(event) => scrollToHeading(event, heading.id)}>
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
