import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHAMPIONS LAB | ポケモンバトル構築支援",
  description: "初心者でも本格的なポケモンバトルを楽しめる、パーティー構築・選出支援サービス。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
