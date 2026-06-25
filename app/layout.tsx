import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});

const SITE_URL = "https://carli.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CARLI — Crypto OSINT Intelligence Agent",
  description:
    "CARLI reads X accounts, wallets, and pump.fun projects the way an analyst would. On-chain plus social intelligence, synthesized by Claude. Run your DYOR in seconds.",
  keywords: [
    "crypto OSINT",
    "wallet intelligence",
    "pump.fun rug pull detector",
    "X account analysis",
    "Claude AI",
    "memecoin research",
  ],
  authors: [{ name: "CARLI" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "CARLI — Crypto OSINT Intelligence Agent",
    description:
      "On-chain plus social intelligence, synthesized by Claude. Run your DYOR in seconds.",
    siteName: "CARLI",
    images: [{ url: "/logo.png", width: 1254, height: 1254 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CARLI — Crypto OSINT Intelligence Agent",
    description:
      "On-chain plus social intelligence, synthesized by Claude. Run your DYOR in seconds.",
    creator: "@CARLI",
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: "#ECEBE6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="paper antialiased">{children}</body>
    </html>
  );
}
