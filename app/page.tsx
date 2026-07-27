import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import HomeLab from "./home-lab";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <HomeLab
      user={
        user
          ? { displayName: user.displayName, email: user.email }
          : null
      }
      signInPath={chatGPTSignInPath("/app")}
    />
  );
}
