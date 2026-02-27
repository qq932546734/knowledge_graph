const DAY_MS = 24 * 60 * 60 * 1000;

export function localDayRange(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

export function overdueDays(nextReviewAt: Date, now = new Date()): number {
  const diffMs = now.getTime() - nextReviewAt.getTime();
  return Math.max(0, Math.floor(diffMs / DAY_MS));
}
