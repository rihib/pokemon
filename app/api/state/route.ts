import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { battleTeamMembers, battleTeams, masterData, masterRelations, ownedItems, roster, users } from "../../../db/schema";
import type { MasterCategory, MasterRelationKind } from "../../lib/types";
import { publicProfile, requireAppIdentity } from "../../lib/server-identity";

function safeJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function rosterForClient(row: typeof roster.$inferSelect) {
  return {
    ...row,
    moves: safeJson<string[]>(row.moves, []),
    stats: safeJson(row.stats, { hp: 80, attack: 80, defense: 80, spAttack: 80, spDefense: 80, speed: 80 }),
  };
}

export async function GET() {
  try {
    const auth = await requireAppIdentity();
    if (!auth) return Response.json({ error: "ログインが必要である" }, { status: 401 });
    const db = await getDb();
    const [rosterRows, itemRows, teamRows, masterRows, relationRows] = await Promise.all([
      db.select().from(roster).where(eq(roster.ownerId, auth.profile.id)).orderBy(asc(roster.id)),
      db.select().from(ownedItems).where(eq(ownedItems.ownerId, auth.profile.id)).orderBy(asc(ownedItems.id)),
      db.select().from(battleTeams).where(eq(battleTeams.ownerId, auth.profile.id)).orderBy(asc(battleTeams.id)),
      db.select().from(masterData).orderBy(asc(masterData.category), asc(masterData.name)),
      db.select().from(masterRelations).orderBy(asc(masterRelations.sourceId), asc(masterRelations.kind)),
    ]);
    const memberRows = teamRows.length
      ? await db.select().from(battleTeamMembers).where(inArray(battleTeamMembers.teamId, teamRows.map((team) => team.id))).orderBy(asc(battleTeamMembers.position))
      : [];
    const rosterById = new Map(rosterRows.map((entry) => [entry.id, rosterForClient(entry)]));
    return Response.json({
      user: auth.profile,
      roster: [...rosterById.values()],
      items: itemRows,
      battleTeams: teamRows.map((team) => ({
        ...team,
        members: memberRows.filter((member) => member.teamId === team.id).map((member) => rosterById.get(member.rosterId)).filter(Boolean),
      })),
      master: masterRows.map((row) => ({ ...row, data: safeJson(row.data, {}) })),
      masterRelations: relationRows.map((row) => ({ ...row, data: safeJson(row.data, {}) })),
    });
  } catch (error) {
    console.error("Failed to load application state", error);
    return Response.json({ error: "エラーが発生しました" }, { status: 500 });
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
        id: masterData.id,
        category: masterData.category,
        name: masterData.name,
        type: masterData.type,
        data: masterData.data,
      }).from(masterData);
      const availableRelations = await db.select().from(masterRelations);
      const species = String(payload.form || payload.species || "").trim();
      const speciesMaster = availableMaster.find((entry) => entry.category === "pokemon" && entry.name === species);
      const id = Number(payload.id) || 0;
      const ability = String(payload.ability ?? "").trim();
      const heldItem = String(payload.heldItem ?? "").trim();
      const nature = String(payload.nature ?? "").trim();
      const moves = Array.isArray(payload.moves) ? payload.moves.map(String).map((move) => move.trim()).filter(Boolean).slice(0, 4) : [];
      const existsInMaster = (category: "item" | "ability" | "move" | "nature", name: string) =>
        !name || availableMaster.some((entry) => entry.category === category && entry.name === name);
      if (!speciesMaster) return Response.json({ error: "マスターデータに登録されたポケモンを選択する必要がある" }, { status: 400 });
      const linkedAbilityIds = availableRelations
        .filter((relation) => relation.sourceId === speciesMaster.id && relation.kind === "has_ability")
        .map((relation) => relation.targetId);
      const linkedMoveIds = availableRelations
        .filter((relation) => relation.sourceId === speciesMaster.id && relation.kind === "learns_move")
        .map((relation) => relation.targetId);
      const abilityMaster = availableMaster.find((entry) => entry.category === "ability" && entry.name === ability);
      const moveMasters = moves.map((name) => availableMaster.find((entry) => entry.category === "move" && entry.name === name));
      if (ability && linkedAbilityIds.length && (!abilityMaster || !linkedAbilityIds.includes(abilityMaster.id))) {
        return Response.json({ error: "このポケモンが使用できる特性を選択する必要がある" }, { status: 400 });
      }
      if (linkedMoveIds.length && moveMasters.some((move) => !move || !linkedMoveIds.includes(move.id))) {
        return Response.json({ error: "このポケモンが使用できる技を選択する必要がある" }, { status: 400 });
      }
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
        form: "",
        megaEvolution: Boolean(safeJson<Record<string, unknown>>(speciesMaster.data, {}).mega),
        moves: JSON.stringify(moves),
        stats: JSON.stringify(payload.stats ?? {}),
        notes: String(payload.notes ?? "").trim(),
        updatedAt: new Date().toISOString(),
      };
      const [saved] = id
        ? await db.update(roster).set(values).where(and(eq(roster.id, id), eq(roster.ownerId, auth.profile.id))).returning()
        : await db.insert(roster).values(values).returning();
      return Response.json({ saved });
    }

    if (action === "delete-roster") {
      await db.delete(roster).where(and(eq(roster.id, Number(payload.id)), eq(roster.ownerId, auth.profile.id)));
      return Response.json({ ok: true });
    }

    if (action === "save-battle-team") {
      const name = String(payload.name ?? "").trim();
      const memberIds = Array.isArray(payload.memberIds)
        ? [...new Set(payload.memberIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
        : [];
      if (!name || name.length > 40) return Response.json({ error: "チーム名は1〜40文字で入力する必要がある" }, { status: 400 });
      if (memberIds.length !== 6) return Response.json({ error: "バトルチームには6体を選択する必要がある" }, { status: 400 });
      const members = await db.select().from(roster)
        .where(and(eq(roster.ownerId, auth.profile.id), inArray(roster.id, memberIds)));
      if (members.length !== 6) return Response.json({ error: "ボックスにある6体を選択する必要がある" }, { status: 400 });
      const pokemonMaster = await db.select({ name: masterData.name, data: masterData.data }).from(masterData)
        .where(eq(masterData.category, "pokemon"));
      const masterByName = new Map(pokemonMaster.map((entry) => [entry.name, safeJson<Record<string, unknown>>(entry.data, {})]));
      const identities = new Set<string>();
      for (const member of members) {
        const data = masterByName.get(member.species);
        const dexNo = Number(data?.dexNo);
        const identity = Number.isInteger(dexNo) && dexNo > 0 ? `dex:${dexNo}` : `name:${member.species}`;
        if (identities.has(identity)) return Response.json({ error: "同じポケモンをバトルチームに複数入れることはできない" }, { status: 400 });
        identities.add(identity);
      }
      const id = Number(payload.id) || 0;
      let teamId = id;
      if (id) {
        const existing = await db.select({ id: battleTeams.id }).from(battleTeams)
          .where(and(eq(battleTeams.id, id), eq(battleTeams.ownerId, auth.profile.id))).limit(1);
        if (!existing[0]) return Response.json({ error: "編集するチームが見つからない" }, { status: 404 });
        await db.update(battleTeams).set({ name, updatedAt: new Date().toISOString() }).where(eq(battleTeams.id, id));
        await db.delete(battleTeamMembers).where(eq(battleTeamMembers.teamId, id));
      } else {
        const [saved] = await db.insert(battleTeams).values({ ownerId: auth.profile.id, name, updatedAt: new Date().toISOString() }).returning();
        teamId = saved.id;
      }
      await db.insert(battleTeamMembers).values(memberIds.map((rosterId, position) => ({ teamId, rosterId, position })));
      return Response.json({ ok: true, id: teamId });
    }

    if (action === "delete-battle-team") {
      await db.delete(battleTeams).where(and(eq(battleTeams.id, Number(payload.id)), eq(battleTeams.ownerId, auth.profile.id)));
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
      const [saved] = await db.update(users).set({
        displayName,
        handle,
        preferredFormat,
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
      const categories: MasterCategory[] = ["pokemon", "item", "ability", "move", "nature", "type", "regulation"];
      if (!categories.includes(category as MasterCategory)) {
        return Response.json({ error: "カテゴリが不正である" }, { status: 400 });
      }
      const values = {
        category: category as MasterCategory,
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

      if (saved.category === "regulation" && Boolean((payload.data as Record<string, unknown> | undefined)?.active)) {
        const otherRegulations = await db
          .select()
          .from(masterData)
          .where(eq(masterData.category, "regulation"));
        await Promise.all(otherRegulations
          .filter((entry) => entry.id !== saved.id)
          .map((entry) => db.update(masterData).set({
            data: JSON.stringify({ ...safeJson<Record<string, unknown>>(entry.data, {}), active: false }),
            updatedAt: new Date().toISOString(),
          }).where(eq(masterData.id, entry.id))));
      }

      if (Array.isArray(payload.relations)) {
        const relationKinds: MasterRelationKind[] = [
          "learns_move",
          "has_ability",
          "form_of",
          "type_effectiveness",
          "allows_pokemon",
          "allows_item",
        ];
        const requestedRelations = payload.relations
          .map((value) => value as Record<string, unknown>)
          .filter((value) =>
            relationKinds.includes(String(value.kind) as MasterRelationKind) &&
            Number.isInteger(Number(value.targetId)) &&
            Number(value.targetId) > 0
          );
        if (requestedRelations.length) {
          const targetIds = requestedRelations.map((relation) => Number(relation.targetId));
          const validTargets = await db
            .select({ id: masterData.id, category: masterData.category })
            .from(masterData)
            .where(inArray(masterData.id, targetIds));
          const validTargetsById = new Map(validTargets.map((target) => [target.id, target.category]));
          const expectedRelation: Partial<Record<MasterRelationKind, [MasterCategory, MasterCategory]>> = {
            learns_move: ["pokemon", "move"],
            has_ability: ["pokemon", "ability"],
            form_of: ["pokemon", "pokemon"],
            type_effectiveness: ["type", "type"],
            allows_pokemon: ["regulation", "pokemon"],
            allows_item: ["regulation", "item"],
          };
          const insertValues = requestedRelations
            .filter((relation) => {
              const expected = expectedRelation[String(relation.kind) as MasterRelationKind];
              return expected?.[0] === saved.category &&
                expected[1] === validTargetsById.get(Number(relation.targetId));
            })
            .map((relation) => ({
              sourceId: saved.id,
              targetId: Number(relation.targetId),
              kind: String(relation.kind) as MasterRelationKind,
              data: JSON.stringify(relation.data ?? {}),
            }));
          await db.delete(masterRelations).where(eq(masterRelations.sourceId, saved.id));
          if (insertValues.length) {
            await db.insert(masterRelations).values(insertValues).onConflictDoNothing();
          }
        } else {
          await db.delete(masterRelations).where(eq(masterRelations.sourceId, saved.id));
        }
      }
      return Response.json({ saved });
    }

    return Response.json({ error: "未対応の操作である" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update application state", error);
    return Response.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
