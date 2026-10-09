"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAppShell } from "./AppShellContext";
import StoreSwitcher from "./StoreSwitcher";
import { useLogout } from "@/lib/use-logout";

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
  "/logs",
];

const NAV_LINK =
  "relative inline-block font-manrope text-sm font-semibold text-ink transition-colors duration-200 hover:text-terracotta after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-terracotta after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none";

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
  const logout = useLogout();
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
    await logout();
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navLinks = !isAppArea ? (
    <>
      <Link href="/pricing" onClick={closeMobileMenu} className={NAV_LINK}>
        Pricing
      </Link>
      <Link href="/multi-agent" onClick={closeMobileMenu} className={NAV_LINK}>
        Multi-Agent
      </Link>
    </>
  ) : null;

  const rightSection = isAppArea ? (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-ink/[.15] bg-white px-4 py-1.5 font-manrope text-sm font-semibold text-ink transition-colors hover:bg-ink/[.05]"
    >
      Logout
    </button>
  ) : (
    <>
      <Link href="/login" onClick={closeMobileMenu} className={NAV_LINK}>
        Log in
      </Link>
      <Link
        href="/signup?plan=free"
        onClick={closeMobileMenu}
        className="whitespace-normal rounded-full bg-terracotta px-5 py-[9px] text-center font-manrope text-xs font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:text-cream hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97] motion-reduce:transition-none sm:text-sm"
      >
        Start free, no card needed
      </Link>
    </>
  );

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-ink/[.08] backdrop-blur transition-transform duration-300 ${
          isAppArea ? "bg-white/95" : "bg-cream/95"
        } ${visible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2 md:px-6 lg:px-8">
          {/* Logo + title - truncate on small screens */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 shrink items-center gap-2.5 font-display text-xl italic text-ink no-underline hover:text-ink sm:text-2xl group"
          >
            <Image
              src="/logo.svg"
              alt="Plainbot logo"
              width={26}
              height={26}
              className="object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
              priority
            />
            <span className="truncate">Plainbot</span>
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
                className="rounded-lg p-2 text-warm-muted transition-colors hover:bg-ink/[.05] hover:text-ink"
                aria-label="Open menu"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 text-warm-muted transition-colors hover:bg-ink/[.05] hover:text-ink"
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
            className="fixed inset-0 top-[53px] z-40 bg-cream/95 backdrop-blur sm:hidden"
            aria-hidden={!mobileMenuOpen}
          >
            <div className="flex flex-col gap-1 border-t border-ink/[.08] bg-cream px-4 py-4">
              {navLinks && (
                <div className="flex flex-col gap-1 border-b border-ink/[.08] pb-4">
                  <Link
                    href="/pricing"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 font-manrope text-base font-medium text-ink transition-colors hover:bg-ink/[.05]"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/multi-agent"
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-2.5 font-manrope text-base font-medium text-ink transition-colors hover:bg-ink/[.05]"
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
                    className="rounded-lg border border-ink/[.15] bg-white px-3 py-2.5 text-left font-manrope text-sm font-semibold text-ink transition-colors hover:bg-ink/[.05]"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeMobileMenu}
                      className="rounded-lg px-3 py-2.5 text-center font-manrope text-sm font-semibold text-ink transition-colors hover:bg-ink/[.05]"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/signup?plan=free"
                      onClick={closeMobileMenu}
                      className="rounded-full bg-terracotta px-3 py-2.5 text-center font-manrope text-sm font-bold text-cream transition-colors hover:bg-terracotta-dark"
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
