import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "../chatgpt-auth";
import AdminWorkspace from "../components/admin-workspace";
import { requireAppIdentity } from "../lib/server-identity";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireAppIdentity();
  if (!auth) redirect(chatGPTSignInPath("/admin"));
  if (auth.profile.role !== "admin") redirect("/app");

  return (
    <AdminWorkspace
      identity={{
        displayName: auth.profile.displayName,
        handle: auth.profile.handle,
      }}
    />
  );
}
