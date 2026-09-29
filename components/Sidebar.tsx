"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useBot } from "@/components/BotContext";
import { useAppShell } from "@/components/AppShellContext";

const COLLAPSE_STORAGE_KEY = "plnb-sidebar-collapsed";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  );
}

const MAIN_MENU = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/conversations", label: "Conversations", icon: "chat" },
  { href: "/forwarded-conversations", label: "Escalations", icon: "forward" },
  { href: "/tickets", label: "Tickets", icon: "ticket" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
] as const;

const CONFIG = [
  { href: "/logs", label: "Logs", icon: "logs" },
] as const;

const SETTINGS_ITEM = { href: "/settings", label: "Settings", icon: "settings" } as const;

function Icon({ name }: { name: string }) {
  const cls = "h-5 w-5 shrink-0";
  switch (name) {
    case "grid":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "chat":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "forward":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "rules":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "ticket":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      );
    case "logs":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function NavItemLink({
  href,
  label,
  icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-[10px] py-2.5 font-manrope text-sm font-semibold transition-colors ${
        collapsed ? "justify-center px-2.5" : "gap-3 px-3"
      } ${active ? "bg-peach text-terracotta" : "text-ink hover:bg-ink/[.05]"}`}
    >
      <Icon name={icon} />
      {!collapsed && label}
    </Link>
  );
}

function isItemActive(path: string, href: string) {
  return href === "/dashboard" ? path === href : path === href || path.startsWith(href);
}

function NavGroup({
  title,
  items,
  path,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: readonly { href: string; label: string; icon: string }[];
  path: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <div>
      {collapsed ? (
        <div className="mx-3 mb-2 border-t border-ink/[.08]" />
      ) : (
        <p className="mb-2 px-3 font-manrope text-[11px] font-extrabold uppercase tracking-wider text-warm-muted">
          {title}
        </p>
      )}
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon }) => (
          <li key={href}>
            <NavItemLink
              href={href}
              label={label}
              icon={icon}
              active={isItemActive(path, href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { userPlan } = useBot();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppShell();
  const isPro = userPlan === "pro";
  const path = pathname ?? "";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const mainMenuItems = MAIN_MENU.filter((item) => !("proOnly" in item && item.proOnly) || isPro);

  const sidebarContent = (collapsedNav: boolean) => (
    <div className="flex h-full flex-col px-3 py-6">
      <nav className="flex-1 space-y-6">
        <NavGroup
          title="Main menu"
          items={mainMenuItems}
          path={path}
          collapsed={collapsedNav}
          onNavigate={() => setMobileSidebarOpen(false)}
        />
        <NavGroup
          title="Configuration"
          items={CONFIG}
          path={path}
          collapsed={collapsedNav}
          onNavigate={() => setMobileSidebarOpen(false)}
        />
      </nav>
    </div>
  );

  const settingsFooter = (collapsedNav: boolean) => (
    <div className="border-t border-ink/[.08] px-3 py-3">
      <NavItemLink
        href={SETTINGS_ITEM.href}
        label={SETTINGS_ITEM.label}
        icon={SETTINGS_ITEM.icon}
        active={isItemActive(path, SETTINGS_ITEM.href)}
        collapsed={collapsedNav}
        onNavigate={() => setMobileSidebarOpen(false)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop: always visible sidebar, collapsible */}
      <aside
        className={`hidden h-screen shrink-0 flex-col overflow-y-auto border-r border-ink/[.08] bg-cream-alt transition-[width] duration-200 ease-out lg:flex ${
          collapsed ? "w-[76px]" : "w-56"
        }`}
      >
        <div className={`flex items-center pt-6 ${collapsed ? "flex-col gap-3 px-2.5" : "justify-between px-6"}`}>
          {!collapsed && (
            <Link href="/" className="font-display text-xl italic text-ink no-underline hover:text-ink">
              Plainbot
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-warm-muted transition-colors hover:bg-ink/[.05] hover:text-ink"
          >
            <CollapseIcon className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        {sidebarContent(collapsed)}
        {settingsFooter(collapsed)}
      </aside>
      {/* Mobile/tablet: overlay drawer (never collapsed) */}
      <div className="lg:hidden">
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed left-0 top-0 z-50 flex h-full w-64 max-w-[85vw] flex-col border-r border-ink/[.08] bg-cream-alt shadow-xl transition-transform duration-200 ease-out lg:hidden ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-ink/[.08] px-3 py-3">
            <span className="font-manrope text-sm font-bold text-ink">Menu</span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-lg p-2 text-warm-muted hover:bg-ink/[.05] hover:text-ink"
              aria-label="Close menu"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sidebarContent(false)}
          </div>
          {settingsFooter(false)}
        </aside>
      </div>
    </>
  );
}
