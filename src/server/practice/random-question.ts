import type { InterviewQuestion, PracticeEvent } from "@prisma/client";

interface QuestionWithStats {
  question: InterviewQuestion;
  recentPractice: PracticeEvent[];
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function pickRandom<T>(items: T[]): T {
  return items[randomInt(items.length)]!;
}

function weightedPick<T>(items: Array<{ item: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let randomValue = Math.random() * totalWeight;

  for (const item of items) {
    randomValue -= item.weight;
    if (randomValue <= 0) {
      return item.item;
    }
  }

  return items[items.length - 1]!.item;
}

export function selectRandomQuestion(
  questionsWithStats: QuestionWithStats[],
  practicedQuestionCount: number,
): {
  selected: InterviewQuestion;
  strategy: "PURE_RANDOM" | "WEIGHTED" | "EXPLORE";
  coverageRatio: number;
} {
  if (questionsWithStats.length === 0) {
    throw new Error("No questions available");
  }

  const coverageRatio = practicedQuestionCount / questionsWithStats.length;

  if (coverageRatio < 0.3) {
    return {
      selected: pickRandom(questionsWithStats).question,
      strategy: "PURE_RANDOM",
      coverageRatio,
    };
  }

  const explore = Math.random() < 0.2;
  if (explore) {
    return {
      selected: pickRandom(questionsWithStats).question,
      strategy: "EXPLORE",
      coverageRatio,
    };
  }

  const now = Date.now();
  const weightedItems = questionsWithStats.map(({ question, recentPractice }) => {
    const windowedRecords = recentPractice
      .filter((event) => now - event.answeredAt.getTime() <= SIXTY_DAYS_MS)
      .slice(0, 5);

    const avgSelfScore =
      windowedRecords.length > 0
        ? windowedRecords.reduce((sum, event) => sum + event.selfScore, 0) / windowedRecords.length
        : null;

    const weakness = avgSelfScore === null ? 0.5 : (5 - avgSelfScore) / 4;

    const latestEvent = recentPractice[0] ?? null;
    const daysSinceLastPractice = latestEvent
      ? (now - latestEvent.answeredAt.getTime()) / (24 * 60 * 60 * 1000)
      : null;

    const stale = daysSinceLastPractice === null ? 1 : Math.min(daysSinceLastPractice / 14, 1);

    const rawWeight = 0.75 * weakness + 0.25 * stale;
    const weight = Math.max(rawWeight, 0.05);

    return {
      item: question,
      weight,
    };
  });

  return {
    selected: weightedPick(weightedItems),
    strategy: "WEIGHTED",
    coverageRatio,
  };
}
