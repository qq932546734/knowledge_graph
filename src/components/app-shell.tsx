import { auth, signOut } from "@/auth";
import { AppShellNav } from "@/components/app-shell-nav";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/dashboard", label: "看板", match: "exact" as const },
  { href: "/nodes", label: "知识点", match: "prefix" as const },
  { href: "/relations", label: "知识树", match: "prefix" as const },
  { href: "/review", label: "复习", match: "prefix" as const },
  { href: "/practice/node", label: "随机复述", match: "exact" as const },
  { href: "/practice/question", label: "随机题", match: "exact" as const },
  { href: "/graph", label: "图谱", match: "prefix" as const },
  { href: "/backup", label: "备份", match: "prefix" as const },
];

export async function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const session = await auth();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  function renderBannerContent() {
    return (
      <>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-soft px-4 py-4 xs:px-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-2">
              Knowledge Studio
            </p>
            <h1 className="text-xl font-semibold xs:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 xs:gap-3">
            <ThemeToggle />
            <span className="text-xs text-muted-2 xs:text-sm">{session?.user?.email}</span>
            <form action={handleSignOut}>
              <button className="btn-secondary sm:min-w-24">退出</button>
            </form>
          </div>
        </div>

        <div className="px-4 py-3 xs:px-5">
          <AppShellNav links={navLinks} />
        </div>
      </>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 xs:px-6 sm:px-8">
      <header className="motion-enter overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="hidden md:block">{renderBannerContent()}</div>

        <details className="app-shell-banner md:hidden">
          <summary className="app-shell-banner-summary-hit px-4 py-3 xs:px-5">
            <span className="app-shell-banner-summary">
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-2">
                  Knowledge Studio
                </span>
                <span className="block truncate text-lg font-semibold">{title}</span>
              </span>
              <span className="app-shell-banner-toggle text-xs text-muted" aria-hidden="true" />
            </span>
          </summary>

          <div className="app-shell-banner-content">{renderBannerContent()}</div>
        </details>
      </header>

      <section className="mt-6 motion-enter-soft">{children}</section>
    </main>
  );
}
