import Link from "next/link";
import Image from "next/image";

/** "Plainbot" logo + wordmark used at the top of every bot-setup wizard step (Connect Store -> Install Widget). */
export default function WizardHeader() {
  return (
    <header className="px-[6vw] py-[18px]">
      <Link href="/" className="flex items-center gap-2.5 font-display text-2xl italic text-ink no-underline hover:text-ink group">
        <Image
          src="/logo.svg"
          alt="Plainbot logo"
          width={28}
          height={28}
          className="object-contain transition-transform duration-200 group-hover:scale-105"
          priority
        />
        <span>Plainbot</span>
      </Link>
    </header>
  );
}
