"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/client/api";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type NodePayload = {
  id: string;
  title: string;
  contentMd: string;
  tags: string[];
  deletedAt: string | null;
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

export default function PreviewClient({ nodeId }: { nodeId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NodeDetailResult | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<NodeDetailResult>(`/api/nodes/${nodeId}`);
        setData(result);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [nodeId]);

  if (loading) {
    return <p>加载中...</p>;
  }

  if (error) {
    return <p className="alert-error">{error}</p>;
  }

  if (!data) {
    return <p>未找到知识点。</p>;
  }

  const parentChildCount = data.relations.filter(
    (relation) => relation.relationType === "PARENT_CHILD",
  ).length;
  const relatedCount = data.relations.length - parentChildCount;

  return (
    <div className="space-y-4 motion-stagger">
      <section className="panel">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold">{data.node.title}</h2>
            <p className="mt-1 text-sm text-muted">只读查看正文、标签与面试题，可随时跳转编辑。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/nodes/${data.node.id}`} className="btn-secondary">
              编辑节点
            </Link>
            <Link href="/nodes" className="btn-secondary">
              返回列表
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="chip border-0 bg-surface-soft">面试题 {data.questions.length}</span>
          <span className="chip border-0 bg-surface-soft">父子关系 {parentChildCount}</span>
          <span className="chip border-0 bg-surface-soft">关联关系 {relatedCount}</span>
          <span
            className={`chip border-0 ${data.node.deletedAt ? "bg-amber-100 text-amber-800" : "bg-surface-soft"}`}
          >
            {data.node.deletedAt ? "已软删除（只读）" : "正常节点"}
          </span>
        </div>

        {data.node.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {data.node.tags.map((tag) => (
              <span key={tag} className="chip border-0 bg-surface-soft">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">暂无标签。</p>
        )}
      </section>

      <section className="panel">
        <h3 className="text-lg font-semibold">正文</h3>
        {data.node.contentMd.trim() ? (
          <MarkdownRenderer className="mt-3">{data.node.contentMd}</MarkdownRenderer>
        ) : (
          <p className="mt-3 text-sm text-muted">暂无正文内容。</p>
        )}
      </section>

      <section className="panel">
        <h3 className="text-lg font-semibold">面试题</h3>
        {data.questions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">暂无面试题。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.questions.map((question, index) => (
              <li key={question.id} className="panel-soft">
                <p className="text-xs font-medium text-muted-2">题目 {index + 1}</p>
                <p className="mt-1 font-medium">{question.question}</p>
                <MarkdownRenderer className="mt-2 text-sm text-muted-strong">
                  {question.referenceAnswerMd}
                </MarkdownRenderer>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
