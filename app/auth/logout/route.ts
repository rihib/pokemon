import { clearSessionCookie } from "../../lib/auth";

export async function GET(request: Request) {
  await clearSessionCookie();
  return Response.redirect(new URL("/", request.url).toString(), 302);
}
