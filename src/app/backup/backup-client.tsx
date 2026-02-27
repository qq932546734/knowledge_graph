"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/client/api";

type ValidationResponse = {
  valid: boolean;
  validationToken: string;
  expiresInSeconds: number;
  summary: {
    knowledgeNodes: number;
    nodeRelations: number;
    interviewQuestions: number;
    reviewEvents: number;
    practiceEvents: number;
  };
};

export default function BackupClient() {
  const [jsonInput, setJsonInput] = useState("");
  const [token, setToken] = useState("");
  const [validationSummary, setValidationSummary] = useState<ValidationResponse["summary"] | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportBackup() {
    setError(null);

    try {
      const payload = await apiFetch<Record<string, unknown>>("/api/backup/export");
      const content = JSON.stringify(payload, null, 2);

      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `knowledge-graph-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage("导出成功");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "导出失败");
    }
  }

  async function validateImport() {
    setError(null);

    try {
      const parsed = JSON.parse(jsonInput);
      const response = await apiFetch<ValidationResponse>(
        "/api/backup/import/validate",
        {
          method: "POST",
          body: JSON.stringify(parsed),
        },
        true,
      );

      setToken(response.validationToken);
      setValidationSummary(response.summary);
      setMessage(`预检通过，token 有效期 ${response.expiresInSeconds} 秒`);
    } catch (validateError) {
      setValidationSummary(null);
      setError(validateError instanceof Error ? validateError.message : "预检失败");
    }
  }

  async function importBackup() {
    setError(null);

    try {
      const parsed = JSON.parse(jsonInput);
      await apiFetch(
        "/api/backup/import",
        {
          method: "POST",
          body: JSON.stringify({
            validationToken: token,
            payload: parsed,
          }),
        },
        true,
      );

      setMessage("导入成功，数据已全量覆盖");
      setToken("");
      setValidationSummary(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "导入失败");
    }
  }

  function renderImportContent() {
    return (
      <>
        <p className="mt-1 text-sm text-muted">
          推荐顺序：1) 粘贴 JSON 2) 预检生成 token 3) 使用 token 执行导入。
        </p>
        <textarea
          className="panel-soft mt-3 min-h-48 w-full font-mono text-xs md:min-h-64"
          placeholder="粘贴备份 JSON"
          value={jsonInput}
          onChange={(event) => setJsonInput(event.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => void validateImport()}>
            预检生成 token
          </button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={!token}
            onClick={() => void importBackup()}
          >
            使用 token 导入
          </button>
        </div>

        {token ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted">
              validationToken:{" "}
              <span className="break-all font-mono text-xs text-muted-strong">{token}</span>
            </p>
            {validationSummary ? (
              <div className="flex flex-wrap gap-1">
                <span className="chip border-0 bg-surface-soft">
                  节点 {validationSummary.knowledgeNodes}
                </span>
                <span className="chip border-0 bg-surface-soft">
                  关系 {validationSummary.nodeRelations}
                </span>
                <span className="chip border-0 bg-surface-soft">
                  题目 {validationSummary.interviewQuestions}
                </span>
                <span className="chip border-0 bg-surface-soft">
                  复习事件 {validationSummary.reviewEvents}
                </span>
                <span className="chip border-0 bg-surface-soft">
                  训练事件 {validationSummary.practiceEvents}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">尚未生成导入 token。</p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4 motion-stagger">
      <section className="panel">
        <h2 className="text-lg font-semibold">导出备份</h2>
        <p className="mt-1 text-sm text-muted">下载当前全量数据 JSON，可用于迁移或灾备恢复。</p>
        <button className="btn-primary mt-3" onClick={() => void exportBackup()}>
          导出完整 JSON
        </button>
      </section>

      <section className="panel hidden md:block">
        <h2 className="text-lg font-semibold">导入（全量覆盖）</h2>
        {renderImportContent()}
      </section>

      <details className="panel md:hidden">
        <summary className="cursor-pointer text-lg font-semibold">导入（全量覆盖）</summary>
        <div className="mt-2">{renderImportContent()}</div>
      </details>

      {message ? <p className="alert-success">{message}</p> : null}
      {error ? <p className="alert-error">{error}</p> : null}
    </div>
  );
}
