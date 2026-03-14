import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Astro Crash - Next-Gen TON Game",
  description: "The ultimate crash game on Telegram",
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
      <body className={`${inter.className} bg-background text-foreground select-none`}>
        <Providers>
          <div className="min-h-screen max-w-md mx-auto flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
