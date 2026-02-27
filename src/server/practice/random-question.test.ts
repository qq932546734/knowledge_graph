import type { InterviewQuestion, PracticeEvent } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { selectRandomQuestion } from "@/server/practice/random-question";

function question(id: string): InterviewQuestion {
  const now = new Date();

  return {
    id,
    userId: "u1",
    nodeId: "n1",
    question: `Q-${id}`,
    referenceAnswerMd: "A",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function practice(score: number, answeredAt: Date): PracticeEvent {
  return {
    id: `p-${score}-${answeredAt.getTime()}`,
    userId: "u1",
    mode: "QUESTION_ANSWER",
    nodeId: "n1",
    questionId: "q1",
    answeredAt,
    selfScore: score,
    note: null,
  };
}

describe("selectRandomQuestion", () => {
  it("uses pure random when coverage ratio < 30%", () => {
    const mathSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const result = selectRandomQuestion(
      [
        { question: question("q1"), recentPractice: [] },
        { question: question("q2"), recentPractice: [] },
        { question: question("q3"), recentPractice: [] },
        { question: question("q4"), recentPractice: [] },
      ],
      1,
    );

    expect(result.strategy).toBe("PURE_RANDOM");
    expect(result.coverageRatio).toBe(0.25);

    mathSpy.mockRestore();
  });

  it("supports exploration branch (20%)", () => {
    const mathSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.1) // explore decision
      .mockReturnValueOnce(0.1); // random index

    const result = selectRandomQuestion(
      [
        { question: question("q1"), recentPractice: [] },
        { question: question("q2"), recentPractice: [] },
        { question: question("q3"), recentPractice: [] },
        { question: question("q4"), recentPractice: [] },
      ],
      4,
    );

    expect(result.strategy).toBe("EXPLORE");

    mathSpy.mockRestore();
  });

  it("uses weighted strategy and favors weak+stale questions", () => {
    const now = new Date();
    const old = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    const mathSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.5) // not explore
      .mockReturnValueOnce(0.95); // weighted pick near end

    const result = selectRandomQuestion(
      [
        {
          question: question("q-strong"),
          recentPractice: [practice(5, now), practice(5, now)],
        },
        {
          question: question("q-weak"),
          recentPractice: [practice(1, old), practice(2, old)],
        },
      ],
      2,
    );

    expect(result.strategy).toBe("WEIGHTED");
    expect(result.selected.id).toBe("q-weak");

    mathSpy.mockRestore();
  });
});
