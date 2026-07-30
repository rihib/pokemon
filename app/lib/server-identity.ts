import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { authIdentities, users } from "../../db/schema";
import { getSessionIdentity } from "./auth";

const ADMIN_USER_ID = 1;

function handleFrom(email: string, displayName: string) {
  const candidate = displayName.trim().toLowerCase() === "rihib"
    ? "rihib"
    : email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return candidate || `trainer-${Math.random().toString(36).slice(2, 8)}`;
}

function roleForUserId(userId: number): "admin" | "user" {
  return userId === ADMIN_USER_ID ? "admin" : "user";
}

export function publicProfile<T extends typeof users.$inferSelect>(profile: T) {
  return { ...profile, role: roleForUserId(profile.id) };
}

export async function requireAppIdentity() {
  const identity = await getSessionIdentity();
  if (!identity) return null;

  const db = await getDb();
  const providerEmail = identity.email.trim().toLowerCase();
  const linked = await db
    .select({ profile: users })
    .from(authIdentities)
    .innerJoin(users, eq(authIdentities.userId, users.id))
    .where(and(
      eq(authIdentities.provider, "google"),
      eq(authIdentities.providerUserId, identity.providerUserId),
    ))
    .limit(1);

  if (linked[0]) {
    if (linked[0].profile.email !== providerEmail) {
      await db.update(users).set({ email: providerEmail }).where(eq(users.id, linked[0].profile.id));
      linked[0].profile.email = providerEmail;
    }
    return { identity, profile: publicProfile(linked[0].profile) };
  }

  const legacyByEmail = await db
    .select({ identityId: authIdentities.id, profile: users })
    .from(authIdentities)
    .innerJoin(users, eq(authIdentities.userId, users.id))
    .where(eq(authIdentities.providerEmail, providerEmail))
    .limit(1);
  if (legacyByEmail[0]) {
    await db.update(authIdentities).set({ provider: "google", providerUserId: identity.providerUserId, providerEmail }).where(eq(authIdentities.id, legacyByEmail[0].identityId));
    return { identity, profile: publicProfile(legacyByEmail[0].profile) };
  }

  const baseHandle = handleFrom(providerEmail, identity.displayName);
  let handle = baseHandle;
  const collision = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1);
  if (collision[0]) handle = `${baseHandle}-${Math.random().toString(36).slice(2, 6)}`;

  const [profile] = await db.insert(users).values({
    email: providerEmail,
    displayName: identity.displayName,
    handle,
  }).returning();
  await db.insert(authIdentities).values({
    provider: "google",
    providerUserId: identity.providerUserId,
    providerEmail,
    userId: profile.id,
  });

  return { identity, profile: publicProfile(profile) };
}
