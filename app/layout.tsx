import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MintClaw - Stripe for AI Agents",
  description: "The payment infrastructure for AI agents. Instant payments, escrow, and streaming - all in USDC on Base.",
  keywords: ["AI Agents", "Payments", "Escrow", "Streaming", "USDC", "Base", "Web3", "Agent Commerce"],
  openGraph: {
    title: "MintClaw - Stripe for AI Agents",
    description: "The payment infrastructure for AI agents. Instant payments, escrow, and streaming - all in USDC on Base.",
    url: "https://mintclaw.xyz",
    siteName: "MintClaw",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MintClaw - Stripe for AI Agents",
    description: "The payment infrastructure for AI agents. Instant payments, escrow, and streaming - all in USDC on Base.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
