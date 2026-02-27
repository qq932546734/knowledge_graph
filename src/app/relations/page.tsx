import { AppShell } from "@/components/app-shell";

import RelationsClient from "./relations-client";

export default async function RelationsPage() {
  return (
    <AppShell title="知识树" subtitle="默认浏览树结构，按需打开抽屉新增节点">
      <RelationsClient />
    </AppShell>
  );
}
