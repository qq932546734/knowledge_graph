import { AppShell } from "@/components/app-shell";

import ReviewClient from "./review-client";

export default async function ReviewPage() {
  return (
    <AppShell title="复习流程" subtitle="回忆 -> 对照 -> 评分 -> 自动调度">
      <ReviewClient />
    </AppShell>
  );
}
