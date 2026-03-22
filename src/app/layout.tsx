import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AgeGate from "@/components/AgeGate";
import Script from "next/script";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Astro Hub — TON Gaming Platform",
  description: "Provably fair crash game on TON blockchain. 18+ only.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.className} bg-background text-foreground select-none`}>
        <Providers>
          <AgeGate>
            <div className="min-h-screen max-w-md mx-auto flex flex-col">
              {children}
            </div>
          </AgeGate>
        </Providers>
      </body>
    </html>
  );
}
