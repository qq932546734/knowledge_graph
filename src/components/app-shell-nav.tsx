"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

function isActive(pathname: string, link: NavLink) {
  if (link.match === "exact") {
    return pathname === link.href;
  }

  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function AppShellNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <>
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
        {links.map((link) => {
          const active = isActive(pathname, link);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface text-muted-strong hover:bg-surface-soft"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <nav className="hidden grid-cols-2 gap-2 md:grid md:grid-cols-4 xl:grid-cols-8">
        {links.map((link) => {
          const active = isActive(pathname, link);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex h-11 items-center justify-center rounded-xl border px-2 text-sm transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface text-muted-strong hover:-translate-y-0.5 hover:bg-surface-soft"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
