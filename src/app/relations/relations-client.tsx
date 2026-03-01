"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

import { apiFetch } from "@/lib/client/api";
import { MarkdownEditor } from "@/components/markdown-editor";
import {
  createEmptyDraftFields,
  draftStorageKey,
  hasDraftContent,
  normalizeDraftFields,
  parseDraft,
  serializeDraft,
  type NodeDraftFields,
} from "@/app/relations/draft";

type GraphNode = {
  id: string;
  title: string;
  difficulty: number;
  tags: string[];
};

type GraphRelation = {
  id: string;
  relationType: "PARENT_CHILD" | "RELATED";
  fromNodeId: string;
  toNodeId: string;
};

type GraphPayload = {
  nodes: GraphNode[];
  relations: GraphRelation[];
};

function splitTags(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function RelationsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryNodeId = searchParams.get("nodeId") ?? "";

  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  const [attachTargetNodeId, setAttachTargetNodeId] = useState("");
  const [attachingChild, setAttachingChild] = useState(false);
  const [detachingRelationId, setDetachingRelationId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorParentNodeId, setEditorParentNodeId] = useState<string | null>(null);
  const [editorParentTitle, setEditorParentTitle] = useState("根节点");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContentMd, setEditorContentMd] = useState("");
  const [editorTagsInput, setEditorTagsInput] = useState("");
  const [editorDifficulty, setEditorDifficulty] = useState("3");
  const [editorSourceUrl, setEditorSourceUrl] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const editorFields = useMemo<NodeDraftFields>(
    () => ({
      title: editorTitle,
      contentMd: editorContentMd,
      tagsInput: editorTagsInput,
      difficulty: editorDifficulty,
      sourceUrl: editorSourceUrl,
    }),
    [editorContentMd, editorDifficulty, editorSourceUrl, editorTagsInput, editorTitle],
  );

  const nodeMap = useMemo(
    () => new Map((payload?.nodes ?? []).map((node) => [node.id, node])),
    [payload],
  );

  const parentChildRelations = useMemo(
    () => (payload?.relations ?? []).filter((relation) => relation.relationType === "PARENT_CHILD"),
    [payload],
  );

  const parentRelationsByChild = useMemo(() => {
    const map = new Map<string, GraphRelation[]>();

    for (const relation of parentChildRelations) {
      const list = map.get(relation.toNodeId) ?? [];
      list.push(relation);
      map.set(relation.toNodeId, list);
    }

    return map;
  }, [parentChildRelations]);

  const primaryParentByChild = useMemo(() => {
    const map = new Map<string, GraphRelation>();

    for (const [childNodeId, relations] of parentRelationsByChild.entries()) {
      if (relations.length > 0) {
        map.set(childNodeId, relations[0]);
      }
    }

    return map;
  }, [parentRelationsByChild]);

  const childRelationsByParent = useMemo(() => {
    const map = new Map<string, GraphRelation[]>();

    for (const relation of parentChildRelations) {
      const list = map.get(relation.fromNodeId) ?? [];
      list.push(relation);
      map.set(relation.fromNodeId, list);
    }

    for (const relations of map.values()) {
      relations.sort((a, b) => {
        const titleA = nodeMap.get(a.toNodeId)?.title ?? a.toNodeId;
        const titleB = nodeMap.get(b.toNodeId)?.title ?? b.toNodeId;
        return titleA.localeCompare(titleB, "zh-Hans-CN");
      });
    }

    return map;
  }, [nodeMap, parentChildRelations]);

  const rootNodeIds = useMemo(() => {
    const roots = (payload?.nodes ?? [])
      .map((node) => node.id)
      .filter((nodeId) => !primaryParentByChild.has(nodeId));

    roots.sort((a, b) => {
      const titleA = nodeMap.get(a)?.title ?? a;
      const titleB = nodeMap.get(b)?.title ?? b;
      return titleA.localeCompare(titleB, "zh-Hans-CN");
    });

    return roots;
  }, [nodeMap, payload, primaryParentByChild]);

  const selectedNode = selectedNodeId ? (nodeMap.get(selectedNodeId) ?? null) : null;

  const selectedParentRelation = selectedNodeId
    ? (primaryParentByChild.get(selectedNodeId) ?? null)
    : null;

  const selectedChildRelations = useMemo(
    () => (selectedNodeId ? (childRelationsByParent.get(selectedNodeId) ?? []) : []),
    [childRelationsByParent, selectedNodeId],
  );

  const multiParentChildIds = useMemo(
    () =>
      [...parentRelationsByChild.entries()]
        .filter(([, relations]) => relations.length > 1)
        .map(([childNodeId]) => childNodeId),
    [parentRelationsByChild],
  );

  const descendantIds = useMemo(() => {
    const descendants = new Set<string>();

    if (!selectedNodeId) {
      return descendants;
    }

    const stack: string[] = [selectedNodeId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }

      const children = childRelationsByParent.get(current) ?? [];
      for (const relation of children) {
        if (descendants.has(relation.toNodeId)) {
          continue;
        }

        descendants.add(relation.toNodeId);
        stack.push(relation.toNodeId);
      }
    }

    return descendants;
  }, [childRelationsByParent, selectedNodeId]);

  const attachableNodes = useMemo(() => {
    if (!payload || !selectedNodeId) {
      return [] as GraphNode[];
    }

    return payload.nodes
      .filter(
        (node) =>
          node.id !== selectedNodeId &&
          !descendantIds.has(node.id) &&
          !primaryParentByChild.has(node.id),
      )
      .sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
  }, [descendantIds, payload, primaryParentByChild, selectedNodeId]);

  const editorHasContent = hasDraftContent(editorFields);

  useEffect(() => {
    if (!highlightNodeId) {
      return;
    }

    const timer = setTimeout(() => {
      setHighlightNodeId((current) => (current === highlightNodeId ? null : current));
    }, 2500);

    return () => clearTimeout(timer);
  }, [highlightNodeId]);

  useEffect(() => {
    if (!editorOpen || typeof window === "undefined") {
      return;
    }

    const key = draftStorageKey(editorParentNodeId);

    if (editorHasContent) {
      window.localStorage.setItem(key, serializeDraft(editorFields));
      return;
    }

    window.localStorage.removeItem(key);
  }, [editorFields, editorHasContent, editorOpen, editorParentNodeId]);

  useEffect(() => {
    if (!editorOpen || !editorHasContent || typeof window === "undefined") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editorHasContent, editorOpen]);

  async function loadGraph(preferredNodeId?: string) {
    try {
      setError(null);
      const data = await apiFetch<GraphPayload>("/api/graph");
      setPayload(data);

      const nodeIds = new Set(data.nodes.map((node) => node.id));
      const nextSelectedId =
        (preferredNodeId && nodeIds.has(preferredNodeId) ? preferredNodeId : "") ||
        (queryNodeId && nodeIds.has(queryNodeId) ? queryNodeId : "") ||
        (selectedNodeId && nodeIds.has(selectedNodeId) ? selectedNodeId : "") ||
        data.nodes[0]?.id ||
        "";

      setSelectedNodeId(nextSelectedId);

      const parentChild = data.relations.filter(
        (relation) => relation.relationType === "PARENT_CHILD",
      );
      const parentByChild = new Map<string, string>();
      for (const relation of parentChild) {
        if (!parentByChild.has(relation.toNodeId)) {
          parentByChild.set(relation.toNodeId, relation.fromNodeId);
        }
      }

      const roots = data.nodes
        .map((node) => node.id)
        .filter((nodeId) => !parentByChild.has(nodeId));

      setExpandedNodeIds((current) => {
        const next = new Set<string>();

        for (const nodeId of current) {
          if (nodeIds.has(nodeId)) {
            next.add(nodeId);
          }
        }

        for (const rootNodeId of roots) {
          next.add(rootNodeId);
        }

        let cursor = nextSelectedId;
        const seen = new Set<string>();
        while (cursor && !seen.has(cursor)) {
          seen.add(cursor);
          const parentId = parentByChild.get(cursor);
          if (!parentId) {
            break;
          }

          next.add(parentId);
          cursor = parentId;
        }

        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "知识树加载失败");
      setPayload(null);
      setSelectedNodeId("");
      setExpandedNodeIds(new Set());
    }
  }

  useEffect(() => {
    void loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryNodeId]);

  function applyEditorFields(fields: NodeDraftFields) {
    setEditorTitle(fields.title);
    setEditorContentMd(fields.contentMd);
    setEditorTagsInput(fields.tagsInput);
    setEditorDifficulty(fields.difficulty);
    setEditorSourceUrl(fields.sourceUrl);
  }

  function canCloseEditor(): boolean {
    if (!editorOpen || !editorHasContent || typeof window === "undefined") {
      return true;
    }

    return window.confirm("当前有未保存内容，确认关闭编辑器吗？");
  }

  function closeEditor() {
    if (!canCloseEditor()) {
      return;
    }

    setEditorOpen(false);
    setEditorError(null);
  }

  function openEditor(parentNodeId: string | null, parentTitle: string) {
    if (editorOpen && !canCloseEditor()) {
      return;
    }

    const empty = createEmptyDraftFields();
    let nextFields = empty;

    if (typeof window !== "undefined") {
      const key = draftStorageKey(parentNodeId);
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? parseDraft(raw) : null;

      if (parsed) {
        const shouldRestore = window.confirm("检测到该节点下有未保存草稿，是否恢复？");
        if (shouldRestore) {
          nextFields = normalizeDraftFields(parsed);
        } else {
          window.localStorage.removeItem(key);
        }
      }
    }

    if (parentNodeId) {
      setSelectedNodeId(parentNodeId);
    }

    setEditorParentNodeId(parentNodeId);
    setEditorParentTitle(parentTitle);
    applyEditorFields(nextFields);
    setEditorError(null);
    setEditorOpen(true);
  }

  async function createNodeFromEditor() {
    if (!editorTitle.trim() || !editorContentMd.trim()) {
      setEditorError("请至少填写标题和 Markdown 正文");
      return;
    }

    setEditorSaving(true);
    setEditorError(null);

    try {
      const createdNode = await apiFetch<{ id: string }>(
        "/api/nodes",
        {
          method: "POST",
          body: JSON.stringify({
            title: editorTitle.trim(),
            contentMd: editorContentMd.trim(),
            tags: splitTags(editorTagsInput),
            difficulty: Number(editorDifficulty),
            sourceUrl: editorSourceUrl.trim() ? editorSourceUrl.trim() : null,
          }),
        },
        true,
      );

      if (editorParentNodeId) {
        await apiFetch(
          `/api/nodes/${editorParentNodeId}/relations`,
          {
            method: "POST",
            body: JSON.stringify({
              relationType: "PARENT_CHILD",
              currentNodeRole: "PARENT",
              targetNodeId: createdNode.id,
            }),
          },
          true,
        );
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey(editorParentNodeId));
      }

      setEditorOpen(false);
      setEditorError(null);
      setHighlightNodeId(createdNode.id);
      await loadGraph(createdNode.id);
    } catch (createError) {
      setEditorError(createError instanceof Error ? createError.message : "创建节点失败");
    } finally {
      setEditorSaving(false);
    }
  }

  async function attachExistingNodeAsChild() {
    if (!selectedNodeId || !attachTargetNodeId) {
      return;
    }

    setAttachingChild(true);
    setError(null);

    try {
      await apiFetch(
        `/api/nodes/${selectedNodeId}/relations`,
        {
          method: "POST",
          body: JSON.stringify({
            relationType: "PARENT_CHILD",
            currentNodeRole: "PARENT",
            targetNodeId: attachTargetNodeId,
          }),
        },
        true,
      );

      setAttachTargetNodeId("");
      await loadGraph(selectedNodeId);
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : "挂接子节点失败");
    } finally {
      setAttachingChild(false);
    }
  }

  async function detachChildRelation(relationId: string) {
    setDetachingRelationId(relationId);
    setError(null);

    try {
      await apiFetch(`/api/relations/${relationId}`, { method: "DELETE" }, true);
      await loadGraph(selectedNodeId);
    } catch (detachError) {
      setError(detachError instanceof Error ? detachError.message : "解除父子关系失败");
    } finally {
      setDetachingRelationId(null);
    }
  }

  function toggleExpand(nodeId: string) {
    setExpandedNodeIds((current) => {
      const next = new Set(current);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  }

  function openNodeDetail(nodeId: string) {
    router.push(`/nodes/${nodeId}/preview`);
  }

  function renderTreeNode(nodeId: string, depth = 0): React.ReactNode {
    const node = nodeMap.get(nodeId);
    if (!node) {
      return null;
    }

    const children = childRelationsByParent.get(nodeId) ?? [];
    const expanded = expandedNodeIds.has(nodeId);
    const selected = selectedNodeId === nodeId;
    const highlighted = highlightNodeId === nodeId;

    return (
      <li key={nodeId}>
        <div
          className={`group flex items-center gap-1 rounded-lg border border-transparent py-1 pr-2 transition-all ${
            selected
              ? "border-primary/35 bg-primary text-primary-foreground shadow-sm"
              : "hover:-translate-y-[1px] hover:border-border hover:bg-surface-soft"
          } ${highlighted ? "ring-2 ring-amber-400" : ""}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {children.length > 0 ? (
            <button
              className={`h-7 w-7 rounded transition-colors ${selected ? "hover:bg-surface/20" : "hover:bg-surface-soft"}`}
              onClick={() => toggleExpand(nodeId)}
              aria-label={expanded ? "折叠" : "展开"}
            >
              {expanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="inline-block h-7 w-7" />
          )}

          <button
            className="flex-1 truncate text-left text-sm"
            onClick={() => setSelectedNodeId(nodeId)}
            onDoubleClick={() => openNodeDetail(nodeId)}
            title={node.title}
          >
            {node.title}
          </button>

          <button
            className={`h-7 min-w-7 rounded px-2 text-sm transition-all ${
              selected
                ? "opacity-100 hover:bg-surface/20"
                : "opacity-0 group-hover:opacity-100 hover:bg-surface-soft"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              openEditor(node.id, node.title);
            }}
            aria-label={`为 ${node.title} 添加子节点`}
            title="新增子节点"
          >
            +
          </button>

          <span className={`text-xs ${selected ? "text-primary-foreground/80" : "text-muted-2"}`}>
            {children.length}
          </span>
        </div>

        {expanded && children.length > 0 ? (
          <ul className="mt-0.5 space-y-0.5">
            {children.map((relation) => renderTreeNode(relation.toNodeId, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="space-y-4 motion-stagger">
      {error ? <p className="alert-error">{error}</p> : null}

      {multiParentChildIds.length > 0 ? (
        <p className="alert-warn">
          检测到历史多父数据（{multiParentChildIds.length}{" "}
          个节点）。请先在知识树中整理后再继续编辑。
        </p>
      ) : null}

      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">知识树</h2>
            <p className="text-sm text-muted">默认浏览树结构，按需打开编辑抽屉新增节点</p>
            <p className="mt-1 text-sm text-muted">
              {selectedNode
                ? `当前选中: ${selectedNode.title}`
                : "点击节点可查看层级并快速新增子节点，双击可打开完整编辑"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => openEditor(null, "根节点")}>
              新增根节点
            </button>
            {selectedNode ? (
              <button
                className="btn-primary"
                onClick={() => openEditor(selectedNode.id, selectedNode.title)}
              >
                为当前节点新增子节点
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip border-0 bg-surface-soft">节点 {payload?.nodes.length ?? 0}</span>
          <span className="chip border-0 bg-surface-soft">根节点 {rootNodeIds.length}</span>
          <span className="chip border-0 bg-surface-soft">
            父子关系 {parentChildRelations.length}
          </span>
        </div>

        {payload?.nodes.length ? (
          <ul className="panel-soft mt-4 max-h-[72vh] space-y-1 overflow-auto pr-1">
            {rootNodeIds.length > 0
              ? rootNodeIds.map((nodeId) => renderTreeNode(nodeId))
              : payload.nodes
                  .map((node) => node.id)
                  .sort((a, b) => {
                    const titleA = nodeMap.get(a)?.title ?? a;
                    const titleB = nodeMap.get(b)?.title ?? b;
                    return titleA.localeCompare(titleB, "zh-Hans-CN");
                  })
                  .map((nodeId) => renderTreeNode(nodeId))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">暂无知识点，请先创建根节点。</p>
        )}

        <details className="mt-4 panel-soft">
          <summary className="cursor-pointer text-sm font-medium">
            二级操作（挂接已有节点 / 解除父子关系）
          </summary>

          {selectedNode ? (
            <div className="mt-3 space-y-3">
              <div className="panel-soft text-sm">
                <p>
                  父节点:{" "}
                  {selectedParentRelation
                    ? (nodeMap.get(selectedParentRelation.fromNodeId)?.title ??
                      selectedParentRelation.fromNodeId)
                    : "无（根节点）"}
                </p>
                <p className="mt-1">子节点数: {selectedChildRelations.length}</p>
                <Link href={`/nodes/${selectedNode.id}`} className="mt-2 inline-block underline">
                  打开节点详情
                </Link>
              </div>

              <div className="panel-soft">
                <p className="text-sm font-medium">挂接已有节点为子节点</p>
                <p className="mt-1 text-sm text-muted">仅可挂接当前无父节点的节点</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    className="input-field w-full sm:min-w-64 sm:flex-1"
                    value={attachTargetNodeId}
                    onChange={(event) => setAttachTargetNodeId(event.target.value)}
                  >
                    <option value="">请选择</option>
                    {attachableNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-secondary w-full disabled:opacity-50 sm:w-auto sm:min-w-28"
                    onClick={() => void attachExistingNodeAsChild()}
                    disabled={!attachTargetNodeId || attachingChild}
                  >
                    {attachingChild ? "挂接中..." : "挂接"}
                  </button>
                </div>
              </div>

              {selectedChildRelations.length > 0 ? (
                <div className="panel-soft">
                  <p className="text-sm font-medium">解除当前父节点的子关系</p>
                  <ul className="mt-2 space-y-2">
                    {selectedChildRelations.map((relation) => (
                      <li
                        key={relation.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2"
                      >
                        <span className="truncate text-sm">
                          {nodeMap.get(relation.toNodeId)?.title ?? relation.toNodeId}
                        </span>
                        <button
                          className="text-sm underline disabled:opacity-50"
                          onClick={() => void detachChildRelation(relation.id)}
                          disabled={detachingRelationId === relation.id}
                        >
                          {detachingRelationId === relation.id ? "处理中..." : "解除"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">先在树中选中一个节点，再进行二级操作。</p>
          )}
        </details>
      </section>

      {editorOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <button
                className="absolute inset-0 drawer-mask"
                onClick={closeEditor}
                aria-label="关闭新增节点抽屉"
              />

              <section
                role="dialog"
                aria-modal="true"
                className="drawer-panel absolute inset-y-0 right-0 h-full w-full max-w-5xl overflow-auto border-l border-border bg-card p-4 shadow-2xl sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">
                      新增{editorParentNodeId ? "子节点" : "根节点"}
                    </h3>
                    <p className="text-sm text-muted">
                      目标父节点: {editorParentNodeId ? editorParentTitle : "无（创建根节点）"}
                    </p>
                  </div>
                  <button className="btn-secondary" onClick={closeEditor}>
                    关闭
                  </button>
                </div>

                {editorError ? <p className="mt-3 alert-error">{editorError}</p> : null}

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm">标题</span>
                    <input
                      className="input-field w-full"
                      value={editorTitle}
                      onChange={(event) => setEditorTitle(event.target.value)}
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm">难度</span>
                    <select
                      className="input-field w-full"
                      value={editorDifficulty}
                      onChange={(event) => setEditorDifficulty(event.target.value)}
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
                    value={editorTagsInput}
                    onChange={(event) => setEditorTagsInput(event.target.value)}
                  />
                </label>

                <label className="mt-3 block space-y-1">
                  <span className="text-sm">来源 URL（可空）</span>
                  <input
                    className="input-field w-full"
                    value={editorSourceUrl}
                    onChange={(event) => setEditorSourceUrl(event.target.value)}
                  />
                </label>

                <MarkdownEditor
                  className="mt-4"
                  value={editorContentMd}
                  onChange={setEditorContentMd}
                  placeholder="支持 Markdown：# 标题、- 列表、``` 代码块、> 引用、$ 行内公式、$$ 块公式..."
                  submitHint="草稿自动保存。快捷键: Cmd/Ctrl + Enter 提交"
                  onSubmit={() => {
                    void createNodeFromEditor();
                  }}
                  mobileMinHeightClass="min-h-[44vh] sm:min-h-[50vh]"
                  desktopMinHeightClass="min-h-[66vh]"
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-2">
                    草稿会自动保存到本地（按父节点分桶）。快捷键: Cmd/Ctrl + Enter 提交。
                  </p>

                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={closeEditor} disabled={editorSaving}>
                      取消
                    </button>
                    <button
                      className="btn-primary disabled:opacity-50"
                      onClick={() => void createNodeFromEditor()}
                      disabled={editorSaving}
                    >
                      {editorSaving ? "保存中..." : "保存并关闭"}
                    </button>
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
