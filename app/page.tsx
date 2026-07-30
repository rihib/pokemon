import { getSessionIdentity } from "./lib/auth";
import HomeLab from "./home-lab";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionIdentity();

  return (
    <HomeLab
      user={user ? { displayName: user.displayName, email: user.email } : null}
      signInPath="/auth/google?return_to=%2Fapp"
    />
  );
}
