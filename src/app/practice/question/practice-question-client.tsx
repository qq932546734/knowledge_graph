"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/client/api";

type QuestionPayload = {
  question: {
    id: string;
    nodeId: string;
    question: string;
    referenceAnswerMd: string;
  };
  strategy: "PURE_RANDOM" | "WEIGHTED" | "EXPLORE";
  coverageRatio: number;
};

export default function PracticeQuestionClient() {
  const [payload, setPayload] = useState<QuestionPayload | null>(null);
  const [nodeTitle, setNodeTitle] = useState("");
  const [note, setNote] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function drawQuestion() {
    setError(null);

    try {
      const response = await apiFetch<QuestionPayload>("/api/practice/random-question");
      setPayload(response);
      setShowAnswer(false);
      setNote("");

      const nodeResponse = await apiFetch<{ node: { title: string } }>(
        `/api/nodes/${response.question.nodeId}`,
      );
      setNodeTitle(nodeResponse.node.title);
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : "抽题失败");
    }
  }

  async function submit(score: number) {
    if (!payload) {
      return;
    }

    try {
      await apiFetch(
        "/api/practice/submit",
        {
          method: "POST",
          body: JSON.stringify({
            mode: "QUESTION_ANSWER",
            nodeId: payload.question.nodeId,
            questionId: payload.question.id,
            selfScore: score,
            note: note || null,
          }),
        },
        true,
      );

      await drawQuestion();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    }
  }

  return (
    <div className="space-y-4 motion-stagger">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-muted-2">随机问答</p>
            <p className="text-sm text-muted">抽题作答后查看参考答案，再进行自评。</p>
          </div>
          <button className="btn-primary" onClick={() => void drawQuestion()}>
            抽取随机题目
          </button>
        </div>
      </section>

      {error ? <p className="alert-error">{error}</p> : null}

      {payload ? (
        <section className="panel">
          <h2 className="text-lg font-semibold">{payload.question.question}</h2>
          <p className="mt-1 text-sm text-muted">
            节点: {nodeTitle || payload.question.nodeId} · 策略: {payload.strategy} · 覆盖率:{" "}
            {(payload.coverageRatio * 100).toFixed(1)}%
          </p>

          <button className="btn-secondary mt-3" onClick={() => setShowAnswer((value) => !value)}>
            {showAnswer ? "隐藏参考答案" : "显示参考答案"}
          </button>

          {showAnswer ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-soft p-3 text-sm">
              {payload.question.referenceAnswerMd}
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
                onClick={() => void submit(score)}
                disabled={!showAnswer}
              >
                {score}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel-soft text-sm text-muted">点击上方按钮开始一轮随机问答。</section>
      )}
    </div>
  );
}
