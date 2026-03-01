import type React from "react";

function updateTextareaSelection(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
  focus = true,
) {
  requestAnimationFrame(() => {
    if (focus) {
      textarea.focus();
    }
    textarea.setSelectionRange(start, end);
  });
}

export function insertMarkdownSnippet(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  prefix: string,
  suffix = "",
  placeholder = "内容",
) {
  if (!textarea) {
    setValue(`${value}${prefix}${placeholder}${suffix}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const content = selected || placeholder;
  const wrapped = `${prefix}${content}${suffix}`;
  const next = `${value.slice(0, start)}${wrapped}${value.slice(end)}`;
  setValue(next);

  const nextStart = start + prefix.length;
  const nextEnd = nextStart + content.length;
  updateTextareaSelection(textarea, nextStart, nextEnd);
}

export function insertMarkdownSnippetFromRef(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  setValue: (next: string) => void,
  prefix: string,
  suffix = "",
  placeholder = "内容",
) {
  insertMarkdownSnippet(textareaRef.current, value, setValue, prefix, suffix, placeholder);
}

export function indentSelectedLines(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  shift = false,
) {
  if (!textarea) {
    return;
  }

  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const blockStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const blockEndLine = value.indexOf("\n", selectionEnd);
  const blockEnd = blockEndLine === -1 ? value.length : blockEndLine;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");

  const transformed = lines.map((line) => {
    if (!shift) {
      return `  ${line}`;
    }

    if (line.startsWith("  ")) {
      return line.slice(2);
    }
    if (line.startsWith("\t")) {
      return line.slice(1);
    }
    return line;
  });

  const nextBlock = transformed.join("\n");
  const next = `${value.slice(0, blockStart)}${nextBlock}${value.slice(blockEnd)}`;
  setValue(next);

  const firstDelta = shift
    ? lines[0].startsWith("  ")
      ? -2
      : lines[0].startsWith("\t")
        ? -1
        : 0
    : 2;

  const allDelta = nextBlock.length - block.length;
  const nextStart = Math.max(blockStart, selectionStart + firstDelta);
  const nextEnd = Math.max(nextStart, selectionEnd + allDelta);
  updateTextareaSelection(textarea, nextStart, nextEnd);
}

export function handleMarkdownEditorKeyDown({
  event,
  textareaRef,
  value,
  setValue,
  onSubmit,
}: {
  event: React.KeyboardEvent<HTMLTextAreaElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  setValue: (next: string) => void;
  onSubmit?: () => void;
}) {
  const textarea = textareaRef.current;
  const isMeta = event.metaKey || event.ctrlKey;

  if (event.key === "Tab") {
    event.preventDefault();
    indentSelectedLines(textarea, value, setValue, event.shiftKey);
    return;
  }

  if (!isMeta) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "enter" && onSubmit) {
    event.preventDefault();
    onSubmit();
    return;
  }

  if (key === "b") {
    event.preventDefault();
    insertMarkdownSnippet(textarea, value, setValue, "**", "**", "加粗文本");
    return;
  }

  if (key === "i") {
    event.preventDefault();
    insertMarkdownSnippet(textarea, value, setValue, "*", "*", "斜体文本");
    return;
  }

  if (key === "k") {
    event.preventDefault();
    insertMarkdownSnippet(textarea, value, setValue, "[", "](https://example.com)", "链接文本");
  }
}
