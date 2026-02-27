import { AppShell } from "@/components/app-shell";

import NodeEditorClient from "@/app/nodes/node-editor-client";

export default async function NewNodePage() {
  return (
    <AppShell title="新建知识点" subtitle="创建后自动进入编辑页">
      <NodeEditorClient />
    </AppShell>
  );
}
