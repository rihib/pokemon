import fs from "node:fs";
import path from "node:path";

const root = process.env.SITES_PROJECT_ROOT || process.cwd();
const workspacePath = path.join(root, "app/components/workspace.tsx");
const cssPath = path.join(root, "app/globals.css");
let source = fs.readFileSync(workspacePath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

if (source.includes("function MoveDamageAdvisor(")) {
  console.log("Move damage advisor patch already applied.");
  process.exit(0);
}

function replaceOnce(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Could not patch ${label}. The source structure has changed.`);
  source = next;
}

const component = String.raw`
type DamageMove = {
  name: string;
  type: string;
  category: "physical" | "special";
  power: number;
  accuracy: number;
};

type DamageEstimate = DamageMove & {
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  expectedDamage: number;
  effectiveness: number;
  stab: number;
};

function numericMasterValue(data: Record<string, unknown> | undefined, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = Number(data?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function moveFromMaster(name: string, master: MasterEntry[]): DamageMove | null {
  const entry = master.find((candidate) => candidate.category === "move" && candidate.name === name);
  if (!entry) return null;
  const rawCategory = String(entry.data?.category ?? entry.data?.damageClass ?? entry.data?.class ?? "").toLowerCase();
  const category = rawCategory.includes("special") || rawCategory.includes("特殊") ? "special"
    : rawCategory.includes("physical") || rawCategory.includes("物理") ? "physical"
    : null;
  const power = numericMasterValue(entry.data, ["power", "basePower", "威力"], 0);
  if (!category || power <= 0) return null;
  const accuracyRaw = numericMasterValue(entry.data, ["accuracy", "命中"], 100);
  return {
    name: entry.name,
    type: entry.type || String(entry.data?.type ?? ""),
    category,
    power,
    accuracy: Math.max(0, Math.min(100, accuracyRaw)),
  };
}

function pokemonMasterStats(entry: MasterEntry | undefined) {
  const stats = (entry?.data?.stats ?? entry?.data?.baseStats ?? {}) as Record<string, unknown>;
  return {
    hp: numericMasterValue(stats, ["hp", "HP"], 100),
    defense: numericMasterValue(stats, ["defense", "def", "防御"], 100),
    spDefense: numericMasterValue(stats, ["spDefense", "spd", "specialDefense", "特防"], 100),
  };
}

function estimateMoveDamage(mon: RosterEntry, target: MasterEntry, move: DamageMove, maps: MasterMaps, relations: AppState["masterRelations"]): DamageEstimate {
  const level = 50;
  const targetStats = pokemonMasterStats(target);
  const attack = move.category === "physical" ? mon.stats.attack : mon.stats.spAttack;
  const defense = Math.max(1, move.category === "physical" ? targetStats.defense : targetStats.spDefense);
  const targetTypes = splitTypes(target.type);
  const effectiveness = move.type ? combinedTypeMultiplier(move.type, targetTypes, maps, relations) : 1;
  const stab = move.type && splitTypes(mon.types).includes(move.type) ? 1.5 : 1;
  const base = Math.floor(Math.floor(Math.floor((2 * level) / 5 + 2) * move.power * Math.max(1, attack) / defense) / 50) + 2;
  const modified = base * stab * effectiveness;
  const minDamage = effectiveness === 0 ? 0 : Math.max(1, Math.floor(modified * 0.85));
  const maxDamage = effectiveness === 0 ? 0 : Math.max(1, Math.floor(modified));
  const hp = Math.max(1, targetStats.hp);
  const expectedDamage = ((minDamage + maxDamage) / 2) * move.accuracy / 100;
  return {
    ...move,
    minDamage,
    maxDamage,
    minPercent: minDamage / hp * 100,
    maxPercent: maxDamage / hp * 100,
    expectedDamage,
    effectiveness,
    stab,
  };
}

function MoveDamageAdvisor({ party, targetName, master, relations }: { party: RosterEntry[]; targetName: string; master: MasterEntry[]; relations: AppState["masterRelations"] }) {
  const [attackerId, setAttackerId] = useState<number>(party[0]?.id ?? 0);
  useEffect(() => {
    if (!party.some((mon) => mon.id === attackerId)) setAttackerId(party[0]?.id ?? 0);
  }, [party, attackerId]);
  const attacker = party.find((mon) => mon.id === attackerId) ?? party[0];
  const target = master.find((entry) => entry.category === "pokemon" && entry.name === targetName);
  const maps = useMemo(() => createMasterMaps(master), [master]);
  const estimates = useMemo(() => {
    if (!attacker || !target) return [];
    return attacker.moves
      .map((name) => moveFromMaster(name, master))
      .filter((move): move is DamageMove => Boolean(move))
      .map((move) => estimateMoveDamage(attacker, target, move, maps, relations))
      .sort((a, b) => b.expectedDamage - a.expectedDamage || b.maxDamage - a.maxDamage);
  }, [attacker, target, master, maps, relations]);
  const best = estimates[0];
  return <section className="panel move-damage-advisor">
    <div className="panel-head"><div><small>MOVE DAMAGE ADVISOR</small><h2>使う技を提案</h2><p>自分のバトルポケモンを1体選び、現在の相手への登録技を推定ダメージ順に並べる。</p></div>{best && <span>推奨：{best.name}</span>}</div>
    <div className="damage-advisor-controls"><label>自分のポケモン<select value={attacker?.id ?? 0} onChange={(event) => setAttackerId(Number(event.target.value))}>{party.map((mon) => <option key={mon.id} value={mon.id}>{mon.nickname || mon.species}</option>)}</select></label><div><small>相手</small><strong>{target?.name ?? "対面チェックで選択"}</strong></div></div>
    {!target && <p className="field-hint">先に「対面チェック」で相手ポケモンを選択する。</p>}
    {target && attacker && !attacker.moves.some(Boolean) && <p className="field-hint">このポケモンに技を登録すると提案を表示する。</p>}
    {target && attacker && attacker.moves.some(Boolean) && !estimates.length && <p className="field-hint">登録技の威力・物理/特殊分類がマスターデータにないため計算できない。</p>}
    {estimates.length > 0 && <div className="damage-estimate-list">{estimates.map((estimate, index) => <article key={estimate.name} className={index === 0 ? "recommended" : ""}><header><div><strong>{estimate.name}</strong><small>{estimate.type || "タイプ不明"}・{estimate.category === "physical" ? "物理" : "特殊"}・威力{estimate.power}</small></div><span>{index === 0 ? "おすすめ" : `第${index + 1}候補`}</span></header><div className="damage-range"><strong>{estimate.minDamage}〜{estimate.maxDamage}</strong><span>推定 {estimate.minPercent.toFixed(1)}〜{estimate.maxPercent.toFixed(1)}%</span></div><p>命中 {estimate.accuracy}%・タイプ相性 {estimate.effectiveness}倍{estimate.stab > 1 ? "・タイプ一致 1.5倍" : ""}</p></article>)}</div>}
    <p className="damage-model-note">レベル50、通常の本編シリーズ型ダメージ式、乱数85〜100%での近似。急所、能力ランク、天候、フィールド、特性、持ち物、やけど、複数対象補正、技固有効果は未反映。相手能力値がマスターにない場合はHP・防御・特防を100として表示する。</p>
  </section>;
}
`;

replaceOnce(
  /\nfunction BattlePanel\(/,
  `${component}\nfunction BattlePanel(`,
  "damage advisor component",
);

replaceOnce(
  /(<section className="lead-panel step3-panel">[\s\S]*?<\/section>)\n  <\/section>;\n}/,
  `$1\n    <MoveDamageAdvisor party={selectedTeam.members} targetName={enemyLead} master={master} relations={[]} />\n  </section>;\n}`,
  "damage advisor placement",
);

// BattlePanel did not previously receive relations; add the prop and pass it from Workspace.
replaceOnce(
  /<BattlePanel format=\{format\} pickCount=\{pickCount\} master=\{state\.master\}/,
  `<BattlePanel format={format} pickCount={pickCount} master={state.master} relations={state.masterRelations}`,
  "BattlePanel relations prop",
);
replaceOnce(
  /function BattlePanel\(\{ format, pickCount, master, teams,/,
  `function BattlePanel({ format, pickCount, master, relations, teams,`,
  "BattlePanel relations destructuring",
);
replaceOnce(
  /pickCount: number; master: MasterEntry\[\]; teams:/,
  `pickCount: number; master: MasterEntry[]; relations: AppState["masterRelations"]; teams:`,
  "BattlePanel relations type",
);
source = source.replace(
  `<MoveDamageAdvisor party={selectedTeam.members} targetName={enemyLead} master={master} relations={[]} />`,
  `<MoveDamageAdvisor party={selectedTeam.members} targetName={enemyLead} master={master} relations={relations} />`,
);

const cssMarker = "/* move damage advisor */";
if (!css.includes(cssMarker)) css += `\n\n${cssMarker}\n.move-damage-advisor { margin-top: 1rem; }\n.damage-advisor-controls { display: grid; grid-template-columns: minmax(0,1fr) minmax(12rem,.6fr); gap: 1rem; align-items: end; margin: 1rem 0; }\n.damage-advisor-controls label, .damage-advisor-controls > div { display: grid; gap: .35rem; }\n.damage-estimate-list { display: grid; gap: .75rem; }\n.damage-estimate-list article { border: 1px solid #dce3de; border-radius: .9rem; padding: .9rem; background: #fff; }\n.damage-estimate-list article.recommended { border-color: #4d9f68; box-shadow: 0 0 0 2px rgba(77,159,104,.12); }\n.damage-estimate-list header, .damage-range { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }\n.damage-estimate-list header > div { display: grid; gap: .2rem; }\n.damage-range { margin-top: .75rem; }\n.damage-range strong { font-size: 1.2rem; }\n.damage-model-note { margin-top: 1rem; color: #667085; font-size: .78rem; line-height: 1.6; }\n@media (max-width: 760px) { .damage-advisor-controls { grid-template-columns: 1fr; } .damage-estimate-list header, .damage-range { align-items: flex-start; } }\n`;

fs.writeFileSync(workspacePath, source);
fs.writeFileSync(cssPath, css);
console.log("Applied move damage advisor.");
