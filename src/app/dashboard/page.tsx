import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { localDayRange } from "@/lib/day";
import { prisma } from "@/server/db";

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computeStreak(completedDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = dayKey(cursor);
    if (!completedDates.has(key)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const now = new Date();
  const { start, end } = localDayRange(now);

  const [todayDueCount, todayDoneCount, reviewEvents, recentReviews] = await Promise.all([
    prisma.knowledgeNode.count({
      where: {
        userId,
        deletedAt: null,
        nextReviewAt: {
          not: null,
          lt: end,
        },
      },
    }),
    prisma.reviewEvent.count({
      where: {
        userId,
        reviewedAt: {
          gte: start,
          lt: end,
        },
      },
    }),
    prisma.reviewEvent.findMany({
      where: { userId },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
      take: 365,
    }),
    prisma.reviewEvent.findMany({
      where: { userId },
      include: {
        node: {
          select: {
            tags: true,
          },
        },
      },
      orderBy: { reviewedAt: "desc" },
      take: 300,
    }),
  ]);

  const completedDays = new Set(reviewEvents.map((event) => dayKey(event.reviewedAt)));
  const streakDays = computeStreak(completedDays);

  const tagScores = new Map<string, { total: number; count: number }>();
  for (const review of recentReviews) {
    for (const tag of review.node.tags) {
      const previous = tagScores.get(tag) ?? { total: 0, count: 0 };
      tagScores.set(tag, {
        total: previous.total + review.quality,
        count: previous.count + 1,
      });
    }
  }

  const weakTagsTopN = [...tagScores.entries()]
    .map(([tag, value]) => ({
      tag,
      avgScore: value.total / value.count,
    }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);

  return (
    <AppShell title="Dashboard" subtitle={`欢迎回来，${session.user.email}`}>
      <section className="panel overflow-hidden p-0">
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <article className="p-5">
            <p className="text-sm font-medium text-muted-2">今日状态</p>
            <h2 className="mt-1 text-2xl font-semibold">保持复盘节奏</h2>
            <p className="mt-2 text-sm text-muted">
              今天有 {todayDueCount} 条到期，已完成 {todayDoneCount} 条，连续学习 {streakDays} 天。
            </p>
          </article>
          <div className="flex flex-wrap items-center gap-2 p-5">
            <Link href="/review" className="btn-primary">
              进入复习队列
            </Link>
            <Link href="/practice/question" className="btn-secondary">
              开始随机题
            </Link>
            <Link href="/practice/node" className="btn-secondary">
              随机复述
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="panel">
          <p className="text-sm text-muted">今日到期</p>
          <p className="mt-2 text-4xl font-semibold text-primary">{todayDueCount}</p>
        </article>
        <article className="panel">
          <p className="text-sm text-muted">今日完成</p>
          <p className="mt-2 text-4xl font-semibold text-primary">{todayDoneCount}</p>
        </article>
        <article className="panel">
          <p className="text-sm text-muted">连续天数</p>
          <p className="mt-2 text-4xl font-semibold text-primary">{streakDays}</p>
        </article>
      </section>

      <section className="panel mt-6">
        <h2 className="text-lg font-semibold">弱项标签 Top 5</h2>
        <ul className="mt-3 space-y-2">
          {weakTagsTopN.length > 0 ? (
            weakTagsTopN.map((item) => (
              <li key={item.tag} className="panel-soft flex items-center justify-between">
                <span className="chip border-0 bg-surface-soft font-medium">{item.tag}</span>
                <span className="text-sm text-muted">平均分 {item.avgScore.toFixed(2)}</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted">暂无复习数据</li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}
