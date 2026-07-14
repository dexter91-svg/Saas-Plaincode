"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBot } from "@/components/BotContext";
import { useAppShell } from "@/components/AppShellContext";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const MAIN_MENU = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/conversations", label: "Conversations", icon: "chat" },
  { href: "/forwarded-conversations", label: "Forwarded Conversations", icon: "forward" },
  { href: "/tickets", label: "Tickets", icon: "ticket" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
] as const;

const CONFIG = [
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

function Icon({ name }: { name: string }) {
  const cls = "h-5 w-5 shrink-0";
  switch (name) {
    case "grid":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "chat":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "forward":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "rules":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "ticket":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const { userPlan } = useBot();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppShell();
  const isPro = userPlan === "pro";
  const path = pathname ?? "";

  const sidebarContent = (
    <div className="flex h-full flex-col px-3 py-6">
        <nav className="flex-1 space-y-6">
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Main menu
            </p>
            <ul className="space-y-0.5">
              {MAIN_MENU.filter((item) => !("proOnly" in item && item.proOnly) || isPro).map(({ href, label, icon }) => {
                const isActive = path === href || (href !== "/dashboard" && path.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-500/15 text-primary-400"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                      }`}
                    >
                      <Icon name={icon} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Configuration
            </p>
            <ul className="space-y-0.5">
              {CONFIG.map(({ href, label, icon }) => {
                const isActive = path === href || path.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-500/15 text-primary-400"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                      }`}
                    >
                      <Icon name={icon} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="px-3 text-xs font-medium text-slate-500">Logged in</p>
          <p className="mt-1 px-3 text-sm text-slate-300">Store Manager</p>
        </div>
      </div>
  );

  return (
    <>
      {/* Desktop: always visible sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-800 bg-black lg:block">
        {sidebarContent}
      </aside>
      {/* Mobile/tablet: overlay drawer */}
      <div className="lg:hidden">
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed left-0 top-0 z-50 h-full w-64 max-w-[85vw] border-r border-slate-800 bg-black shadow-xl transition-transform duration-200 ease-out lg:hidden ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3">
            <span className="text-sm font-semibold text-slate-200">Menu</span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              aria-label="Close menu"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto py-2">
            {sidebarContent}
          </div>
        </aside>
      </div>
    </>
  );
}
