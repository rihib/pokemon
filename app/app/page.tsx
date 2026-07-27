import { requireChatGPTUser } from "../chatgpt-auth";
import Workspace from "../components/workspace";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireChatGPTUser("/app");
  return <Workspace mode="live" identity={{ displayName: user.displayName, email: user.email }} />;
}
