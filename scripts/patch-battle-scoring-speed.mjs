import fs from "node:fs";
import path from "node:path";

const root = process.env.SITES_PROJECT_ROOT || process.cwd();
const workspacePath = path.join(root, "app/components/workspace.tsx");
let source = fs.readFileSync(workspacePath, "utf8");

if (source.includes("function speedModifier(speed: number, lead = false)")) {
  console.log("Battle scoring speed patch already applied.");
  process.exit(0);
}

function replaceOnce(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Could not patch ${label}. The source structure has changed.`);
  source = next;
}

replaceOnce(
  /function numberScore\(mon: RosterEntry\) \{[\s\S]*?\n\}/,
  `function speedModifier(speed: number, lead = false) {
  const boundedSpeed = Math.max(1, speed);
  return lead
    ? 0.75 + 0.5 * boundedSpeed / (boundedSpeed + 100)
    : 0.85 + 0.3 * boundedSpeed / (boundedSpeed + 100);
}

function baseDurability(mon: RosterEntry) {
  const stats = mon.stats;
  return stats.hp * Math.sqrt(Math.max(1, stats.defense) * Math.max(1, stats.spDefense));
}

function numberScore(mon: RosterEntry) {
  const offense = Math.max(mon.stats.attack, mon.stats.spAttack);
  const durability = baseDurability(mon);
  return Math.sqrt(offense * durability) / 10 * speedModifier(mon.stats.speed) + (mon.megaEvolution ? 8 : 0);
}`,
  "general Pokémon score",
);

replaceOnce(
  /function scoreForProfile\(mon: RosterEntry, profile: SuggestionProfile\) \{[\s\S]*?\n\}/,
  `function scoreForProfile(mon: RosterEntry, profile: SuggestionProfile) {
  const stats = mon.stats;
  const offense = Math.max(stats.attack, stats.spAttack);
  const durability = baseDurability(mon);
  const speed = speedModifier(stats.speed);
  if (profile === "offense") return (offense * 0.68 + Math.sqrt(durability) * 0.32) * speed;
  if (profile === "bulk") return (Math.sqrt(durability) * 0.7 + offense * 0.3) * speed;
  return Math.sqrt(offense * durability) / 10 * speed;
}`,
  "team construction profile score",
);

replaceOnce(
  /function directMatchup\(mon: RosterEntry, opponent: MasterEntry, maps: MasterMaps, relations: AppState\["masterRelations"\]\): DirectMatchup \{[\s\S]*?return \{ score, bestOffense, worstIncoming, reasons \};\n\}/,
  `function directMatchup(mon: RosterEntry, opponent: MasterEntry, maps: MasterMaps, relations: AppState["masterRelations"]): DirectMatchup {
  const opponentTypes = splitTypes(opponent.type);
  const monTypes = splitTypes(mon.types);
  const bestOffense = monTypes.length
    ? Math.max(...monTypes.map((type) => combinedTypeMultiplier(type, opponentTypes, maps, relations)))
    : 1;
  const worstIncoming = opponentTypes.length
    ? Math.max(...opponentTypes.map((attackType) => combinedTypeMultiplier(attackType, monTypes, maps, relations)))
    : 1;
  const attackPerformance = Math.max(mon.stats.attack, mon.stats.spAttack) * 1.5 * bestOffense;
  const incomingForDurability = worstIncoming === 0 ? 0.125 : worstIncoming;
  const defensePerformance = baseDurability(mon) / incomingForDurability;
  const score = Math.round(Math.sqrt(Math.max(1, attackPerformance) * Math.max(1, defensePerformance)) / 15 * speedModifier(mon.stats.speed));
  const reasons: string[] = [];
  if (bestOffense >= 4) reasons.push("4倍弱点を突ける");
  else if (bestOffense >= 2) reasons.push("弱点を突ける");
  else if (!monTypes.length) reasons.push("自分のタイプが未登録");
  if (worstIncoming === 0) reasons.push("相手の主要タイプを無効化できる");
  else if (worstIncoming <= 0.5) reasons.push("相手の主要タイプを半減以下にできる");
  else if (worstIncoming >= 2) reasons.push("相手の主要タイプを受けにくい");
  if (mon.stats.speed >= 120) reasons.push("素早さが高い");
  return { score, bestOffense, worstIncoming, reasons };
}`,
  "direct matchup score",
);

replaceOnce(
  /return \{ mon, score: matchup\.score \+ numberScore\(mon\) \* 0\.12, reasons: matchup\.reasons \};/,
  `const leadSpeedBonus = Math.round(matchup.score * (speedModifier(mon.stats.speed, true) / speedModifier(mon.stats.speed) - 1));
      return { mon, score: matchup.score + numberScore(mon) * 0.12 + leadSpeedBonus, reasons: matchup.reasons };`,
  "lead speed emphasis",
);

source = source
  .replaceAll("STEP 03 / CURRENT MATCHUP", "MATCHUP CHECK")
  .replaceAll("STEP 3は", "対面チェックは")
  .replaceAll("未入力でもSTEP 3は利用できる。", "未入力でも対面チェックは利用できる。")
  .replaceAll("3<small>現在の相手</small>", "◎<small>対面チェック</small>");

fs.writeFileSync(workspacePath, source);
console.log("Applied HP durability, speed modifiers, lead emphasis, and independent matchup naming.");
