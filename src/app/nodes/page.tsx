import { AppShell } from "@/components/app-shell";

import NodesClient from "./nodes-client";

export default async function NodesPage() {
  return (
    <AppShell title="知识点管理" subtitle="搜索、筛选、分页管理知识点">
      <NodesClient />
    </AppShell>
  );
}
