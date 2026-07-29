import assert from "node:assert/strict";
import test from "node:test";
import { tsImport } from "tsx/esm/api";

test("Regulation Set M-B catalog includes every battle-distinct form", async () => {
  const catalog = await tsImport("../app/lib/champions-pokemon.ts", import.meta.url);
  const allPokemon = catalog.championsPokemonMaster;

  assert.equal(catalog.championsPokemonCount, 208);
  assert.equal(catalog.championsAlternateFormCount, 34);
  assert.equal(catalog.championsPokemonCount + catalog.championsAlternateFormCount, 242);
  assert.equal(catalog.championsMegaCount, 76);
  assert.equal(
    catalog.championsPokemonCount
      + catalog.championsAlternateFormCount
      + catalog.championsMegaCount,
    318,
  );
  assert.equal(allPokemon.length, 318);
  assert.ok(allPokemon.every((entry) => entry.category === "pokemon"));
  assert.equal(new Set(allPokemon.map((entry) => entry.name)).size, 318);
});
