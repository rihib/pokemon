import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "app/components/workspace.tsx");
let source = fs.readFileSync(workspacePath, "utf8");

if (source.includes("const CHAMPIONS_GENERATION = Generations.get(0)")) {
  console.log("Smogon Champions damage calculator patch already applied.");
  process.exit(0);
}

if (!source.includes('from "@smogon/calc"')) {
  source = `import { calculate, Field, Generations, Move, Pokemon } from "@smogon/calc";\n${source}`;
}

const start = source.indexOf("function estimateMoveDamage(");
const end = source.indexOf("\nfunction MoveDamageAdvisor(", start);
if (start < 0 || end < 0) throw new Error("Could not locate the provisional damage estimator.");

const replacement = String.raw`const CHAMPIONS_GENERATION = Generations.get(0);

const TYPE_TO_SHOWDOWN: Record<string, string> = {
  ノーマル: "Normal", ほのお: "Fire", みず: "Water", でんき: "Electric",
  くさ: "Grass", こおり: "Ice", かくとう: "Fighting", どく: "Poison",
  じめん: "Ground", ひこう: "Flying", エスパー: "Psychic", むし: "Bug",
  いわ: "Rock", ゴースト: "Ghost", ドラゴン: "Dragon", あく: "Dark",
  はがね: "Steel", フェアリー: "Fairy",
};

function showdownType(type: string) {
  return TYPE_TO_SHOWDOWN[type] ?? type;
}

function exactStatBase(stat: number, hp = false) {
  return Math.max(1, Math.round(stat) - (hp ? 75 : 20));
}

function calcPokemonFromRoster(mon: RosterEntry) {
  const types = splitTypes(mon.types).map(showdownType);
  return new Pokemon(CHAMPIONS_GENERATION, "Pikachu", {
    name: mon.species,
    level: 50,
    overrides: {
      name: mon.species,
      types: (types.length > 1 ? [types[0], types[1]] : [types[0] || "Normal"]) as never,
      baseStats: {
        hp: exactStatBase(mon.stats.hp, true), atk: exactStatBase(mon.stats.attack),
        def: exactStatBase(mon.stats.defense), spa: exactStatBase(mon.stats.spAttack),
        spd: exactStatBase(mon.stats.spDefense), spe: exactStatBase(mon.stats.speed),
      },
    },
  });
}

function calcPokemonFromMaster(entry: MasterEntry) {
  const stats = pokemonMasterStats(entry);
  const types = splitTypes(entry.type).map(showdownType);
  const data = entry.data ?? {};
  return new Pokemon(CHAMPIONS_GENERATION, String(data.showdownName ?? data.englishName ?? "Pikachu"), {
    level: 50,
    overrides: {
      name: entry.name,
      types: (types.length > 1 ? [types[0], types[1]] : [types[0] || "Normal"]) as never,
      baseStats: {
        hp: stats.hp, atk: numericMasterValue(data, ["attack", "atk"], 100),
        def: stats.defense, spa: numericMasterValue(data, ["spAttack", "spa"], 100),
        spd: stats.spDefense, spe: numericMasterValue(data, ["speed", "spe"], 100),
      },
    },
  });
}

function calcMoveFromMaster(move: DamageMove, master: MasterEntry[]) {
  const entry = master.find((candidate) => candidate.category === "move" && candidate.name === move.name);
  const data = entry?.data ?? {};
  return new Move(CHAMPIONS_GENERATION, String(data.showdownName ?? data.englishName ?? "Tackle"), {
    name: move.name,
    overrides: {
      name: move.name,
      basePower: move.power,
      type: showdownType(move.type),
      category: move.category === "physical" ? "Physical" : "Special",
      accuracy: move.accuracy,
      target: String(data.target ?? "any"),
      flags: (data.flags ?? {}) as never,
    },
  });
}

function estimateMoveDamage(mon: RosterEntry, target: MasterEntry, move: DamageMove, master: MasterEntry[]): DamageEstimate {
  const attacker = calcPokemonFromRoster(mon);
  const defender = calcPokemonFromMaster(target);
  const calcMove = calcMoveFromMaster(move, master);
  const result = calculate(CHAMPIONS_GENERATION, attacker, defender, calcMove, new Field());
  const [minDamage, maxDamage] = result.range();
  const rolls = Array.isArray(result.damage) ? result.damage.flat(4).filter((value): value is number => typeof value === "number") : [Number(result.damage) || 0];
  const averageDamage = rolls.length ? rolls.reduce((sum, value) => sum + value, 0) / rolls.length : 0;
  const hp = Math.max(1, defender.rawStats.hp);
  const effectiveness = move.type ? combinedTypeMultiplier(move.type, splitTypes(target.type), createMasterMaps(master), []) : 1;
  const stab = move.type && splitTypes(mon.types).includes(move.type) ? 1.5 : 1;
  return {
    ...move,
    minDamage,
    maxDamage,
    minPercent: minDamage / hp * 100,
    maxPercent: maxDamage / hp * 100,
    expectedDamage: averageDamage * move.accuracy / 100,
    effectiveness,
    stab,
  };
}
`;

source = source.slice(0, start) + replacement + source.slice(end);
source = source.replace(
  ".map((move) => estimateMoveDamage(attacker, target, move, maps, relations))",
  ".map((move) => estimateMoveDamage(attacker, target, move, master))",
);
source = source.replace(
  "レベル50、通常の本編シリーズ型ダメージ式、乱数85〜100%での近似。",
  "レベル50、@smogon/calc の Pokémon Champions（Generation 0）計算モデルを使用。",
);
source = source.replace(
  "急所、能力ランク、天候、フィールド、特性、持ち物、やけど、複数対象補正、技固有効果は未反映。",
  "現在の画面で未指定の能力ランク、天候、フィールド、状態異常、相手の特性・持ち物は初期値として計算。",
);

fs.writeFileSync(workspacePath, source);
console.log("Replaced provisional damage math with @smogon/calc Champions mechanics.");
