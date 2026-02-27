import { AppShell } from "@/components/app-shell";

import BackupClient from "./backup-client";

export default async function BackupPage() {
  return (
    <AppShell title="备份与恢复" subtitle="导出 JSON、导入预检、token 校验后全量覆盖导入">
      <BackupClient />
    </AppShell>
  );
}
