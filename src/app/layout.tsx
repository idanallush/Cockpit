import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// BinanceNova substitute
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// BinancePlex substitute — used for every number/price/volume
const jetMono = JetBrains_Mono({
  variable: "--font-jet-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cockpit — API Cost Dashboard",
  description: "Central dashboard for tracking API usage, costs, and health across providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas-dark text-[color:var(--body-on-dark)]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
