// 2. 既存のファイルを修正: src/app/layout.tsx
// 作成したAuthProviderでアプリケーション全体をラップします。

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider"; // 作成したAuthProviderをインポート

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pfcalfa.vercel.app';
const ogImageUrl = `${siteUrl}/ogp-image.png`;

export const metadata: Metadata = {
  title: "PFCα - PFCバランス管理アプリ",
  description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "PFCα - PFCバランス管理アプリ",
    description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
    images: [ogImageUrl],
    type: 'website',
    url: '/',
    siteName: 'PFCα',
  },
  twitter: {
    card: 'summary_large_image',
    title: "PFCα - PFCバランス管理アプリ",
    description: "PFC（タンパク質・脂質・炭水化物）のバランスを管理し、健康的な食事をサポートするアプリ",
    images: [ogImageUrl],
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
        {/* 作成したAuthProviderでchildrenをラップ */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
