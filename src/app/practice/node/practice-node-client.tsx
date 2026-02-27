"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/client/api";

type NodeItem = {
  id: string;
  title: string;
  contentMd: string;
  tags: string[];
};

export default function PracticeNodeClient() {
  const [node, setNode] = useState<NodeItem | null>(null);
  const [note, setNote] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function drawNode() {
    setLoading(true);
    setError(null);

    try {
      const payload = await apiFetch<NodeItem>("/api/practice/random-node");
      setNode(payload);
      setShowAnswer(false);
      setNote("");
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : "抽取失败");
    } finally {
      setLoading(false);
    }
  }

  async function submit(score: number) {
    if (!node) {
      return;
    }

    try {
      await apiFetch(
        "/api/practice/submit",
        {
          method: "POST",
          body: JSON.stringify({
            mode: "NODE_RECALL",
            nodeId: node.id,
            selfScore: score,
            note: note || null,
          }),
        },
        true,
      );

      await drawNode();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    }
  }

  return (
    <div className="space-y-4 motion-stagger">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-muted-2">随机复述</p>
            <p className="text-sm text-muted">先自述，再看答案并自评分数。</p>
          </div>
          <button className="btn-primary" onClick={() => void drawNode()}>
            {loading ? "抽取中..." : "抽取随机知识点"}
          </button>
        </div>
      </section>

      {error ? <p className="alert-error">{error}</p> : null}

      {node ? (
        <section className="panel">
          <h2 className="text-xl font-semibold">{node.title}</h2>
          {node.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {node.tags.map((tag) => (
                <span key={tag} className="chip border-0 bg-surface-soft">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <button className="btn-secondary mt-3" onClick={() => setShowAnswer((value) => !value)}>
            {showAnswer ? "隐藏内容" : "显示内容"}
          </button>

          {showAnswer ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-soft p-3 text-sm">
              {node.contentMd}
            </pre>
          ) : null}

          <textarea
            className="input-field mt-3 min-h-24 w-full py-3"
            placeholder="训练备注（可选）"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                className={`h-11 rounded-lg border border-border text-sm ${
                  showAnswer ? "bg-surface hover:bg-surface-soft" : "bg-surface-soft"
                }`}
                disabled={!showAnswer}
                onClick={() => void submit(score)}
              >
                {score}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel-soft text-sm text-muted">
          {loading ? "抽取中..." : "点击上方按钮开始一轮随机复述。"}
        </section>
      )}
    </div>
  );
}
