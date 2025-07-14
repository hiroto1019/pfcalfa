import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PFC-ALFA PFCバランス管理アプリ",
  description: "PFCバランス管理アプリ",
  openGraph: {
    title: "PFC-ALFA PFCバランス管理アプリ",
    description: "PFCバランス管理アプリ",
    url: "https://pfcalfa.com", // あとで実際のドメインに変更してください
    siteName: "PFC-ALFA",
    images: [
      {
        url: "/ogp-image.png",
        width: 1200,
        height: 630,
        alt: "PFC-ALFA OGP Image",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PFC-ALFA PFCバランス管理アプリ",
    description: "PFCバランス管理アプリ",
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
