"use client";

import { isValidElement, useState, type HTMLAttributes, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { createHeadingId } from "@/lib/markdown";

function flattenNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => flattenNodeText(child)).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenNodeText(node.props.children);
  }

  return "";
}

function createHeadingRenderer(
  tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
  seen: Map<string, number>,
) {
  return function Heading({
    children,
    ...props
  }: HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) {
    const text = flattenNodeText(children).trim();
    const id = createHeadingId(text || "section", seen);
    const Tag = tag;

    return (
      <Tag id={id} {...props}>
        <a href={`#${id}`} className="markdown-heading-anchor" aria-label={`跳转到 ${text}`}>
          #
        </a>
        {children}
      </Tag>
    );
  };
}

function MarkdownCodeBlock({ children, ...props }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeText = flattenNodeText(children).replace(/\n$/, "");
  const codeClassName = isValidElement<{ className?: string }>(children)
    ? children.props.className
    : undefined;
  const language = codeClassName?.match(/language-([a-z0-9_-]+)/i)?.[1] ?? "text";

  function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <div className="markdown-codeblock">
      <div className="markdown-codeblock-meta">
        <span>{language}</span>
        <button type="button" onClick={handleCopy}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre {...props}>{children}</pre>
    </div>
  );
}

function createMarkdownComponents(): Components {
  const seen = new Map<string, number>();

  return {
    h1: createHeadingRenderer("h1", seen),
    h2: createHeadingRenderer("h2", seen),
    h3: createHeadingRenderer("h3", seen),
    h4: createHeadingRenderer("h4", seen),
    h5: createHeadingRenderer("h5", seen),
    h6: createHeadingRenderer("h6", seen),
    a: ({ href, ...props }) => {
      const isExternal = Boolean(href && /^https?:\/\//.test(href));
      return (
        <a
          href={href}
          {...props}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer noopener" : undefined}
        />
      );
    },
    table: ({ ...props }) => (
      <div className="markdown-table-wrap">
        <table {...props} />
      </div>
    ),
    pre: ({ children, ...props }) => <MarkdownCodeBlock {...props}>{children}</MarkdownCodeBlock>,
  };
}

export function MarkdownRenderer({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const mergedClassName = className ? `markdown ${className}` : "markdown";
  const components = createMarkdownComponents();

  return (
    <div className={mergedClassName}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeHighlight, { ignoreMissing: true }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
