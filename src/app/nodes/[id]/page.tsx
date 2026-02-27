import { AppShell } from "@/components/app-shell";

import NodeEditorClient from "@/app/nodes/node-editor-client";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function NodeDetailPage({ params }: Params) {
  const { id } = await params;

  return (
    <AppShell title="编辑知识点" subtitle="支持软删除、恢复、父子关系概览与关联维护">
      <NodeEditorClient nodeId={id} />
    </AppShell>
  );
}
