"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Button from "./Button";
import Logo from "./Logo";
import { useAppShell } from "./AppShellContext";
import StoreSwitcher from "./StoreSwitcher";
import { clearBotStorage } from "@/lib/bot-local-storage";

const APP_ROUTES = [
  "/dashboard",
  "/create-bot",
  "/bot-personality",
  "/bot-preview",
  "/test-chatbot",
  "/integration",
  "/demo-website",
  "/analytics",
  "/training-data",
  "/handoff-rules",
  "/conversations",
  "/forwarded-conversations",
  "/tickets",
  "/onboarding",
  "/settings",
  "/admin",
];

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { sidebarVisible, setMobileSidebarOpen } = useAppShell();

  const path = pathname ?? "";
  const isAppArea = APP_ROUTES.some((p) => path.startsWith(p));
  const showAppMenuButton = isAppArea && sidebarVisible;

  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY < 10) {
      setVisible(true);
    } else if (currentY > lastScrollY.current) {
      setVisible(false);
    } else {
      setVisible(true);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      document.cookie = "mock-auth=; path=/; max-age=0";
      window.localStorage.removeItem("mock-auth");
      clearBotStorage();
    } catch {
      // ignore
    }
    router.push("/login");
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navLinks = !isAppArea ? (
    <>
      <Link
        href="/pricing"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-slate-400 hover:text-slate-100"
      >
        Pricing
      </Link>
      <Link
        href="/multi-agent"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-slate-400 hover:text-slate-100"
      >
        Multi-Agent
      </Link>
    </>
  ) : null;

  const rightSection = isAppArea ? (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-md border border-slate-600 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100"
    >
      Logout
    </button>
  ) : (
    <>
      <Link
        href="/login"
        onClick={closeMobileMenu}
        className="text-sm font-medium text-slate-400 hover:text-slate-100"
      >
        Log in
      </Link>
      <Link href="/signup?plan=free" onClick={closeMobileMenu}>
        <Button variant="primary" className="whitespace-normal text-center text-xs sm:text-sm">
          Start free, no card needed
        </Button>
      </Link>
    </>
  );

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-slate-800 bg-black/95 backdrop-blur transition-transform duration-300 ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2 md:px-6 lg:px-8">
          {/* Logo + title - truncate on small screens */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 shrink items-center gap-2 text-slate-100 no-underline"
          >
            <Logo size="lg" />
            <span className="truncate text-sm font-semibold sm:text-base sm:whitespace-nowrap lg:text-lg">
              Plainbot
            </span>
          </Link>

          {isAppArea && (
            <div className="min-w-0 flex-1 px-2 sm:px-4">
              <StoreSwitcher />
            </div>
          )}

          {/* Desktop: center links */}
          {!isAppArea && (
            <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-6">
              {navLinks}
            </div>
          )}

          {/* Desktop: right section - flex wrap on narrow md to avoid overflow */}
          <div className="hidden shrink-0 items-center justify-end gap-2 sm:flex sm:gap-3 md:gap-4">
            {rightSection}
          </div>

          {/* Mobile: hamburger (landing menu or app sidebar) */}
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            {showAppMenuButton ? (
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Open menu"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <CloseIcon className="h-6 w-6" />
                ) : (
                  <MenuIcon className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </nav>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-[53px] z-40 bg-black/90 backdrop-blur sm:hidden"
            aria-hidden={!mobileMenuOpen}
          >
            <div className="flex flex-col gap-1 border-t border-slate-800 bg-black px-4 py-4">
              {navLinks && (
                <div className="flex flex-col gap-1 border-b border-slate-800 pb-4">
                  <Link
                    href="/pricing"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/multi-agent"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  >
                    Multi-Agent
                  </Link>
                </div>
              )}
              <div className="flex flex-col gap-1 pt-2">
                {isAppArea ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg border border-slate-600 bg-transparent px-3 py-2.5 text-left text-sm font-medium text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeMobileMenu}
                      className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/signup?plan=free"
                      onClick={closeMobileMenu}
                      className="rounded-lg bg-primary-500 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-600"
                    >
                      Start free, no card needed
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
