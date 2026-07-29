import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

test("migrations leave one unified 318-entry Pokémon catalog", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");

  for (const filename of readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort()) {
    if (filename.startsWith("0008_")) {
      db.exec(`
        INSERT OR IGNORE INTO master_data (category, name, type, description, data)
        VALUES
          ('pokemon', 'ゴリランダー', 'くさ', '旧デモデータ', '{}'),
          ('pokemon', 'ポリゴン2', 'ノーマル', '旧デモデータ', '{}')
      `);
    }
    const sql = readFileSync(new URL(`../drizzle/${filename}`, import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) db.exec(statement);
    }
  }

  const pokemonCount = db.prepare(
    "SELECT COUNT(*) AS count FROM master_data WHERE category = 'pokemon'",
  ).get().count;
  const formCount = db.prepare(
    "SELECT COUNT(*) AS count FROM master_data WHERE category = 'form'",
  ).get().count;
  const staleCount = db.prepare(
    "SELECT COUNT(*) AS count FROM master_data WHERE category = 'pokemon' AND name IN ('ゴリランダー', 'ポリゴン2')",
  ).get().count;
  const archivedCount = db.prepare(
    "SELECT COUNT(*) AS count FROM master_data WHERE category = 'archived' AND name IN ('ゴリランダー', 'ポリゴン2')",
  ).get().count;
  const oldRelationCount = db.prepare(
    "SELECT COUNT(*) AS count FROM master_relations WHERE kind = 'allows_form'",
  ).get().count;

  assert.equal(pokemonCount, 318);
  assert.equal(formCount, 0);
  assert.equal(staleCount, 0);
  assert.equal(archivedCount, 2);
  assert.equal(oldRelationCount, 0);
});
