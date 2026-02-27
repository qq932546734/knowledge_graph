import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
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
};

export function MarkdownRenderer({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const mergedClassName = className ? `markdown ${className}` : "markdown";

  return (
    <div className={mergedClassName}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
