import Link from "next/link";
import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "../chatgpt-auth";
import { requireAppIdentity } from "../lib/server-identity";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await requireAppIdentity();
  if (!auth) redirect(chatGPTSignInPath("/admin"));
  if (auth.profile.role !== "admin") redirect("/app");

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">CL</span>
          <span>CHAMPIONS LAB</span>
        </Link>
        <div>
          <span className="admin-status">管理者</span>
          <strong>{auth.profile.displayName}</strong>
          <small>@{auth.profile.handle}</small>
          <Link className="admin-back-link" href="/app">アプリに戻る →</Link>
        </div>
      </header>
      {children}
    </main>
  );
}
