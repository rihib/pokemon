import { finishGoogleOAuth } from "../../../lib/auth";

export async function GET(request: Request) {
  try {
    const { returnTo } = await finishGoogleOAuth(request);
    return Response.redirect(new URL(returnTo, request.url).toString(), 302);
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return Response.redirect(new URL("/?auth_error=google", request.url).toString(), 302);
  }
}
