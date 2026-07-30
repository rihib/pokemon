import fs from "node:fs";
import path from "node:path";

const root = process.env.SITES_PROJECT_ROOT || process.cwd();
const workspacePath = path.join(root, "app/components/workspace.tsx");
const cssPath = path.join(root, "app/globals.css");
let source = fs.readFileSync(workspacePath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

if (source.includes("function MatchupNavigatorPanel(")) {
  console.log("Matchup navigator patch already applied.");
  process.exit(0);
}

function replaceOnce(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Could not patch ${label}. The source structure has changed.`);
  source = next;
}

replaceOnce(
  /type Tab = "home" \| "roster" \| "items" \| "build" \| "teams" \| "battle" \| "settings";/,
  `type Tab = "home" | "roster" | "items" | "build" | "teams" | "battle" | "matchup" | "settings";`,
  "tab type",
);

replaceOnce(
  /\{ id: "battle", label: "対戦ナビ", icon: "◎" \},/,
  `{ id: "battle", label: "対戦ナビ", icon: "◎" },\n  { id: "matchup", label: "相性ナビ", icon: "⇄" },`,
  "navigation item",
);

replaceOnce(
  /\{tab === "battle" && <BattlePanel([\s\S]*?)\/>\}/,
  `{tab === "battle" && <BattlePanel$1/>}\n            {tab === "matchup" && <MatchupNavigatorPanel master={state.master} relations={state.masterRelations} />}`,
  "matchup panel route",
);

const component = String.raw`
type MatchupEntityKind = "pokemon" | "type";

type MatchupEntity = {
  kind: MatchupEntityKind;
  pokemon: string;
  types: string[];
};

function matchupTone(multiplier: number) {
  if (multiplier === 0) return { label: "効果なし", tone: "immune" };
  if (multiplier >= 4) return { label: "4倍以上", tone: "very-strong" };
  if (multiplier >= 2) return { label: "効果抜群", tone: "strong" };
  if (multiplier <= 0.25) return { label: "1/4以下", tone: "very-weak" };
  if (multiplier < 1) return { label: "いまひとつ", tone: "weak" };
  return { label: "等倍", tone: "neutral" };
}

function MatchupEntityEditor({ title, value, onChange, master }: { title: string; value: MatchupEntity; onChange: (value: MatchupEntity) => void; master: MasterEntry[] }) {
  const typeOptions = master.filter((entry) => entry.category === "type").sort((a, b) => a.name.localeCompare(b.name, "ja"));
  const updateType = (index: number, type: string) => {
    const next = [...value.types];
    next[index] = type;
    onChange({ ...value, types: next.filter((entry, position) => entry && next.indexOf(entry) === position) });
  };
  return <section className="matchup-entity-card">
    <header><small>{title}</small><div className="entity-kind-toggle"><button type="button" className={value.kind === "pokemon" ? "active" : ""} onClick={() => onChange({ kind: "pokemon", pokemon: value.pokemon, types: [] })}>ポケモン</button><button type="button" className={value.kind === "type" ? "active" : ""} onClick={() => onChange({ kind: "type", pokemon: "", types: value.types })}>タイプ</button></div></header>
    {value.kind === "pokemon" ? <PokemonSearchSelect value={value.pokemon} master={master} onChange={(pokemon) => onChange({ ...value, pokemon })} placeholder="ポケモンを検索" ariaLabel={title + "のポケモン"} /> : <div className="dual-type-select"><label>タイプ1<select value={value.types[0] ?? ""} onChange={(event) => updateType(0, event.target.value)}><option value="">選択する</option>{typeOptions.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>タイプ2（任意）<select value={value.types[1] ?? ""} onChange={(event) => updateType(1, event.target.value)}><option value="">なし</option>{typeOptions.filter((entry) => entry.name !== value.types[0]).map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label></div>}
  </section>;
}

function MatchupDirection({ attackerLabel, defenderLabel, attackTypes, defenseTypes, maps, relations }: { attackerLabel: string; defenderLabel: string; attackTypes: string[]; defenseTypes: string[]; maps: MasterMaps; relations: AppState["masterRelations"] }) {
  const rows = attackTypes.map((attackType) => ({ attackType, multiplier: combinedTypeMultiplier(attackType, defenseTypes, maps, relations) }));
  const best = rows.length ? Math.max(...rows.map((row) => row.multiplier)) : undefined;
  return <article className="matchup-direction-card"><header><div><small>ATTACK DIRECTION</small><h3>{attackerLabel} → {defenderLabel}</h3></div>{best !== undefined && <strong className={"matchup-multiplier " + matchupTone(best).tone}>最大 {best}倍</strong>}</header>{rows.length ? <div className="matchup-direction-rows">{rows.map((row) => { const tone = matchupTone(row.multiplier); return <div key={row.attackType}><span>{row.attackType}技</span><strong className={tone.tone}>{row.multiplier}倍</strong><small>{tone.label}</small></div>; })}</div> : <p>攻撃側のタイプを選択すると倍率を表示する。</p>}</article>;
}

function MatchupNavigatorPanel({ master, relations }: { master: MasterEntry[]; relations: AppState["masterRelations"] }) {
  const [left, setLeft] = useState<MatchupEntity>({ kind: "pokemon", pokemon: "", types: [] });
  const [right, setRight] = useState<MatchupEntity>({ kind: "pokemon", pokemon: "", types: [] });
  const maps = useMemo(() => createMasterMaps(master), [master]);
  const resolve = (entity: MatchupEntity) => {
    if (entity.kind === "type") return { label: entity.types.length ? entity.types.join("・") : "タイプ未選択", types: entity.types };
    const pokemon = maps.pokemonByName.get(entity.pokemon);
    return { label: pokemon?.name ?? "ポケモン未選択", types: pokemon ? splitTypes(pokemon.type) : [] };
  };
  const leftResolved = resolve(left);
  const rightResolved = resolve(right);
  const ready = leftResolved.types.length > 0 && rightResolved.types.length > 0;
  const swap = () => { const previousLeft = left; setLeft(right); setRight(previousLeft); };
  return <section><PageTitle eyebrow="MATCHUP NAVI" title="相性ナビ" copy="自分のマイチームとは関係なく、任意のポケモン・単タイプ・複合タイプを左右に並べて相性を確認する。" />
    <div className="matchup-picker-layout"><MatchupEntityEditor title="左側" value={left} onChange={setLeft} master={master} /><button type="button" className="matchup-swap" onClick={swap} aria-label="左右を入れ替える">⇄<small>入れ替え</small></button><MatchupEntityEditor title="右側" value={right} onChange={setRight} master={master} /></div>
    {ready ? <section className="matchup-results"><header><small>TYPE MATCHUP</small><h2>{leftResolved.label} と {rightResolved.label}</h2><p>各ポケモンは自タイプ技を使う前提で、複合タイプの防御倍率は各タイプへの倍率を乗算する。</p></header><div><MatchupDirection attackerLabel={leftResolved.label} defenderLabel={rightResolved.label} attackTypes={leftResolved.types} defenseTypes={rightResolved.types} maps={maps} relations={relations} /><MatchupDirection attackerLabel={rightResolved.label} defenderLabel={leftResolved.label} attackTypes={rightResolved.types} defenseTypes={leftResolved.types} maps={maps} relations={relations} /></div></section> : <EmptyState title="左右の対象を選択しよう" copy="ポケモン同士、タイプ同士、ポケモンとタイプのどの組み合わせでも比較できる。タイプは2つまで指定できる。" />}
  </section>;
}
`;

replaceOnce(
  /\nfunction SettingsPanel/,
  `${component}\nfunction SettingsPanel`,
  "matchup navigator component",
);

const cssMarker = "/* matchup navigator */";
if (!css.includes(cssMarker)) css += `\n\n${cssMarker}\n.matchup-picker-layout { display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); gap: 1rem; align-items: center; }\n.matchup-entity-card, .matchup-results, .matchup-direction-card { border: 1px solid #dce3de; border-radius: 1rem; background: #fff; padding: 1rem; }\n.matchup-entity-card header, .matchup-direction-card header { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: .8rem; }\n.entity-kind-toggle { display: inline-flex; padding: .2rem; border-radius: .7rem; background: #eef2ef; }\n.entity-kind-toggle button { border: 0; border-radius: .55rem; padding: .45rem .7rem; background: transparent; cursor: pointer; }\n.entity-kind-toggle button.active { background: #fff; box-shadow: 0 2px 8px rgba(20,35,28,.1); font-weight: 800; }\n.dual-type-select { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .75rem; }\n.dual-type-select label { display: grid; gap: .35rem; }\n.matchup-swap { display: grid; place-items: center; gap: .2rem; width: 4rem; height: 4rem; border: 1px solid #cfd8d2; border-radius: 999px; background: #fff; font-size: 1.25rem; cursor: pointer; }\n.matchup-swap small { font-size: .65rem; }\n.matchup-results { margin-top: 1rem; }\n.matchup-results > header { margin-bottom: 1rem; }\n.matchup-results > div { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1rem; }\n.matchup-direction-rows { display: grid; gap: .55rem; }\n.matchup-direction-rows > div { display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: .65rem; align-items: center; padding: .7rem; border-radius: .7rem; background: #f6f8f6; }\n.matchup-multiplier, .matchup-direction-rows strong { white-space: nowrap; }\n.very-strong, .strong { color: #b42318; }\n.very-weak, .weak { color: #175cd3; }\n.immune { color: #667085; }\n.neutral { color: #344054; }\n@media (max-width: 760px) { .matchup-picker-layout { grid-template-columns: 1fr; } .matchup-swap { justify-self: center; rotate: 90deg; } .matchup-results > div, .dual-type-select { grid-template-columns: 1fr; } }\n`;

fs.writeFileSync(workspacePath, source);
fs.writeFileSync(cssPath, css);
console.log("Applied standalone matchup navigator.");
