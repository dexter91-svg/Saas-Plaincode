import Link from "next/link";

/** Bare "Plainbot" wordmark used at the top of every bot-setup wizard step (Connect Store -> Install Widget). */
export default function WizardHeader() {
  return (
    <header className="px-[6vw] py-[18px]">
      <Link href="/" className="font-display text-2xl italic text-ink no-underline hover:text-ink">
        Plainbot
      </Link>
    </header>
  );
}
