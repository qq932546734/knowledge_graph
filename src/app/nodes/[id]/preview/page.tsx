import { AppShell } from "@/components/app-shell";

import PreviewClient from "./preview-client";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function NodePreviewPage({ params }: Params) {
  const { id } = await params;

  return (
    <AppShell title="知识点预览" subtitle="只读模式：查看正文与面试题">
      <PreviewClient nodeId={id} />
    </AppShell>
  );
}
