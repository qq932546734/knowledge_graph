import { AppShell } from "@/components/app-shell";

import PracticeNodeClient from "./practice-node-client";

export default async function PracticeNodePage() {
  return (
    <AppShell title="随机知识点复述" subtitle="抽知识点 -> 自述 -> 自评分">
      <PracticeNodeClient />
    </AppShell>
  );
}
