import Link from "next/link";

import { AppShell } from "@/components/app-shell";

import GraphClient from "./graph-client";

export default async function GraphPage() {
  return (
    <AppShell title="知识图谱" subtitle="支持触控拖拽、缩放、节点点选">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/nodes" className="btn-secondary">
          去列表管理
        </Link>
        <Link href="/relations" className="btn-secondary">
          去知识树
        </Link>
      </div>
      <GraphClient />
    </AppShell>
  );
}
