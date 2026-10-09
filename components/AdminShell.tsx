"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/lib/use-logout";

const ADMIN_NAV = [
  { href: "/admin",       label: "Founder Analytics", icon: "chart" },
  { href: "/admin/users", label: "Users",              icon: "users" },
  { href: "/admin/logs",  label: "Logs",               icon: "logs"  },
  { href: "/admin/usage", label: "AI Usage & Cost",    icon: "usage" },
] as const;

function Icon({ name }: { name: string }) {
  const cls = "h-5 w-5 shrink-0";
  switch (name) {
    case "users":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-4.13a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 00-8 0" />
        </svg>
      );
    case "chart":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "logs":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case "usage":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

function isItemActive(path: string, href: string) {
  return href === "/admin" ? path === href : path === href || path.startsWith(href);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname ?? "";
  const logout = useLogout();

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <aside className="hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-ink/[.08] bg-cream-alt lg:flex">
        <div className="px-6 pt-6">
          <Link href="/admin" className="font-display text-xl italic text-ink no-underline hover:text-ink">
            Plainbot
          </Link>
          <p className="mt-0.5 font-manrope text-[11px] font-extrabold uppercase tracking-wider text-terracotta">
            Admin
          </p>
        </div>
        <nav className="flex-1 space-y-6 px-3 py-6">
          <div>
            <p className="mb-2 px-3 font-manrope text-[11px] font-extrabold uppercase tracking-wider text-warm-muted">
              Founder tools
            </p>
            <ul className="space-y-0.5">
              {ADMIN_NAV.map(({ href, label, icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 font-manrope text-sm font-semibold transition-colors ${
                      isItemActive(path, href) ? "bg-peach text-terracotta" : "text-ink hover:bg-ink/[.05]"
                    }`}
                  >
                    <Icon name={icon} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-ink/[.08] bg-white px-4 py-4 shadow-[0_1px_0_rgba(43,34,28,.02),0_2px_10px_-6px_rgba(43,34,28,.08)] sm:px-8">
          <span className="font-manrope text-sm font-bold text-ink lg:hidden">Plainbot Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-full border border-ink/[.15] bg-white px-4 py-2 font-manrope text-[13px] font-bold text-ink transition-colors hover:border-ink/25 hover:bg-ink/[.04]"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
