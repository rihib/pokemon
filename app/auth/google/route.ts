import { beginGoogleOAuth, safeReturnTo } from "../../lib/auth";

export async function GET(request: Request) {
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("return_to"));
  return beginGoogleOAuth(request, returnTo);
}
