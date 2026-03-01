"use client";

import { useDeferredValue, useRef, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  handleMarkdownEditorKeyDown,
  insertMarkdownSnippetFromRef,
} from "@/lib/markdown-editor-utils";

type ToolbarAction = {
  key: string;
  label: string;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { key: "heading", label: "标题" },
  { key: "list", label: "列表" },
  { key: "quote", label: "引用" },
  { key: "codeBlock", label: "代码块" },
  { key: "bold", label: "粗体" },
  { key: "italic", label: "斜体" },
  { key: "link", label: "链接" },
  { key: "inlineCode", label: "行内代码" },
  { key: "mathInline", label: "公式" },
  { key: "mathBlock", label: "块公式" },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  submitHint = "快捷键: Cmd/Ctrl + Enter 提交",
  onSubmit,
  mobileMinHeightClass = "min-h-[44vh] sm:min-h-[50vh]",
  desktopMinHeightClass = "min-h-[66vh]",
  previewEmptyText = "暂无内容",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  submitHint?: string;
  onSubmit?: () => void;
  mobileMinHeightClass?: string;
  desktopMinHeightClass?: string;
  previewEmptyText?: string;
  className?: string;
}) {
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const deferredValue = useDeferredValue(value);

  function applyToolbarAction(key: string) {
    if (key === "heading") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "## ", "", "二级标题");
      return;
    }
    if (key === "list") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "- ", "", "列表项");
      return;
    }
    if (key === "quote") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "> ", "", "引用");
      return;
    }
    if (key === "codeBlock") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "```ts\n", "\n```", "code");
      return;
    }
    if (key === "bold") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "**", "**", "加粗文本");
      return;
    }
    if (key === "italic") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "*", "*", "斜体文本");
      return;
    }
    if (key === "link") {
      insertMarkdownSnippetFromRef(
        textareaRef,
        value,
        onChange,
        "[",
        "](https://example.com)",
        "链接文本",
      );
      return;
    }
    if (key === "inlineCode") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "`", "`", "code");
      return;
    }
    if (key === "mathInline") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "$", "$", "E=mc^2");
      return;
    }
    if (key === "mathBlock") {
      insertMarkdownSnippetFromRef(textareaRef, value, onChange, "$$\n", "\n$$", "\\int_0^1 x^2dx");
    }
  }

  function copyMarkdown() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <section className={className ? `panel-soft ${className}` : "panel-soft"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Markdown 正文</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-2">{submitHint}</p>
          <button className="btn-secondary h-8 px-3 text-xs" onClick={copyMarkdown}>
            {copied ? "已复制" : "复制 Markdown"}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.key}
            className="btn-secondary h-9 px-3 text-sm"
            onClick={() => applyToolbarAction(action.key)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3 md:hidden">
        <div className="flex w-fit rounded-lg border border-border bg-surface p-1">
          <button
            className={`h-9 rounded-md px-3 text-sm transition-colors ${
              mobileTab === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-strong hover:bg-surface-soft"
            }`}
            onClick={() => setMobileTab("edit")}
            type="button"
          >
            编辑
          </button>
          <button
            className={`h-9 rounded-md px-3 text-sm transition-colors ${
              mobileTab === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-strong hover:bg-surface-soft"
            }`}
            onClick={() => setMobileTab("preview")}
            type="button"
          >
            预览
          </button>
        </div>

        {mobileTab === "edit" ? (
          <textarea
            ref={textareaRef}
            className={`w-full resize-y rounded-lg border border-border bg-surface p-3 font-mono text-sm leading-6 ${mobileMinHeightClass}`}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            onKeyDown={(event) =>
              handleMarkdownEditorKeyDown({
                event,
                textareaRef,
                value,
                setValue: onChange,
                onSubmit,
              })
            }
          />
        ) : (
          <div
            className={`rounded-lg border border-border bg-surface p-3 text-sm ${mobileMinHeightClass}`}
          >
            {deferredValue.trim() ? (
              <MarkdownRenderer>{deferredValue}</MarkdownRenderer>
            ) : (
              <p className="text-muted-2">{previewEmptyText}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 hidden grid-cols-1 gap-3 md:grid lg:grid-cols-2">
        <textarea
          ref={textareaRef}
          className={`w-full resize-y rounded-lg border border-border bg-surface p-3 font-mono text-sm leading-6 ${desktopMinHeightClass}`}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          onKeyDown={(event) =>
            handleMarkdownEditorKeyDown({
              event,
              textareaRef,
              value,
              setValue: onChange,
              onSubmit,
            })
          }
        />
        <div
          className={`rounded-lg border border-border bg-surface p-3 text-sm ${desktopMinHeightClass}`}
        >
          {deferredValue.trim() ? (
            <MarkdownRenderer>{deferredValue}</MarkdownRenderer>
          ) : (
            <p className="text-muted-2">{previewEmptyText}</p>
          )}
        </div>
      </div>
    </section>
  );
}
