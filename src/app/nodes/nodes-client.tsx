"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/client/api";

type NodeItem = {
  id: string;
  title: string;
  tags: string[];
  difficulty: number;
  nextReviewAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

type NodeListResult = {
  page: number;
  pageSize: number;
  total: number;
  items: NodeItem[];
};

export default function NodesClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NodeListResult | null>(null);

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    if (keyword.trim()) {
      params.set("keyword", keyword.trim());
    }

    if (difficulty) {
      params.set("difficulty", difficulty);
    }

    return params.toString();
  }, [page, keyword, difficulty, sortBy, sortOrder]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<NodeListResult>(`/api/nodes?${query}`);
      setData(response);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-4 motion-stagger">
      <section className="panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">筛选与排序</h2>
            <p className="text-sm text-muted">按关键词、难度和更新时间快速定位知识点</p>
          </div>
          <Link href="/nodes/new" className="btn-primary">
            新建知识点
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="input-field"
            placeholder="搜索标题/正文"
            value={keyword}
            onChange={(event) => {
              setPage(1);
              setKeyword(event.target.value);
            }}
          />

          <select
            className="input-field"
            value={difficulty}
            onChange={(event) => {
              setPage(1);
              setDifficulty(event.target.value);
            }}
          >
            <option value="">全部难度</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <select
            className="input-field"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="updatedAt">最近更新</option>
            <option value="createdAt">创建时间</option>
            <option value="nextReviewAt">下次复习</option>
            <option value="title">标题</option>
          </select>

          <select
            className="input-field"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
      </section>

      <section className="panel">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">知识点列表</h2>
          <span className="chip">共 {data?.total ?? 0} 条</span>
        </div>

        {loading ? <p>加载中...</p> : null}
        {error ? <p className="text-red-600">{error}</p> : null}

        {!loading && !error ? (
          <>
            {(data?.items.length ?? 0) === 0 ? (
              <div className="panel-soft text-sm text-muted">当前筛选条件下暂无知识点。</div>
            ) : (
              <div className="space-y-3">
                {(data?.items ?? []).map((item) => (
                  <article key={item.id} className="panel-soft">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/nodes/${item.id}/preview`}
                        className="text-base font-semibold underline-offset-2 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <Link className="btn-secondary h-10 px-3 text-sm" href={`/nodes/${item.id}`}>
                        编辑
                      </Link>
                    </div>

                    <Link
                      href={`/nodes/${item.id}/preview`}
                      className="mt-1 block rounded-md p-1 transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                    >
                      <p className="text-sm text-muted">
                        难度 {item.difficulty} · 更新于 {new Date(item.updatedAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        下次复习:{" "}
                        {item.nextReviewAt
                          ? new Date(item.nextReviewAt).toLocaleString()
                          : "未安排"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <span key={tag} className="chip border-0 bg-surface-soft">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {item.deletedAt ? (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          已软删除（可恢复）
                        </p>
                      ) : null}
                    </Link>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  className="btn-secondary disabled:opacity-50 sm:min-w-24"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  上一页
                </button>
                <button
                  className="btn-secondary disabled:opacity-50 sm:min-w-24"
                  disabled={(data?.items.length ?? 0) < 20}
                  onClick={() => setPage((value) => value + 1)}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
