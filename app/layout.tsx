import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Instrument Serif, self-hosted from the font files bundled in the landing design prototype.
const instrumentSerif = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plainbot | AI Customer Support for E-commerce",
  description:
    "Your Shopify store is losing sales to unanswered questions. Plainbot fixes that in 10 minutes. AI chatbot trained on your store — support, cart recovery, tickets, 24/7.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

/** Mobile-first: correct scaling, notch/home-indicator safe areas, pinch-zoom allowed for accessibility */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable} ${manrope.variable}`}>
      <body className="min-h-[100dvh] antialiased bg-black text-slate-100 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
