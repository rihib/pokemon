import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { masterData, ownedItems, roster, users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { demoMaster } from "../../lib/demo-data";

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function handleFrom(email: string, displayName: string) {
  const candidate = displayName.trim().toLowerCase() === "rihib"
    ? "rihib"
    : email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return candidate || `trainer-${Math.random().toString(36).slice(2, 8)}`;
}

function isRihib(email: string, displayName: string) {
  return email.split("@")[0].toLowerCase() === "rihib" || displayName.trim().toLowerCase() === "rihib";
}

async function requireIdentity() {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const db = await getDb();
  const existing = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
  if (existing[0]) return { identity, profile: existing[0] };

  const role = isRihib(identity.email, identity.displayName) ? "admin" as const : "user" as const;
  const baseHandle = handleFrom(identity.email, identity.displayName);
  let handle = baseHandle;
  const collision = await db.select({ email: users.email }).from(users).where(eq(users.handle, handle)).limit(1);
  if (collision[0]) handle = `${baseHandle}-${Math.random().toString(36).slice(2, 6)}`;
  const [profile] = await db.insert(users).values({
    email: identity.email,
    displayName: identity.displayName,
    handle,
    role,
  }).returning();
  return { identity, profile };
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
      db.select().from(roster).where(eq(roster.ownerEmail, auth.identity.email)).orderBy(asc(roster.id)),
      db.select().from(ownedItems).where(eq(ownedItems.ownerEmail, auth.identity.email)).orderBy(asc(ownedItems.id)),
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
        ownerEmail: auth.identity.email,
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
        ? await db.update(roster).set(values).where(and(eq(roster.id, id), eq(roster.ownerEmail, auth.identity.email))).returning()
        : await db.insert(roster).values(values).returning();
      return Response.json({ saved });
    }

    if (action === "delete-roster") {
      await db.delete(roster).where(and(eq(roster.id, Number(payload.id)), eq(roster.ownerEmail, auth.identity.email)));
      return Response.json({ ok: true });
    }

    if (action === "save-item") {
      const values = {
        ownerEmail: auth.identity.email,
        name: String(payload.name ?? "").trim(),
        quantity: Math.max(0, Number(payload.quantity) || 0),
        notes: String(payload.notes ?? "").trim(),
        updatedAt: new Date().toISOString(),
      };
      if (!values.name) return Response.json({ error: "持ち物名は必須である" }, { status: 400 });
      const id = Number(payload.id);
      const [saved] = id
        ? await db.update(ownedItems).set(values).where(and(eq(ownedItems.id, id), eq(ownedItems.ownerEmail, auth.identity.email))).returning()
        : await db.insert(ownedItems).values(values).returning();
      return Response.json({ saved });
    }

    if (action === "delete-item") {
      await db.delete(ownedItems).where(and(eq(ownedItems.id, Number(payload.id)), eq(ownedItems.ownerEmail, auth.identity.email)));
      return Response.json({ ok: true });
    }

    if (action === "save-profile") {
      const preferredStyle = ["balance", "attack", "control", "endurance"].includes(String(payload.preferredStyle))
        ? String(payload.preferredStyle) : "balance";
      const [saved] = await db.update(users).set({
        displayName: String(payload.displayName ?? auth.profile.displayName).trim(),
        preferredStyle,
      }).where(eq(users.email, auth.identity.email)).returning();
      return Response.json({ saved });
    }

    if (action === "delete-account") {
      await db.delete(users).where(eq(users.email, auth.identity.email));
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
