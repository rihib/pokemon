import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { masterData, ownedItems, roster, users } from "../../../db/schema";
import { demoMaster } from "../../lib/demo-data";
import { publicProfile, requireAppIdentity } from "../../lib/server-identity";

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function seedBaselineMaster() {
  const db = await getDb();
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
    const auth = await requireAppIdentity();
    if (!auth) return Response.json({ error: "ログインが必要である" }, { status: 401 });
    await seedBaselineMaster();
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
    const auth = await requireAppIdentity();
    if (!auth) return Response.json({ error: "ログインが必要である" }, { status: 401 });
    const db = await getDb();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const payload = (body.payload ?? {}) as Record<string, unknown>;

    if (action === "save-roster") {
      const availableMaster = await db.select({
        category: masterData.category,
        name: masterData.name,
        type: masterData.type,
      }).from(masterData);
      const species = String(payload.species ?? "").trim();
      const speciesMaster = availableMaster.find((entry) => entry.category === "pokemon" && entry.name === species);
      const ability = String(payload.ability ?? "").trim();
      const heldItem = String(payload.heldItem ?? "").trim();
      const nature = String(payload.nature ?? "").trim();
      const moves = Array.isArray(payload.moves) ? payload.moves.map(String).map((move) => move.trim()).filter(Boolean).slice(0, 4) : [];
      const existsInMaster = (category: "item" | "ability" | "move" | "nature", name: string) =>
        !name || availableMaster.some((entry) => entry.category === category && entry.name === name);
      if (!speciesMaster) return Response.json({ error: "マスターデータに登録されたポケモンを選択する必要がある" }, { status: 400 });
      if (!existsInMaster("ability", ability)) return Response.json({ error: "マスターデータに登録された特性を選択する必要がある" }, { status: 400 });
      if (!existsInMaster("item", heldItem)) return Response.json({ error: "マスターデータに登録された持ち物を選択する必要がある" }, { status: 400 });
      if (!existsInMaster("nature", nature)) return Response.json({ error: "マスターデータに登録された性格を選択する必要がある" }, { status: 400 });
      if (moves.some((move) => !existsInMaster("move", move))) return Response.json({ error: "マスターデータに登録された技を選択する必要がある" }, { status: 400 });
      if (new Set(moves).size !== moves.length) return Response.json({ error: "同じ技を複数選択することはできない" }, { status: 400 });
      const values = {
        ownerId: auth.profile.id,
        species,
        nickname: String(payload.nickname ?? "").trim(),
        types: speciesMaster.type,
        ability,
        heldItem,
        nature,
        megaEvolution: Boolean(payload.megaEvolution),
        moves: JSON.stringify(moves),
        stats: JSON.stringify(payload.stats ?? {}),
        notes: String(payload.notes ?? "").trim(),
        updatedAt: new Date().toISOString(),
      };
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
      const name = String(payload.name ?? "").trim();
      const registered = await db.select({ id: masterData.id }).from(masterData)
        .where(and(eq(masterData.category, "item"), eq(masterData.name, name))).limit(1);
      if (!registered[0]) return Response.json({ error: "マスターデータに登録された持ち物を選択する必要がある" }, { status: 400 });
      const values = {
        ownerId: auth.profile.id,
        name,
        quantity: Math.max(0, Number(payload.quantity) || 0),
        notes: String(payload.notes ?? "").trim(),
        updatedAt: new Date().toISOString(),
      };
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

    if (action === "check-handle") {
      const handle = String(payload.handle ?? "").trim().replace(/^@/, "").toLowerCase();
      if (!/^[a-z0-9_-]{3,24}$/.test(handle)) {
        return Response.json({ available: false, reason: "format" });
      }
      const owner = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1);
      return Response.json({ available: !owner[0] || owner[0].id === auth.profile.id });
    }

    if (action === "save-profile") {
      const displayName = String(payload.displayName ?? auth.profile.displayName).trim();
      const handle = String(payload.handle ?? auth.profile.handle).trim().replace(/^@/, "").toLowerCase();
      if (!displayName || displayName.length > 40) {
        return Response.json({ error: "表示名は1〜40文字で入力する必要がある" }, { status: 400 });
      }
      if (!/^[a-z0-9_-]{3,24}$/.test(handle)) {
        return Response.json({ error: "ユーザー名は英小文字・数字・_・-を使い、3〜24文字で入力する必要がある" }, { status: 400 });
      }
      const handleOwner = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1);
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
