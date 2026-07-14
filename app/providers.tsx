"use client";

import { ReactNode } from "react";
import { BotProvider } from "@/components/BotContext";

export function Providers({ children }: { children: ReactNode }) {
  return <BotProvider>{children}</BotProvider>;
}

