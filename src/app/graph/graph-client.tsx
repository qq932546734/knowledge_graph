"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Core, EventObjectNode } from "cytoscape";

import { apiFetch } from "@/lib/client/api";
import { DEFAULT_THEME, readThemeFromDocument, type Theme } from "@/lib/theme";

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

type GraphPalette = {
  nodeText: string;
  nodeTextBackground: string;
  nodeTextBorder: string;
  nodeBorderDefault: string;
  nodeBackgroundDefault: string;
  difficulty1Background: string;
  difficulty1Border: string;
  difficulty2Background: string;
  difficulty2Border: string;
  difficulty3Background: string;
  difficulty3Border: string;
  difficulty4Background: string;
  difficulty4Border: string;
  difficulty5Background: string;
  difficulty5Border: string;
  parentEdge: string;
  relatedEdge: string;
  selectedBorder: string;
  selectedUnderlay: string;
  canvasBackground: string;
};

const GRAPH_PALETTES: Record<Theme, GraphPalette> = {
  fresh: {
    nodeText: "#1b2d35",
    nodeTextBackground: "#f6fffb",
    nodeTextBorder: "#b9d9cc",
    nodeBorderDefault: "#2f7f74",
    nodeBackgroundDefault: "#f2fff8",
    difficulty1Background: "#e8f4ff",
    difficulty1Border: "#4786b8",
    difficulty2Background: "#e8f9ee",
    difficulty2Border: "#3f8d5f",
    difficulty3Background: "#fff8e5",
    difficulty3Border: "#a67d2e",
    difficulty4Background: "#ffefe3",
    difficulty4Border: "#c77743",
    difficulty5Background: "#ffe8e6",
    difficulty5Border: "#be5555",
    parentEdge: "#2f7f74",
    relatedEdge: "#8da3a0",
    selectedBorder: "#0f172a",
    selectedUnderlay: "#f4b223",
    canvasBackground: "#f5fffb",
  },
  ocean: {
    nodeText: "#183142",
    nodeTextBackground: "#f4faff",
    nodeTextBorder: "#b9cfe2",
    nodeBorderDefault: "#2f6f98",
    nodeBackgroundDefault: "#edf6ff",
    difficulty1Background: "#e8f2ff",
    difficulty1Border: "#3f77af",
    difficulty2Background: "#e9f7f2",
    difficulty2Border: "#3f8869",
    difficulty3Background: "#fff4e5",
    difficulty3Border: "#ba7f28",
    difficulty4Background: "#ffeede",
    difficulty4Border: "#c56f42",
    difficulty5Background: "#ffe7e3",
    difficulty5Border: "#b95055",
    parentEdge: "#0b6ea6",
    relatedEdge: "#839cb2",
    selectedBorder: "#0f172a",
    selectedUnderlay: "#ea8c2f",
    canvasBackground: "#f4f9ff",
  },
};

export default function GraphClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [simplifiedMode, setSimplifiedMode] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [error, setError] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => payload?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [payload, selectedNodeId],
  );
  const palette = GRAPH_PALETTES[theme];
  const totalNodes = payload?.nodes.length ?? 0;
  const totalRelations = payload?.relations.length ?? 0;
  const displayedRelationCount = simplifiedMode
    ? (payload?.relations.filter((relation) => relation.relationType === "PARENT_CHILD").length ??
      0)
    : totalRelations;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSimplifiedMode(window.innerWidth < 768);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setTheme(readThemeFromDocument());
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    async function loadGraph() {
      try {
        const data = await apiFetch<GraphPayload>("/api/graph");
        setPayload(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "加载图谱失败");
      }
    }

    void loadGraph();
  }, []);

  useEffect(() => {
    if (!payload || !containerRef.current) {
      return;
    }

    let disposed = false;
    let cy: Core | null = null;
    const graphPayload = payload;

    async function mountGraph() {
      const cytoscapeModule = await import("cytoscape");
      const cytoscape = cytoscapeModule.default;

      if (disposed || !containerRef.current) {
        return;
      }

      const relations = simplifiedMode
        ? graphPayload.relations.filter((relation) => relation.relationType === "PARENT_CHILD")
        : graphPayload.relations;

      cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...graphPayload.nodes.map((node) => ({
            data: {
              id: node.id,
              label: node.title,
              difficulty: node.difficulty,
            },
          })),
          ...relations.map((relation) => ({
            data: {
              id: relation.id,
              source: relation.fromNodeId,
              target: relation.toNodeId,
              relationType: relation.relationType,
            },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-wrap": "wrap",
              "text-max-width": "140px",
              "font-size": "12px",
              "min-zoomed-font-size": 9,
              shape: "round-rectangle",
              color: palette.nodeText,
              "text-valign": "center",
              "text-halign": "center",
              "text-background-color": palette.nodeTextBackground,
              "text-background-opacity": 0.9,
              "text-background-padding": "2px",
              "text-border-color": palette.nodeTextBorder,
              "text-border-opacity": 0.8,
              "text-border-width": 1,
              "border-width": 2,
              "border-color": palette.nodeBorderDefault,
              "background-color": palette.nodeBackgroundDefault,
              width: "mapData(difficulty, 1, 5, 108, 168)",
              height: "mapData(difficulty, 1, 5, 54, 84)",
            },
          },
          {
            selector: "node[difficulty = 1]",
            style: {
              "background-color": palette.difficulty1Background,
              "border-color": palette.difficulty1Border,
            },
          },
          {
            selector: "node[difficulty = 2]",
            style: {
              "background-color": palette.difficulty2Background,
              "border-color": palette.difficulty2Border,
            },
          },
          {
            selector: "node[difficulty = 3]",
            style: {
              "background-color": palette.difficulty3Background,
              "border-color": palette.difficulty3Border,
            },
          },
          {
            selector: "node[difficulty = 4]",
            style: {
              "background-color": palette.difficulty4Background,
              "border-color": palette.difficulty4Border,
            },
          },
          {
            selector: "node[difficulty = 5]",
            style: {
              "background-color": palette.difficulty5Background,
              "border-color": palette.difficulty5Border,
            },
          },
          {
            selector: "edge",
            style: {
              opacity: 0.85,
              "curve-style": "bezier",
            },
          },
          {
            selector: 'edge[relationType = "PARENT_CHILD"]',
            style: {
              width: 2.4,
              "line-color": palette.parentEdge,
              "target-arrow-shape": "triangle",
              "target-arrow-color": palette.parentEdge,
            },
          },
          {
            selector: 'edge[relationType = "RELATED"]',
            style: {
              width: 1.2,
              "line-color": palette.relatedEdge,
              "line-style": "dashed",
              "target-arrow-shape": "none",
              opacity: 0.6,
            },
          },
          {
            selector: ".selected",
            style: {
              "border-width": 4,
              "border-color": palette.selectedBorder,
              "underlay-color": palette.selectedUnderlay,
              "underlay-padding": 8,
              "underlay-opacity": 0.32,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          fit: true,
          padding: 32,
          nodeRepulsion: 15000,
          idealEdgeLength: 120,
        },
      });

      cy.on("tap", "node", (event: EventObjectNode) => {
        const nodeId = event.target.id();
        setSelectedNodeId(nodeId);

        cy?.nodes().removeClass("selected");
        event.target.addClass("selected");
      });
    }

    void mountGraph();

    return () => {
      disposed = true;
      cy?.destroy();
    };
  }, [palette, payload, simplifiedMode]);

  return (
    <div className="space-y-4 motion-stagger">
      {error ? <p className="alert-error">{error}</p> : null}

      <section className="panel">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold">图谱画布</h2>
            <p className="text-sm text-muted">拖拽节点、滚轮缩放，点击节点查看详情。</p>
          </div>
          <label className="btn-secondary h-10 cursor-pointer gap-2 px-3 text-sm">
            <input
              type="checkbox"
              checked={simplifiedMode}
              onChange={(event) => setSimplifiedMode(event.target.checked)}
            />
            简化模式
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="chip border-0 bg-surface-soft">节点 {totalNodes}</span>
          <span className="chip border-0 bg-surface-soft">
            关系 {displayedRelationCount}
            {simplifiedMode ? ` / 总计 ${totalRelations}` : ""}
          </span>
          <span className="chip border-0 bg-surface-soft">
            主题 {theme === "fresh" ? "清爽青绿" : "海盐蓝橙"}
          </span>
        </div>

        {totalNodes > 0 ? (
          <div
            ref={containerRef}
            className="mt-3 h-[56vh] min-h-[280px] rounded-xl border border-border bg-surface-soft md:h-[70vh] md:min-h-[380px]"
            style={{ backgroundColor: palette.canvasBackground }}
          />
        ) : (
          <div className="panel-soft mt-3 text-sm text-muted">
            当前没有可展示节点，请先创建知识点。
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="chip" style={{ borderColor: palette.parentEdge }}>
            父子关系：实线箭头
          </span>
          <span className="chip" style={{ borderColor: palette.relatedEdge }}>
            关联关系：虚线
          </span>
          <span className="chip" style={{ borderColor: palette.selectedBorder }}>
            点击节点可高亮与查看详情
          </span>
          <span className="chip border-0 bg-surface-soft">
            难度 1-5
            <span className="ml-2 inline-flex gap-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette.difficulty1Background }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette.difficulty2Background }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette.difficulty3Background }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette.difficulty4Background }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette.difficulty5Background }}
              />
            </span>
          </span>
        </div>
      </section>

      <section className="panel">
        <h2 className="text-lg font-semibold">节点详情</h2>
        {selectedNode ? (
          <div className="panel-soft mt-2 space-y-2 text-sm">
            <p>
              标题: <span className="font-medium">{selectedNode.title}</span>
            </p>
            <p>难度: {selectedNode.difficulty}</p>
            <div className="flex flex-wrap gap-1">
              {selectedNode.tags.length > 0 ? (
                selectedNode.tags.map((tag) => (
                  <span key={tag} className="chip border-0 bg-surface-soft">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-muted">标签: 无</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={`/nodes/${selectedNode.id}`} className="btn-secondary h-10 px-3 text-sm">
                打开编辑
              </Link>
              <Link
                href={`/nodes/${selectedNode.id}/preview`}
                className="btn-secondary h-10 px-3 text-sm"
              >
                只读预览
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">点击图中任一节点查看详情与快捷操作。</p>
        )}
      </section>
    </div>
  );
}
