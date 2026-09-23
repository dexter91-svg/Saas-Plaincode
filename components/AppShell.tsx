"use client";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import StoreSwitcher from "./StoreSwitcher";
import AgentAudioUnlock from "./AgentAudioUnlock";
import { AppShellProvider, useAppShell } from "./AppShellContext";
import { usePathname } from "next/navigation";
import { useLogout } from "@/lib/use-logout";

const HIDE_SIDEBAR_ROUTES = [
  "/create-bot",
  "/training-data",
  "/bot-personality",
  "/bot-preview",
  "/integration",
  "/test-chatbot",
  "/demo-website",
];

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/** Store switcher + logout row above the page content. Only used when the sidebar is visible (see Sidebar for the "Plainbot" wordmark). */
function AppTopBar() {
  const { setMobileSidebarOpen } = useAppShell();
  const logout = useLogout();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-ink/[.08] bg-white px-4 py-4 shadow-[0_1px_0_rgba(43,34,28,.02),0_2px_10px_-6px_rgba(43,34,28,.08)] sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="rounded-lg p-2 text-warm-muted transition-colors hover:bg-ink/[.05] hover:text-ink lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <StoreSwitcher />
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        className="shrink-0 rounded-full border border-ink/[.15] bg-white px-4 py-2 font-manrope text-[13px] font-bold text-ink transition-colors hover:border-ink/25 hover:bg-ink/[.04]"
      >
        Logout
      </button>
    </header>
  );
}

function AppShellInner({ children, hideSidebar }: { children: React.ReactNode; hideSidebar: boolean }) {
  const sidebarVisible = !hideSidebar;

  if (sidebarVisible) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopBar />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-56px)]">
        <main className="min-h-[calc(100vh-56px)] min-w-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname ?? "";
  const hideSidebar = HIDE_SIDEBAR_ROUTES.some((p) => path.startsWith(p));
  const sidebarVisible = !hideSidebar;

  return (
    <AppShellProvider sidebarVisible={sidebarVisible}>
      <div className="min-h-screen bg-black">
        <AgentAudioUnlock />
        <AppShellInner hideSidebar={hideSidebar}>{children}</AppShellInner>
      </div>
    </AppShellProvider>
  );
}
