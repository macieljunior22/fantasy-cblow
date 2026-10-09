import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { SiteHeader, SiteHeaderFallback } from "@/components/layout/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CBLOW Fantasy",
  description:
    "Fantasy Game do campeonato CBLOW (YoDa & Bronziocre): monte seu time, ganhe cartoletas e pontue com a performance real dos jogadores.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* A sessão lê cookies(): fica atrás de Suspense (Cache Components). */}
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          CBLOW Fantasy — projeto community não-oficial do torneio CBLOW (YoDa × Bronziocre).
        </footer>
      </body>
    </html>
  );
}
