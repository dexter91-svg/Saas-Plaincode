import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const year = new Date().getFullYear();
  const linkClass = "text-sm text-slate-400 transition-colors hover:text-primary-400";
  return (
    <footer className="border-t border-slate-800 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3 md:items-start">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-slate-100 no-underline">
              <Logo size="sm" />
              <span className="text-lg font-semibold">Plainbot</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-400">
              AI customer support for ecommerce stores.
            </p>
          </div>
          <nav
            className="flex flex-col flex-wrap gap-3 sm:flex-row sm:justify-center md:justify-center md:gap-x-6"
            aria-label="Footer"
          >
            <Link href="/#features" className={linkClass}>
              Features
            </Link>
            <Link href="/#pricing" className={linkClass}>
              Pricing
            </Link>
            <Link href="/demo-website" className={linkClass}>
              Demo
            </Link>
            <Link href="/#faq" className={linkClass}>
              FAQ
            </Link>
            <Link href="/contact" className={linkClass}>
              Contact
            </Link>
          </nav>
          <div className="md:text-right">
            <p className="text-sm text-slate-400">
              © {year} Plainbot. All rights reserved.
            </p>
            <p className="mt-4 text-xs text-slate-500">Secure &amp; GDPR compliant.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
