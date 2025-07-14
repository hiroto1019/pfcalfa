import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "PFCα - PFCバランス管理アプリ",
  description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
  openGraph: {
    title: "PFCα - PFCバランス管理アプリ",
    description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
    images: ["/ogp-image.png"],
    type: 'website',
    url: '/',
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
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PFCα" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
