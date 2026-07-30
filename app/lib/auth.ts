import { cookies } from "next/headers";

const SESSION_COOKIE = "champions_session";
const OAUTH_STATE_COOKIE = "champions_oauth_state";
const OAUTH_VERIFIER_COOKIE = "champions_oauth_verifier";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type GoogleIdentity = {
  provider: "google";
  providerUserId: string;
  email: string;
  displayName: string;
};

type SessionPayload = GoogleIdentity & { exp: number };

type AuthEnv = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  APP_ORIGIN?: string;
};

async function authEnv(): Promise<AuthEnv> {
  const { env } = await import("cloudflare:workers");
  const values = env as unknown as Partial<AuthEnv>;
  for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET"] as const) {
    if (!values[key]) throw new Error(`Missing required Worker secret: ${key}`);
  }
  return values as AuthEnv;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeJson(value: unknown) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
  } catch {
    return null;
  }
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function secureEquals(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function createSession(identity: GoogleIdentity) {
  const env = await authEnv();
  const payload = encodeJson({ ...identity, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE });
  return `${payload}.${await hmac(payload, env.SESSION_SECRET)}`;
}

export async function getSessionIdentity(): Promise<GoogleIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const env = await authEnv();
  if (!await secureEquals(signature, await hmac(payload, env.SESSION_SECRET))) return null;
  const session = decodeJson<SessionPayload>(payload);
  if (!session || session.exp <= Math.floor(Date.now() / 1000) || session.provider !== "google" || !session.providerUserId || !session.email) return null;
  return {
    provider: "google",
    providerUserId: session.providerUserId,
    email: session.email,
    displayName: session.displayName || session.email,
  };
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function codeChallenge(verifier: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export async function beginGoogleOAuth(request: Request, returnTo = "/app") {
  const env = await authEnv();
  const origin = env.APP_ORIGIN || new URL(request.url).origin;
  const state = randomToken();
  const verifier = randomToken(48);
  const cookieStore = await cookies();
  const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  cookieStore.set(OAUTH_STATE_COOKIE, encodeJson({ state, returnTo: safeReturnTo(returnTo) }), cookieOptions);
  cookieStore.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOptions);
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authorization.searchParams.set("redirect_uri", `${origin}/auth/google/callback`);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email profile");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("code_challenge", await codeChallenge(verifier));
  authorization.searchParams.set("code_challenge_method", "S256");
  authorization.searchParams.set("prompt", "select_account");
  return Response.redirect(authorization.toString(), 302);
}

export async function finishGoogleOAuth(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stateCookie = decodeJson<{ state: string; returnTo: string }>(cookieStore.get(OAUTH_STATE_COOKIE)?.value ?? "");
  const verifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_VERIFIER_COOKIE);
  if (!code || !returnedState || !stateCookie || returnedState !== stateCookie.state || !verifier) throw new Error("Invalid OAuth callback state");

  const env = await authEnv();
  const origin = env.APP_ORIGIN || url.origin;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin}/auth/google/callback`,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenResponse.ok) throw new Error(`Google token exchange failed: ${tokenResponse.status}`);
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error("Google access token is missing");
  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token.access_token}` } });
  if (!userResponse.ok) throw new Error(`Google user info failed: ${userResponse.status}`);
  const user = await userResponse.json() as { sub?: string; email?: string; name?: string; email_verified?: boolean };
  if (!user.sub || !user.email || user.email_verified === false) throw new Error("Google account does not provide a verified email");
  const identity: GoogleIdentity = { provider: "google", providerUserId: user.sub, email: user.email.trim().toLowerCase(), displayName: user.name?.trim() || user.email };
  await setSessionCookie(await createSession(identity));
  return { identity, returnTo: safeReturnTo(stateCookie.returnTo) };
}

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  try {
    const parsed = new URL(value, "https://app.local");
    if (parsed.origin !== "https://app.local" || parsed.pathname.startsWith("/auth/")) return "/app";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/app";
  }
}
