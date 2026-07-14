"use client";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import AgentAudioUnlock from "./AgentAudioUnlock";
import { AppShellProvider, useAppShell } from "./AppShellContext";
import { usePathname } from "next/navigation";

const HIDE_SIDEBAR_ROUTES = [
  "/create-bot",
  "/training-data",
  "/bot-personality",
  "/bot-preview",
  "/integration",
  "/test-chatbot",
  "/demo-website",
];

function AppShellInner({ children, hideSidebar }: { children: React.ReactNode; hideSidebar: boolean }) {
  const { mobileSidebarOpen } = useAppShell();
  const sidebarVisible = !hideSidebar;

  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-56px)]">
        {sidebarVisible && <Sidebar />}
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
