import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GET /api/state does not mutate the database", async () => {
  const source = await readFile(new URL("../app/api/state/route.ts", import.meta.url), "utf8");
  const getStart = source.indexOf("export async function GET()");
  const postStart = source.indexOf("export async function POST");

  assert.notEqual(getStart, -1);
  assert.notEqual(postStart, -1);

  const getHandler = source.slice(getStart, postStart);
  assert.doesNotMatch(getHandler, /\bdb\.(?:insert|update|delete)\s*\(/);
  assert.doesNotMatch(getHandler, /seedBaselineMaster/);
});
