import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lost Cities",
  description: "ロストシティ ボードゲーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
