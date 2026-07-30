import { redirect } from "next/navigation";
import { getSessionIdentity } from "../lib/auth";
import Workspace from "../components/workspace";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await getSessionIdentity();
  if (!user) redirect("/auth/google?return_to=%2Fapp");
  return <Workspace mode="live" identity={{ displayName: user.displayName, email: user.email }} />;
}
