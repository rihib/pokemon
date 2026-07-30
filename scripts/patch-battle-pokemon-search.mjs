import fs from "node:fs";
import path from "node:path";

const root = process.env.SITES_PROJECT_ROOT || process.cwd();
const workspacePath = path.join(root, "app/components/workspace.tsx");
const cssPath = path.join(root, "app/globals.css");
const marker = "function PokemonSearchSelect(";

let source = fs.readFileSync(workspacePath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

if (source.includes(marker)) {
  console.log("Battle Pokémon search patch already applied.");
  process.exit(0);
}

function replaceOnce(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Could not patch ${label}. The source structure has changed.`);
  source = next;
}

replaceOnce(
  /function recommendAgainstLead\(\n  selection: ReturnType<typeof chooseBattleTeam>,([\s\S]*?)return selection\n    \.map\(\(\{ mon \}\) => \{/,
  `function recommendAgainstLead(\n  party: RosterEntry[],$1return party\n    .map((mon) => {`,
  "STEP 3 ranking source",
);

replaceOnce(
  /\(\) => recommendAgainstLead\(selection, enemyLead, state\.master, state\.masterRelations\),\n    \[selection, enemyLead, state\.master, state\.masterRelations\],/,
  `() => recommendAgainstLead(battleParty, enemyLead, state.master, state.masterRelations),\n    [battleParty, enemyLead, state.master, state.masterRelations],`,
  "STEP 3 team dependency",
);

replaceOnce(
  /<BattlePanel format=\{format\} pickCount=\{pickCount\} teams=\{state\.battleTeams\}/,
  `<BattlePanel format={format} pickCount={pickCount} master={state.master} teams={state.battleTeams}`,
  "BattlePanel master prop",
);

const battlePanelPattern = /function BattlePanel\([\s\S]*?\n}\n\nfunction SettingsPanel/;
const battlePanelReplacement = `function PokemonSearchSelect({ value, onChange, master, placeholder, ariaLabel }: { value: string; onChange: (value: string) => void; master: MasterEntry[]; placeholder: string; ariaLabel: string }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setQuery(value), [value]);
  const options = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ja-JP");
    return master
      .filter((entry) => entry.category === "pokemon")
      .filter((entry) => !needle || entry.name.toLocaleLowerCase("ja-JP").includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .slice(0, 12);
  }, [master, query]);
  const select = (name: string) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };
  return <div className="pokemon-combobox">
    <input
      ref={inputRef}
      value={query}
      placeholder={placeholder}
      aria-label={ariaLabel}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      onFocus={() => setOpen(true)}
      onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && options[0]) { event.preventDefault(); select(options[0].name); }
        if (event.key === "Escape") setOpen(false);
      }}
    />
    {query && <button type="button" className="pokemon-combobox-clear" aria-label="選択を解除" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); onChange(""); inputRef.current?.focus(); }}>×</button>}
    {open && <div className="pokemon-combobox-list" role="listbox">
      {options.map((entry) => <button type="button" role="option" aria-selected={entry.name === value} key={entry.id} onMouseDown={(event) => event.preventDefault()} onClick={() => select(entry.name)}>
        <strong>{entry.name}</strong><small>{entry.type || "タイプ未登録"}</small>
      </button>)}
      {!options.length && <p>該当するポケモンがない</p>}
    </div>}
  </div>;
}

function BattlePanel({ format, pickCount, master, teams, selectedTeam, onSelectTeam, onManageTeams, opponents, setOpponents, selection, enemyLead, setEnemyLead, lead }: { format: BattleFormat; pickCount: number; master: MasterEntry[]; teams: BattleTeam[]; selectedTeam?: BattleTeam; onSelectTeam: (id: number) => void; onManageTeams: () => void; opponents: string[]; setOpponents: (v: string[]) => void; selection: ReturnType<typeof chooseBattleTeam>; enemyLead: string; setEnemyLead: (v: string) => void; lead?: ReturnType<typeof recommendAgainstLead> }) {
  const settingLabel = format === "single" ? "シングル" : "ダブル";
  const hasOpponentTeam = opponents.some(Boolean);
  if (!selectedTeam) return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="実際に使用するマイチームを選んでから、相手への選出を提案する。" count={settingLabel} /><EmptyState title="マイチームを選択しよう" copy="チーム構築の提案ではなく、自分で登録した6体のチームを対戦ナビの前提にする。" action={teams.length ? "マイチームを選ぶ" : "チームを作成"} onAction={onManageTeams} /></section>;
  return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="相手6体の入力は任意。現在対面している1体だけでも、マイチーム6体の相性順位を確認できる。" count={settingLabel} />
    <section className="panel active-team-panel"><div><small>USING MY BATTLE TEAM</small><h2>{selectedTeam.name}</h2><p>この6体を前提に選出と対面ランキングを計算する。</p></div>{teams.length > 1 && <label>使用するチーム<select value={selectedTeam.id} onChange={(event) => onSelectTeam(Number(event.target.value))}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}<div className="active-team-members">{selectedTeam.members.map((member, index) => <MonsterTile key={member.id} mon={member} index={index} compact />)}</div><button onClick={onManageTeams}>マイチームを管理</button></section>
    <div className="battle-flow"><span className={hasOpponentTeam ? "done" : ""}>1<small>相手6体・任意</small></span><i></i><span className={hasOpponentTeam ? "done" : ""}>2<small>{pickCount}体を選出</small></span><i></i><span className={enemyLead ? "done" : ""}>3<small>現在の相手</small></span></div>
    <div className="battle-layout"><section className="panel opponent-panel"><div className="panel-head"><div><small>OPPONENT BATTLE TEAM</small><h2>相手バトルチーム6体</h2></div><span>任意入力</span></div><p className="field-hint">文字を入力して候補から選択する。未入力でもSTEP 3は利用できる。</p><div className="opponent-grid">{opponents.map((value, i) => <div className="opponent-search-row" key={i}><span>{i + 1}</span><PokemonSearchSelect value={value} master={master} onChange={(name) => { const next = [...opponents]; next[i] = name; setOpponents(next); }} placeholder="ポケモンを検索" ariaLabel={"相手ポケモン " + (i + 1)} /></div>)}</div></section>
      <section className="panel selection-panel"><div className="panel-head"><div><small>RECOMMENDED PICK</small><h2>{hasOpponentTeam ? "この" + pickCount + "体がおすすめ" : "相手6体を選ぶと選出を提案"}</h2></div></div>{hasOpponentTeam ? selection.map((picked, i) => <div className={"selection-row " + (i === 0 ? "best" : "")} key={picked.mon.id}><span className={"rank rank-" + (i + 1)}>{i + 1}</span><MonsterTile mon={picked.mon} index={i} compact /><p>{picked.advantages.length ? picked.advantages.join("・") : "タイプ相性と能力値を評価"}</p></div>) : <p className="field-hint">相手の6体が分かる場合だけ入力する。対面ランキングは下で独立して利用できる。</p>}</section>
    </div>
    <section className="lead-panel step3-panel"><div><small>STEP 03 / CURRENT MATCHUP</small><h2>相手のポケモンは？</h2><p>STEP 2の選出に関係なく、マイチーム6体を現在の相手への相性順に並べる。</p></div><PokemonSearchSelect value={enemyLead} master={master} onChange={setEnemyLead} placeholder="相手ポケモンを検索" ariaLabel="現在対面している相手ポケモン" />
      <div className="step3-team-grid">{selectedTeam.members.map((member, index) => <MonsterTile key={member.id} mon={member} index={index} compact />)}</div>
      {lead && <div className="lead-result lead-ranking">{lead.map((ranked, i) => <div className="selection-row" key={ranked.mon.id}><span className={"rank rank-" + (i + 1)}>{i + 1}</span><MonsterTile mon={ranked.mon} index={i} compact /><p><strong>{i === 0 ? "最もおすすめ" : "次の候補"}</strong>{ranked.reasons.length ? ranked.reasons.join("・") : "タイプ相性と能力値を総合評価"}</p></div>)}</div>}
      {enemyLead && !lead && <p className="lead-unavailable">候補からポケモンを選択すると、6体の相性順位を表示する。</p>}
    </section>
  </section>;
}

function SettingsPanel`;

if (!battlePanelPattern.test(source)) throw new Error("Could not patch BattlePanel. The source structure has changed.");
source = source.replace(battlePanelPattern, battlePanelReplacement);

const cssMarker = "/* searchable battle Pokémon picker */";
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.pokemon-combobox { position: relative; min-width: 0; }\n.pokemon-combobox input { width: 100%; padding-right: 2.4rem; }\n.pokemon-combobox-clear { position: absolute; right: .55rem; top: 50%; translate: 0 -50%; border: 0; background: transparent; color: #6b7280; font-size: 1.05rem; cursor: pointer; }\n.pokemon-combobox-list { position: absolute; z-index: 50; top: calc(100% + .35rem); left: 0; right: 0; max-height: 18rem; overflow: auto; padding: .35rem; border: 1px solid #d7ddd8; border-radius: .8rem; background: #fff; box-shadow: 0 14px 35px rgba(22, 35, 29, .16); }\n.pokemon-combobox-list button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .75rem; padding: .65rem .75rem; border: 0; border-radius: .55rem; background: transparent; text-align: left; cursor: pointer; }\n.pokemon-combobox-list button:hover, .pokemon-combobox-list button[aria-selected=\"true\"] { background: #eef8f1; }\n.pokemon-combobox-list small { color: #6b7280; white-space: nowrap; }\n.pokemon-combobox-list p { margin: 0; padding: .75rem; color: #6b7280; }\n.opponent-search-row { display: grid; grid-template-columns: 2rem minmax(0, 1fr); align-items: center; gap: .55rem; }\n.opponent-search-row > span { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 999px; background: #eef8f1; font-weight: 800; }\n.step3-panel > .pokemon-combobox { width: min(100%, 30rem); }\n.step3-team-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; margin-top: 1rem; }\n@media (max-width: 760px) { .step3-team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }\n`;
}

fs.writeFileSync(workspacePath, source);
fs.writeFileSync(cssPath, css);
console.log("Applied searchable battle Pokémon inputs and independent STEP 3 ranking.");
