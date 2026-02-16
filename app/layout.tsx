import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elemental Paths",
  description: "精霊の道 — 5つの属性を極める旅",
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
