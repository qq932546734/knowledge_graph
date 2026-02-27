import { AppShell } from "@/components/app-shell";

import PracticeQuestionClient from "./practice-question-client";

export default async function PracticeQuestionPage() {
  return (
    <AppShell title="随机面试题作答" subtitle="抽题 -> 作答 -> 看参考答案 -> 自评分">
      <PracticeQuestionClient />
    </AppShell>
  );
}
