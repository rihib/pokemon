import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { authIdentities, masterData, ownedItems, roster, users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { demoMaster } from "../../lib/demo-data";

const ADMIN_USER_ID = 1;

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function handleFrom(email: string, displayName: string) {
  const candidate = displayName.trim().toLowerCase() === "rihib"
    ? "rihib"
    : email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return candidate || `trainer-${Math.random().toString(36).slice(2, 8)}`;
}

function roleForUserId(userId: number): "admin" | "user" {
  return userId === ADMIN_USER_ID ? "admin" : "user";
}

function publicProfile<T extends typeof users.$inferSelect>(profile: T) {
  return { ...profile, role: roleForUserId(profile.id) };
}

async function requireIdentity() {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const db = await getDb();
  const providerEmail = identity.email.trim().toLowerCase();
  const linked = await db
    .select({ profile: users })
    .from(authIdentities)
    .innerJoin(users, eq(authIdentities.userId, users.id))
    .where(and(eq(authIdentities.provider, "chatgpt"), eq(authIdentities.providerEmail, providerEmail)))
    .limit(1);
  if (linked[0]) {
    return { identity, profile: publicProfile(linked[0].profile) };
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
  await db.insert(authIdentities).values({ provider: "chatgpt", providerEmail, userId: profile.id });
  return { identity, profile: publicProfile(profile) };
}

async function seedMasterIfEmpty() {
  const db = await getDb();
  const first = await db.select({ id: masterData.id }).from(masterData).limit(1);
  if (first.length) return;
  await db.insert(masterData).values(demoMaster.map((entry) => ({
    category: entry.category,
    name: entry.name,
    type: entry.type,
    description: entry.description,
    data: JSON.stringify(entry.data ?? {}),
  }))).onConflictDoNothing();
}

export async function GET() {
  try {
    const auth = await requireIdentity();
    if (!auth) return Response.json({ error: "ログインが必要である" }, { status: 401 });
    await seedMasterIfEmpty();
    const db = await getDb();
    const [rosterRows, itemRows, masterRows] = await Promise.all([
      db.select().from(roster).where(eq(roster.ownerId, auth.profile.id)).orderBy(asc(roster.id)),
      db.select().from(ownedItems).where(eq(ownedItems.ownerId, auth.profile.id)).orderBy(asc(ownedItems.id)),
      db.select().from(masterData).orderBy(asc(masterData.category), asc(masterData.name)),
    ]);
    return Response.json({
      user: auth.profile,
      roster: rosterRows.map((row) => ({
        ...row,
        moves: safeJson<string[]>(row.moves, []),
        stats: safeJson(row.stats, { hp: 80, attack: 80, defense: 80, spAttack: 80, spDefense: 80, speed: 80 }),
      })),
      items: itemRows,
      master: masterRows.map((row) => ({ ...row, data: safeJson(row.data, {}) })),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "データを読み込めなかった" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireIdentity();
    if (!auth) return Response.json({ error: "ログインが必要である" }, { status: 401 });
    const db = await getDb();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const payload = (body.payload ?? {}) as Record<string, unknown>;

    if (action === "save-roster") {
      const values = {
        ownerId: auth.profile.id,
        species: String(payload.species ?? "").trim(),
        nickname: String(payload.nickname ?? "").trim(),
        level: Math.max(1, Math.min(100, Number(payload.level) || 50)),
        types: String(payload.types ?? "").trim(),
        teraType: String(payload.teraType ?? "").trim(),
        ability: String(payload.ability ?? "").trim(),
        heldItem: String(payload.heldItem ?? "").trim(),
        nature: String(payload.nature ?? "").trim(),
        role: String(payload.role ?? "万能").trim(),
        moves: JSON.stringify(Array.isArray(payload.moves) ? payload.moves.map(String).slice(0, 4) : []),
        stats: JSON.stringify(payload.stats ?? {}),
        notes: String(payload.notes ?? "").trim(),
        updatedAt: new Date().toISOString(),
      };
      if (!values.species) return Response.json({ error: "ポケモン名は必須である" }, { status: 400 });
      const id = Number(payload.id);
      const [saved] = id
        ? await db.update(roster).set(values).where(and(eq(roster.id, id), eq(roster.ownerId, auth.profile.id))).returning()
        : await db.insert(roster).values(values).returning();
      return Response.json({ saved });
    }

    if (action === "delete-roster") {
      await db.delete(roster).where(and(eq(roster.id, Number(payload.id)), eq(roster.ownerId, auth.profile.id)));
      return Response.json({ ok: true });
    }

    if (action === "save-item") {
      const values = {
        ownerId: auth.profile.id,
        name: String(payload.name ?? "").trim(),
        quantity: Math.max(0, Number(payload.quantity) || 0),
        notes: String(payload.notes ?? "").trim(),
        updatedAt: new Date().toISOString(),
      };
      if (!values.name) return Response.json({ error: "持ち物名は必須である" }, { status: 400 });
      const id = Number(payload.id);
      const [saved] = id
        ? await db.update(ownedItems).set(values).where(and(eq(ownedItems.id, id), eq(ownedItems.ownerId, auth.profile.id))).returning()
        : await db.insert(ownedItems).values(values).returning();
      return Response.json({ saved });
    }

    if (action === "delete-item") {
      await db.delete(ownedItems).where(and(eq(ownedItems.id, Number(payload.id)), eq(ownedItems.ownerId, auth.profile.id)));
      return Response.json({ ok: true });
    }

    if (action === "save-profile") {
      const displayName = String(payload.displayName ?? auth.profile.displayName).trim();
      const handle = String(payload.handle ?? auth.profile.handle).trim().replace(/^@/, "").toLowerCase();
      const email = String(payload.email ?? auth.profile.email).trim().toLowerCase();
      if (!displayName || displayName.length > 40) {
        return Response.json({ error: "表示名は1〜40文字で入力する必要がある" }, { status: 400 });
      }
      if (!/^[a-z0-9_-]{3,24}$/.test(handle)) {
        return Response.json({ error: "ユーザー名は英小文字・数字・_・-を使い、3〜24文字で入力する必要がある" }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return Response.json({ error: "有効なメールアドレスを入力する必要がある" }, { status: 400 });
      }
      const [emailOwner, handleOwner] = await Promise.all([
        db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1),
        db.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1),
      ]);
      if (emailOwner[0] && emailOwner[0].id !== auth.profile.id) {
        return Response.json({ error: "このメールアドレスは既に使用されている" }, { status: 409 });
      }
      if (handleOwner[0] && handleOwner[0].id !== auth.profile.id) {
        return Response.json({ error: "このユーザー名は既に使用されている" }, { status: 409 });
      }
      const preferredFormat = ["single", "double"].includes(String(payload.preferredFormat))
        ? String(payload.preferredFormat) as "single" | "double" : auth.profile.preferredFormat;
      const preferredStyle = ["balance", "attack", "control", "endurance"].includes(String(payload.preferredStyle))
        ? String(payload.preferredStyle) : auth.profile.preferredStyle;
      const [saved] = await db.update(users).set({
        displayName,
        handle,
        email,
        preferredFormat,
        preferredStyle,
      }).where(eq(users.id, auth.profile.id)).returning();
      return Response.json({ saved: publicProfile(saved) });
    }

    if (action === "delete-account") {
      await db.delete(users).where(eq(users.id, auth.profile.id));
      return Response.json({ ok: true, signOut: "/signout-with-chatgpt?return_to=%2F" });
    }

    if (action === "save-master" || action === "delete-master") {
      if (auth.profile.role !== "admin") return Response.json({ error: "管理者権限が必要である" }, { status: 403 });
      if (action === "delete-master") {
        await db.delete(masterData).where(eq(masterData.id, Number(payload.id)));
        return Response.json({ ok: true });
      }
      const category = String(payload.category);
      if (!["pokemon", "item", "ability", "move", "nature"].includes(category)) {
        return Response.json({ error: "カテゴリが不正である" }, { status: 400 });
      }
      const values = {
        category: category as "pokemon" | "item" | "ability" | "move" | "nature",
        name: String(payload.name ?? "").trim(),
        type: String(payload.type ?? "").trim(),
        description: String(payload.description ?? "").trim(),
        data: JSON.stringify(payload.data ?? {}),
        updatedAt: new Date().toISOString(),
      };
      if (!values.name) return Response.json({ error: "名前は必須である" }, { status: 400 });
      const id = Number(payload.id);
      const [saved] = id
        ? await db.update(masterData).set(values).where(eq(masterData.id, id)).returning()
        : await db.insert(masterData).values(values).returning();
      return Response.json({ saved });
    }

    return Response.json({ error: "未対応の操作である" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "操作に失敗した" }, { status: 500 });
  }
}
