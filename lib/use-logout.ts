"use client";

import { useRouter } from "next/navigation";
import { clearBotStorage } from "@/lib/bot-local-storage";

/** Logs the user out (clears server session + local bot state) and sends them to /login. */
export function useLogout() {
  const router = useRouter();
  return async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      document.cookie = "mock-auth=; path=/; max-age=0";
      window.localStorage.removeItem("mock-auth");
      clearBotStorage();
    } catch {
      // ignore
    }
    router.push("/login");
  };
}
