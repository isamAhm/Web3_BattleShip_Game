import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthProvider } from "@/lib/AuthContext";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Web3 Battle Arena · Tactical Naval Warfare",
  description:
    "Real-time, verifiable Battleship on Base Sepolia. Build your fleet, outthink your opponent, and prove your victories on-chain.",
  openGraph: {
    title: "Web3 Battle Arena",
    description: "Tactical Naval Warfare on Base Sepolia",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <Header />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
