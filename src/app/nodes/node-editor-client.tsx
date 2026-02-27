"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client/api";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type NodePayload = {
  id: string;
  title: string;
  contentMd: string;
  tags: string[];
  difficulty: number;
  sourceUrl: string | null;
  deletedAt: string | null;
};

type NodeOption = {
  id: string;
  title: string;
};

type QuestionItem = {
  id: string;
  question: string;
  referenceAnswerMd: string;
};

type RelationItem = {
  id: string;
  relationType: "PARENT_CHILD" | "RELATED";
  fromNodeId: string;
  toNodeId: string;
};

type NodeDetailResult = {
  node: NodePayload;
  questions: QuestionItem[];
  relations: RelationItem[];
};

export default function NodeEditorClient({ nodeId }: { nodeId?: string }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [difficulty, setDifficulty] = useState("3");
  const [sourceUrl, setSourceUrl] = useState("");
  const [deletedAt, setDeletedAt] = useState<string | null>(null);

  const [allNodes, setAllNodes] = useState<NodeOption[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [relations, setRelations] = useState<RelationItem[]>([]);

  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [relatedTargetNodeId, setRelatedTargetNodeId] = useState("");

  const [loading, setLoading] = useState(Boolean(nodeId));
  const [saving, setSaving] = useState(false);
  const [relationBusy, setRelationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorMobileTab, setEditorMobileTab] = useState<"edit" | "preview">("edit");
  const [questionEditorMobileTab, setQuestionEditorMobileTab] = useState<"edit" | "preview">(
    "edit",
  );
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const questionAnswerTextareaRef = useRef<HTMLTextAreaElement>(null);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const nodeNameMap = useMemo(() => {
    const map = new Map(allNodes.map((node) => [node.id, node.title]));

    if (nodeId && title.trim()) {
      map.set(nodeId, title.trim());
    }

    return map;
  }, [allNodes, nodeId, title]);

  const parentChildRelations = useMemo(
    () => relations.filter((relation) => relation.relationType === "PARENT_CHILD"),
    [relations],
  );

  const relatedRelations = useMemo(
    () => relations.filter((relation) => relation.relationType === "RELATED"),
    [relations],
  );

  const parentRelation = useMemo(() => {
    if (!nodeId) {
      return null;
    }

    return parentChildRelations.find((relation) => relation.toNodeId === nodeId) ?? null;
  }, [nodeId, parentChildRelations]);

  const childRelations = useMemo(() => {
    if (!nodeId) {
      return [];
    }

    return parentChildRelations.filter((relation) => relation.fromNodeId === nodeId);
  }, [nodeId, parentChildRelations]);

  const relatedNodeIds = useMemo(() => {
    if (!nodeId) {
      return new Set<string>();
    }

    const ids = new Set<string>();
    for (const relation of relatedRelations) {
      const peerId = relation.fromNodeId === nodeId ? relation.toNodeId : relation.fromNodeId;
      ids.add(peerId);
    }

    return ids;
  }, [nodeId, relatedRelations]);

  const selectableRelatedNodes = useMemo(() => {
    if (!nodeId) {
      return [];
    }

    return allNodes
      .filter((node) => node.id !== nodeId && !relatedNodeIds.has(node.id))
      .sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
  }, [allNodes, nodeId, relatedNodeIds]);

  async function loadNode() {
    if (!nodeId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [result, nodeList] = await Promise.all([
        apiFetch<NodeDetailResult>(`/api/nodes/${nodeId}`),
        apiFetch<{ items: NodeOption[] }>(
          "/api/nodes?page=1&pageSize=200&sortBy=title&sortOrder=asc",
        ),
      ]);

      setTitle(result.node.title);
      setContentMd(result.node.contentMd);
      setTagsInput(result.node.tags.join(", "));
      setDifficulty(String(result.node.difficulty));
      setSourceUrl(result.node.sourceUrl ?? "");
      setDeletedAt(result.node.deletedAt);
      setQuestions(result.questions);
      setRelations(result.relations);
      setAllNodes(nodeList.items);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncLayout = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, []);

  useEffect(() => {
    if (!expandedQuestionId) {
      return;
    }

    const exists = questions.some((question) => question.id === expandedQuestionId);
    if (!exists) {
      setExpandedQuestionId(null);
    }
  }, [expandedQuestionId, questions]);

  async function saveNode() {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title,
        contentMd,
        tags,
        difficulty: Number(difficulty),
        sourceUrl: sourceUrl.trim() ? sourceUrl.trim() : null,
      };

      if (nodeId) {
        await apiFetch(
          `/api/nodes/${nodeId}`,
          { method: "PUT", body: JSON.stringify(payload) },
          true,
        );
      } else {
        const created = await apiFetch<{ id: string }>(
          "/api/nodes",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          true,
        );

        router.replace(`/nodes/${created.id}`);
        return;
      }

      await loadNode();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNode() {
    if (!nodeId) {
      return;
    }

    try {
      await apiFetch(`/api/nodes/${nodeId}`, { method: "DELETE" }, true);
      await loadNode();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  }

  async function restoreNode() {
    if (!nodeId) {
      return;
    }

    try {
      await apiFetch(`/api/nodes/${nodeId}/restore`, { method: "POST" }, true);
      await loadNode();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "恢复失败");
    }
  }

  async function createQuestion() {
    if (!nodeId || !newQuestion.trim() || !newAnswer.trim()) {
      return;
    }

    try {
      await apiFetch(
        `/api/nodes/${nodeId}/questions`,
        {
          method: "POST",
          body: JSON.stringify({
            question: newQuestion.trim(),
            referenceAnswerMd: newAnswer.trim(),
          }),
        },
        true,
      );

      setNewQuestion("");
      setNewAnswer("");
      await loadNode();
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : "题目创建失败");
    }
  }

  async function deleteQuestion(questionId: string) {
    try {
      await apiFetch(`/api/questions/${questionId}`, { method: "DELETE" }, true);
      await loadNode();
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : "题目删除失败");
    }
  }

  async function createRelatedRelation() {
    if (!nodeId || !relatedTargetNodeId) {
      return;
    }

    setRelationBusy(true);
    setError(null);

    try {
      await apiFetch(
        `/api/nodes/${nodeId}/relations`,
        {
          method: "POST",
          body: JSON.stringify({
            relationType: "RELATED",
            targetNodeId: relatedTargetNodeId,
          }),
        },
        true,
      );

      setRelatedTargetNodeId("");
      await loadNode();
    } catch (relationError) {
      setError(relationError instanceof Error ? relationError.message : "关联创建失败");
    } finally {
      setRelationBusy(false);
    }
  }

  async function deleteRelatedRelation(relationId: string) {
    setRelationBusy(true);
    setError(null);

    try {
      await apiFetch(`/api/relations/${relationId}`, { method: "DELETE" }, true);
      await loadNode();
    } catch (relationError) {
      setError(relationError instanceof Error ? relationError.message : "关联删除失败");
    } finally {
      setRelationBusy(false);
    }
  }

  function insertMarkdownSnippet(
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
    const selectedText = value.slice(start, end);
    const wrappedText = `${prefix}${selectedText || placeholder}${suffix}`;
    const nextValue = `${value.slice(0, start)}${wrappedText}${value.slice(end)}`;
    setValue(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + (selectedText || placeholder).length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function toggleQuestionAnswer(questionId: string) {
    setExpandedQuestionId((current) => (current === questionId ? null : questionId));
  }

  if (loading) {
    return <p>加载中...</p>;
  }

  return (
    <div className="space-y-4 motion-stagger">
      {error ? <p className="alert-error">{error}</p> : null}

      <section className="panel">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-semibold">{nodeId ? "编辑知识点" : "新建知识点"}</h2>
            <p className="mt-1 text-sm text-muted">
              {nodeId
                ? "修改节点内容与关系，保存后立即生效。"
                : "填写基础信息并编写 Markdown 正文，保存后继续完善关系与题目。"}
            </p>
          </div>
          {nodeId ? (
            <span
              className={`chip border-0 ${deletedAt ? "bg-amber-100 text-amber-800" : "bg-surface-soft"}`}
            >
              {deletedAt ? "已软删除" : "正常节点"}
            </span>
          ) : (
            <span className="chip border-0 bg-surface-soft">未保存</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm">标题</span>
            <input
              className="input-field w-full"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm">难度</span>
            <select
              className="input-field w-full"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </label>
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-sm">标签（逗号分隔）</span>
          <input
            className="input-field w-full"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />
        </label>
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="chip border-0 bg-surface-soft">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <label className="mt-3 block space-y-1">
          <span className="text-sm">来源 URL（可空）</span>
          <input
            className="input-field w-full"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
        </label>

        <section className="mt-3 panel-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Markdown 正文</p>
            <p className="text-xs text-muted-2">快捷键: Cmd/Ctrl + Enter 保存</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="btn-secondary h-9 px-3 text-sm"
              onClick={() =>
                insertMarkdownSnippet(
                  contentTextareaRef.current,
                  contentMd,
                  setContentMd,
                  "## ",
                  "",
                  "二级标题",
                )
              }
            >
              标题
            </button>
            <button
              className="btn-secondary h-9 px-3 text-sm"
              onClick={() =>
                insertMarkdownSnippet(
                  contentTextareaRef.current,
                  contentMd,
                  setContentMd,
                  "- ",
                  "",
                  "列表项",
                )
              }
            >
              列表
            </button>
            <button
              className="btn-secondary h-9 px-3 text-sm"
              onClick={() =>
                insertMarkdownSnippet(
                  contentTextareaRef.current,
                  contentMd,
                  setContentMd,
                  "```\n",
                  "\n```",
                  "code",
                )
              }
            >
              代码块
            </button>
            <button
              className="btn-secondary h-9 px-3 text-sm"
              onClick={() =>
                insertMarkdownSnippet(
                  contentTextareaRef.current,
                  contentMd,
                  setContentMd,
                  "> ",
                  "",
                  "引用",
                )
              }
            >
              引用
            </button>
          </div>

          {isMobileLayout ? (
            <div className="mt-3 space-y-3">
              <div className="flex w-fit rounded-lg border border-border bg-surface p-1">
                <button
                  className={`h-9 rounded-md px-3 text-sm transition-colors ${
                    editorMobileTab === "edit"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-strong hover:bg-surface-soft"
                  }`}
                  onClick={() => setEditorMobileTab("edit")}
                >
                  编辑
                </button>
                <button
                  className={`h-9 rounded-md px-3 text-sm transition-colors ${
                    editorMobileTab === "preview"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-strong hover:bg-surface-soft"
                  }`}
                  onClick={() => setEditorMobileTab("preview")}
                >
                  预览
                </button>
              </div>

              {editorMobileTab === "edit" ? (
                <textarea
                  ref={contentTextareaRef}
                  className="min-h-[48vh] w-full resize-y panel-soft font-mono text-sm leading-6 sm:min-h-[54vh]"
                  placeholder="支持 Markdown：# 标题、- 列表、``` 代码块、> 引用..."
                  value={contentMd}
                  onChange={(event) => setContentMd(event.target.value)}
                  spellCheck={false}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void saveNode();
                    }
                  }}
                />
              ) : (
                <div className="min-h-[48vh] panel-soft text-sm sm:min-h-[54vh]">
                  {contentMd.trim() ? (
                    <MarkdownRenderer>{contentMd}</MarkdownRenderer>
                  ) : (
                    <p className="text-muted-2">暂无内容</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
              <textarea
                ref={contentTextareaRef}
                className="min-h-[68vh] w-full resize-y panel-soft font-mono text-sm leading-6"
                placeholder="支持 Markdown：# 标题、- 列表、``` 代码块、> 引用..."
                value={contentMd}
                onChange={(event) => setContentMd(event.target.value)}
                spellCheck={false}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void saveNode();
                  }
                }}
              />
              <div className="min-h-[68vh] panel-soft text-sm">
                {contentMd.trim() ? (
                  <MarkdownRenderer>{contentMd}</MarkdownRenderer>
                ) : (
                  <p className="text-muted-2">暂无内容</p>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-primary w-full disabled:opacity-50 sm:w-auto sm:min-w-28"
            onClick={() => void saveNode()}
            disabled={saving}
          >
            {saving ? "保存中..." : "保存"}
          </button>

          {nodeId ? (
            <>
              <button
                className="btn-secondary w-full sm:w-auto sm:min-w-28"
                onClick={() => void deleteNode()}
                disabled={Boolean(deletedAt)}
              >
                软删除
              </button>
              <button
                className="btn-secondary w-full sm:w-auto sm:min-w-28"
                onClick={() => void restoreNode()}
                disabled={!deletedAt}
              >
                恢复
              </button>
              <Link
                href={`/relations?nodeId=${nodeId}`}
                className="btn-secondary w-full sm:w-auto sm:min-w-36"
              >
                知识树管理父子
              </Link>
            </>
          ) : null}
        </div>
      </section>

      {nodeId ? (
        <>
          <section className="panel">
            <h2 className="text-lg font-semibold">父子关系（单父）</h2>
            <div className="mt-3 panel-soft text-sm">
              <p>
                父节点:{" "}
                {parentRelation
                  ? (nodeNameMap.get(parentRelation.fromNodeId) ?? parentRelation.fromNodeId)
                  : "无（根节点）"}
              </p>
              <p className="mt-1">子节点数: {childRelations.length}</p>
              {childRelations.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-muted-strong">
                  {childRelations.map((relation) => (
                    <li key={relation.id}>
                      {nodeNameMap.get(relation.toNodeId) ?? relation.toNodeId}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link href={`/relations?nodeId=${nodeId}`} className="mt-3 inline-block underline">
                在知识树中编辑父子关系
              </Link>
            </div>
          </section>

          <section className="panel">
            <h2 className="text-lg font-semibold">关联知识点（RELATED）</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <select
                className="input-field w-full sm:min-w-64 sm:flex-1"
                value={relatedTargetNodeId}
                onChange={(event) => setRelatedTargetNodeId(event.target.value)}
              >
                <option value="">选择要关联的知识点</option>
                {selectableRelatedNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.title}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary w-full disabled:opacity-50 sm:w-auto sm:min-w-28"
                onClick={() => void createRelatedRelation()}
                disabled={!relatedTargetNodeId || relationBusy}
              >
                添加关联
              </button>
            </div>

            {relatedRelations.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {relatedRelations.map((relation) => {
                  const peerNodeId =
                    relation.fromNodeId === nodeId ? relation.toNodeId : relation.fromNodeId;
                  return (
                    <li
                      key={relation.id}
                      className="panel-soft flex items-center justify-between gap-2"
                    >
                      <span className="text-sm">{nodeNameMap.get(peerNodeId) ?? peerNodeId}</span>
                      <button
                        className="text-sm underline disabled:opacity-50"
                        onClick={() => void deleteRelatedRelation(relation.id)}
                        disabled={relationBusy}
                      >
                        删除关联
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">暂无关联知识点</p>
            )}
          </section>

          <section className="panel">
            <h2 className="text-lg font-semibold">面试题</h2>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <input
                className="input-field"
                placeholder="题目"
                value={newQuestion}
                onChange={(event) => setNewQuestion(event.target.value)}
              />
            </div>

            <section className="mt-2 panel-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">参考答案（Markdown）</p>
                <p className="text-xs text-muted-2">快捷键: Cmd/Ctrl + Enter 添加题目</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="btn-secondary h-9 px-3 text-sm"
                  onClick={() =>
                    insertMarkdownSnippet(
                      questionAnswerTextareaRef.current,
                      newAnswer,
                      setNewAnswer,
                      "## ",
                      "",
                      "二级标题",
                    )
                  }
                >
                  标题
                </button>
                <button
                  className="btn-secondary h-9 px-3 text-sm"
                  onClick={() =>
                    insertMarkdownSnippet(
                      questionAnswerTextareaRef.current,
                      newAnswer,
                      setNewAnswer,
                      "- ",
                      "",
                      "列表项",
                    )
                  }
                >
                  列表
                </button>
                <button
                  className="btn-secondary h-9 px-3 text-sm"
                  onClick={() =>
                    insertMarkdownSnippet(
                      questionAnswerTextareaRef.current,
                      newAnswer,
                      setNewAnswer,
                      "```\n",
                      "\n```",
                      "code",
                    )
                  }
                >
                  代码块
                </button>
                <button
                  className="btn-secondary h-9 px-3 text-sm"
                  onClick={() =>
                    insertMarkdownSnippet(
                      questionAnswerTextareaRef.current,
                      newAnswer,
                      setNewAnswer,
                      "> ",
                      "",
                      "引用",
                    )
                  }
                >
                  引用
                </button>
              </div>

              {isMobileLayout ? (
                <div className="mt-3 space-y-3">
                  <div className="flex w-fit rounded-lg border border-border bg-surface p-1">
                    <button
                      className={`h-9 rounded-md px-3 text-sm transition-colors ${
                        questionEditorMobileTab === "edit"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-strong hover:bg-surface-soft"
                      }`}
                      onClick={() => setQuestionEditorMobileTab("edit")}
                    >
                      编辑
                    </button>
                    <button
                      className={`h-9 rounded-md px-3 text-sm transition-colors ${
                        questionEditorMobileTab === "preview"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-strong hover:bg-surface-soft"
                      }`}
                      onClick={() => setQuestionEditorMobileTab("preview")}
                    >
                      预览
                    </button>
                  </div>

                  {questionEditorMobileTab === "edit" ? (
                    <textarea
                      ref={questionAnswerTextareaRef}
                      className="min-h-[32vh] w-full resize-y panel-soft font-mono text-sm leading-6 sm:min-h-[38vh]"
                      placeholder="参考答案（Markdown）"
                      value={newAnswer}
                      onChange={(event) => setNewAnswer(event.target.value)}
                      spellCheck={false}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                          event.preventDefault();
                          void createQuestion();
                        }
                      }}
                    />
                  ) : (
                    <div className="min-h-[32vh] panel-soft text-sm sm:min-h-[38vh]">
                      {newAnswer.trim() ? (
                        <MarkdownRenderer>{newAnswer}</MarkdownRenderer>
                      ) : (
                        <p className="text-muted-2">暂无内容</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <textarea
                    ref={questionAnswerTextareaRef}
                    className="min-h-[40vh] w-full resize-y panel-soft font-mono text-sm leading-6"
                    placeholder="参考答案（Markdown）"
                    value={newAnswer}
                    onChange={(event) => setNewAnswer(event.target.value)}
                    spellCheck={false}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        void createQuestion();
                      }
                    }}
                  />
                  <div className="min-h-[40vh] panel-soft text-sm">
                    {newAnswer.trim() ? (
                      <MarkdownRenderer>{newAnswer}</MarkdownRenderer>
                    ) : (
                      <p className="text-muted-2">暂无内容</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <button
              className="mt-3 btn-secondary w-full sm:w-auto sm:min-w-28"
              onClick={() => void createQuestion()}
            >
              添加题目
            </button>

            {questions.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {questions.map((question) => (
                  <li key={question.id} className="panel-soft">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{question.question}</p>
                      <div className="flex items-center gap-3">
                        <button
                          className="text-sm underline"
                          onClick={() => toggleQuestionAnswer(question.id)}
                        >
                          {expandedQuestionId === question.id ? "收起答案" : "展开答案"}
                        </button>
                        <button
                          className="text-sm underline"
                          onClick={() => void deleteQuestion(question.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    {expandedQuestionId === question.id ? (
                      <MarkdownRenderer className="mt-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-strong">
                        {question.referenceAnswerMd}
                      </MarkdownRenderer>
                    ) : (
                      <p className="mt-1 text-sm text-muted line-clamp-2">
                        {question.referenceAnswerMd}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">暂无面试题，先添加一条用于随机问答训练。</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
