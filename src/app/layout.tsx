import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/BottomNav";
import { RealtimeSync } from "@/components/RealtimeSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panel Financiero",
  description: "Asistente financiero personal",
};

import { PageTransition } from '@/components/PageTransition'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <div className="flex-1 flex flex-col relative min-h-screen">
            <RealtimeSync />
            <PageTransition>
              {children}
            </PageTransition>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
