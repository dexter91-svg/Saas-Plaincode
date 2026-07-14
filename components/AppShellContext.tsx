"use client";

import { createContext, useContext, useState, useCallback } from "react";

type AppShellContextType = {
  sidebarVisible: boolean;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
};

const AppShellContext = createContext<AppShellContextType | null>(null);

export function AppShellProvider({
  children,
  sidebarVisible,
}: {
  children: React.ReactNode;
  sidebarVisible: boolean;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const value: AppShellContextType = {
    sidebarVisible,
    mobileSidebarOpen,
    setMobileSidebarOpen: useCallback((open: boolean) => setMobileSidebarOpen(open), []),
  };
  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  return ctx ?? { sidebarVisible: false, mobileSidebarOpen: false, setMobileSidebarOpen: () => {} };
}
