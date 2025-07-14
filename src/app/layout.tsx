import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PFCα - PFCバランス管理アプリ",
  description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
  openGraph: {
    title: "PFCα - PFCバランス管理アプリ",
    description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
    images: ["/ogp-image.png"],
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: "PFCα - PFCバランス管理アプリ",
    description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
    images: ["/ogp-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PFCα',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
