"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/client/api";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type DueNode = {
  id: string;
  title: string;
  contentMd: string;
  tags: string[];
  difficulty: number;
  nextReviewAt: string | null;
  lastQuality: number;
};

type DueQueueResult = {
  totalDueCount: number;
  queue: DueNode[];
};

export default function ReviewClient() {
  const [data, setData] = useState<DueQueueResult | null>(null);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = useMemo(() => data?.queue[index] ?? null, [data, index]);

  async function loadQueue() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<DueQueueResult>("/api/review/due");
      setData(response);
      setIndex(0);
      setShowAnswer(false);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function submitQuality(quality: number) {
    if (!current) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch(
        "/api/review/submit",
        {
          method: "POST",
          body: JSON.stringify({
            nodeId: current.id,
            quality,
          }),
        },
        true,
      );

      if (index + 1 < (data?.queue.length ?? 0)) {
        setIndex((value) => value + 1);
        setShowAnswer(false);
      } else {
        await loadQueue();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 motion-stagger">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-muted-2">复习队列</p>
            <p className="text-sm text-muted">
              今日队列上限 30，当前已到期 {data?.totalDueCount ?? 0} 条
            </p>
          </div>
          <button className="btn-secondary" onClick={() => void loadQueue()}>
            刷新
          </button>
        </div>
        <div className="mt-3 h-2 rounded-full bg-surface-soft">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{
              width: `${Math.min(
                100,
                ((index + (current ? 1 : 0)) / Math.max(1, data?.queue.length ?? 1)) * 100,
              )}%`,
            }}
          />
        </div>
      </section>

      {loading ? <p>加载中...</p> : null}
      {error ? <p className="alert-error">{error}</p> : null}

      {!loading && !current ? (
        <section className="panel p-6">
          <p>当前没有待复习节点。</p>
        </section>
      ) : null}

      {current ? (
        <section className="panel">
          <p className="text-sm text-muted">
            进度 {index + 1}/{data?.queue.length ?? 0}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{current.title}</h2>
          <p className="mt-1 text-sm text-muted">难度 {current.difficulty}</p>
          {current.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {current.tags.map((tag) => (
                <span key={tag} className="chip border-0 bg-surface-soft">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="panel-soft mt-4">
            <h3 className="text-sm font-semibold">回忆阶段</h3>
            <p className="mt-2 text-sm text-muted-strong">先在脑中复述，再点击“显示内容”对照。</p>
            <button className="btn-secondary mt-3" onClick={() => setShowAnswer((value) => !value)}>
              {showAnswer ? "隐藏内容" : "显示内容"}
            </button>

            {showAnswer ? (
              <MarkdownRenderer className="mt-3 rounded-lg border border-border bg-card p-3 text-sm">
                {current.contentMd}
              </MarkdownRenderer>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">打分（0-5）</p>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {[0, 1, 2, 3, 4, 5].map((quality) => (
                <button
                  key={quality}
                  className={`h-11 rounded-lg border border-border px-3 text-sm transition-colors disabled:opacity-50 ${
                    showAnswer ? "bg-surface hover:bg-surface-soft" : "bg-surface-soft"
                  }`}
                  disabled={!showAnswer || submitting}
                  onClick={() => void submitQuality(quality)}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
