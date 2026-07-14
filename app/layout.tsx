import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={inter.variable}>
      <body className="min-h-[100dvh] antialiased bg-black text-slate-100 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
