"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { demoState } from "../lib/demo-data";
import type { AppState, BattleFormat, MasterEntry, OwnedItem, RosterEntry, Stats } from "../lib/types";

type Tab = "home" | "roster" | "items" | "build" | "battle" | "settings";

const tabMeta: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "ホーム", icon: "⌂" },
  { id: "roster", label: "手持ち", icon: "◈" },
  { id: "items", label: "持ち物", icon: "▣" },
  { id: "build", label: "パーティー構築", icon: "◇" },
  { id: "battle", label: "対戦ナビ", icon: "◎" },
  { id: "settings", label: "アカウント", icon: "○" },
];

const emptyStats: Stats = { hp: 80, attack: 80, defense: 80, spAttack: 80, spDefense: 80, speed: 80 };
const emptyRoster = (): RosterEntry => ({ id: 0, species: "", nickname: "", types: "", ability: "", heldItem: "", nature: "", form: "", megaEvolution: false, moves: ["", "", "", ""], stats: { ...emptyStats }, notes: "" });
const userError = "エラーが発生しました。";
function numberScore(mon: RosterEntry) {
  const s = mon.stats;
  const offense = Math.max(s.attack, s.spAttack);
  const bulk = s.hp * .35 + s.defense * .325 + s.spDefense * .325;
  return offense * .32 + bulk * .35 + s.speed * .23 + (mon.megaEvolution ? 8 : 0);
}

function createSuggestions(roster: RosterEntry[], format: BattleFormat) {
  const variants = [
    { title: "総合おすすめ", tone: "タイプと能力値の偏りを抑える", profile: "balanced" },
    { title: "打点を確保", tone: "攻撃・特攻・素早さを優先", profile: "offense" },
    { title: "安定した構成", tone: "耐久力とタイプの分散を優先", profile: "bulk" },
  ] as const;
  return variants.map((variant) => {
    const scoreFor = (mon: RosterEntry) => {
      const stats = mon.stats;
      const offense = Math.max(stats.attack, stats.spAttack);
      const bulk = stats.hp * .35 + stats.defense * .325 + stats.spDefense * .325;
      if (variant.profile === "offense") return offense * .48 + stats.speed * .38 + bulk * .14 + (mon.megaEvolution ? 8 : 0);
      if (variant.profile === "bulk") return bulk * .55 + offense * .23 + stats.speed * .12 + (mon.megaEvolution ? 8 : 0);
      return numberScore(mon);
    };
    const sorted = [...roster].sort((a, b) => scoreFor(b) - scoreFor(a));
    const picked: RosterEntry[] = [];
    const usedTypes = new Set<string>();
    for (const mon of sorted) {
      const newTypes = mon.types.split(/[・/]/).filter((t) => t && !usedTypes.has(t));
      if (picked.length < 6 && (newTypes.length || picked.length >= 4)) {
        picked.push(mon);
        mon.types.split(/[・/]/).forEach((t) => usedTypes.add(t));
      }
    }
    for (const mon of sorted) if (picked.length < 6 && !picked.includes(mon)) picked.push(mon);
    const avg = picked.length ? Math.round(picked.reduce((sum, mon) => sum + scoreFor(mon), 0) / picked.length) : 0;
    return { ...variant, members: picked.slice(0, 6), score: Math.min(99, Math.round(avg / 1.4)), reason: reasonFor(variant.profile, format, picked) };
  });
}

function reasonFor(profile: "balanced" | "offense" | "bulk", format: BattleFormat, members: RosterEntry[]) {
  if (profile === "offense") return "攻撃・特攻と素早さが高いポケモンを中心に、先に有利な盤面を作れる6体を選んだ。";
  if (profile === "bulk") return "HP・防御・特防を重視し、タイプが偏りにくい6体を選んだ。長い試合でも交代先を確保しやすい。";
  return `攻撃・受け・補助を混ぜ、タイプを${new Set(members.flatMap((m) => m.types.split(/[・/]/))).size}種類確保。初見の相手にも対応しやすい。`;
}

function activeRegulation(state: AppState) {
  return state.master.find((entry) => entry.category === "regulation" && Boolean(entry.data?.active));
}

function eligibleRoster(state: AppState) {
  const regulation = activeRegulation(state);
  if (!regulation) return state.roster;
  const allowedPokemonIds = state.masterRelations
    .filter((relation) => relation.sourceId === regulation.id && relation.kind === "allows_pokemon")
    .map((relation) => relation.targetId);
  const allowedFormIds = state.masterRelations
    .filter((relation) => relation.sourceId === regulation.id && relation.kind === "allows_form")
    .map((relation) => relation.targetId);
  if (!allowedPokemonIds.length && !allowedFormIds.length) return state.roster;
  const allowedPokemonNames = new Set(state.master.filter((entry) => allowedPokemonIds.includes(entry.id)).map((entry) => entry.name));
  const allowedFormNames = new Set(state.master.filter((entry) => allowedFormIds.includes(entry.id)).map((entry) => entry.name));
  return state.roster.filter((mon) => allowedPokemonNames.has(mon.species) && (!mon.form || allowedFormNames.has(mon.form)));
}

function regulationPickCount(state: AppState, format: BattleFormat) {
  const regulation = activeRegulation(state);
  const configured = Number(regulation?.data?.[format === "single" ? "singlePickCount" : "doublePickCount"]);
  return Number.isInteger(configured) && configured >= 1 && configured <= 6
    ? configured
    : format === "single" ? 3 : 4;
}

type MasterMaps = {
  pokemonByName: Map<string, MasterEntry>;
  typeByName: Map<string, MasterEntry>;
};

type DirectMatchup = {
  score: number;
  bestOffense: number;
  worstIncoming: number;
  reasons: string[];
};

function splitTypes(value: string) {
  return value.split(/[・/]/).map((type) => type.trim()).filter(Boolean);
}

function createMasterMaps(master: MasterEntry[]): MasterMaps {
  return {
    pokemonByName: new Map(master.filter((entry) => entry.category === "pokemon" || entry.category === "form").map((entry) => [entry.name, entry])),
    typeByName: new Map(master.filter((entry) => entry.category === "type").map((entry) => [entry.name, entry])),
  };
}

function combinedTypeMultiplier(attackType: string, defenseTypes: string[], maps: MasterMaps, relations: AppState["masterRelations"]) {
  const attack = maps.typeByName.get(attackType);
  if (!attack || !defenseTypes.length) return 1;
  return defenseTypes.reduce((multiplier, defenseType) => {
    const defense = maps.typeByName.get(defenseType);
    if (!defense) return multiplier;
    const relation = relations.find((candidate) =>
      candidate.kind === "type_effectiveness" && candidate.sourceId === attack.id && candidate.targetId === defense.id,
    );
    return multiplier * Number(relation?.data?.multiplier ?? 1);
  }, 1);
}

function directMatchup(mon: RosterEntry, opponent: MasterEntry, maps: MasterMaps, relations: AppState["masterRelations"]): DirectMatchup {
  const opponentTypes = splitTypes(opponent.type);
  const monTypes = splitTypes(mon.types);
  const bestOffense = monTypes.length
    ? Math.max(...monTypes.map((type) => combinedTypeMultiplier(type, opponentTypes, maps, relations)))
    : 1;
  const worstIncoming = opponentTypes.length
    ? Math.max(...opponentTypes.map((attackType) => combinedTypeMultiplier(attackType, monTypes, maps, relations)))
    : 1;
  let score = 0;
  if (bestOffense >= 4) score += 60;
  else if (bestOffense >= 2) score += 36;
  else if (bestOffense >= 1) score += 8;
  else if (bestOffense > 0) score -= 18;
  else score -= 30;
  if (worstIncoming <= 0.25) score += 32;
  else if (worstIncoming <= 0.5) score += 22;
  else if (worstIncoming <= 1) score += 8;
  else if (worstIncoming <= 2) score -= 18;
  else score -= 32;
  const reasons: string[] = [];
  if (bestOffense >= 4) reasons.push("4倍弱点を突ける");
  else if (bestOffense >= 2) reasons.push("弱点を突ける");
  else if (!monTypes.length) reasons.push("自分のタイプが未登録");
  if (worstIncoming <= 0.5) reasons.push("相手の主要タイプを半減以下にできる");
  else if (worstIncoming >= 2) reasons.push("相手の主要タイプを受けにくい");
  return { score, bestOffense, worstIncoming, reasons };
}

function chooseBattleTeam(
  party: RosterEntry[],
  opponents: string[],
  count: number,
  master: MasterEntry[],
  relations: AppState["masterRelations"],
) {
  const maps = createMasterMaps(master);
  const knownOpponents = opponents.map((name) => maps.pokemonByName.get(name.trim())).filter((entry): entry is MasterEntry => Boolean(entry));
  return [...party]
    .map((mon) => {
      const matchups = knownOpponents.map((opponent) => directMatchup(mon, opponent, maps, relations));
      const superEffective = matchups.filter((matchup) => matchup.bestOffense >= 2).length;
      const safeMatchups = matchups.filter((matchup) => matchup.worstIncoming <= 0.5).length;
      const score = numberScore(mon) * 0.12 + matchups.reduce((sum, matchup) => sum + matchup.score, 0);
      const advantages: string[] = [];
      if (superEffective) advantages.push(`${superEffective}体の弱点を突ける`);
      if (safeMatchups) advantages.push(`${safeMatchups}体に有利な耐性`);
      if (!knownOpponents.length) advantages.push("相手のタイプ情報が未登録");
      if (mon.stats.hp + mon.stats.defense + mon.stats.spDefense >= 270) advantages.push("選出の安定性");
      return { mon, score, advantages };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

function recommendAgainstLead(
  selection: ReturnType<typeof chooseBattleTeam>,
  enemyLead: string,
  master: MasterEntry[],
  relations: AppState["masterRelations"],
) {
  const maps = createMasterMaps(master);
  const opponent = maps.pokemonByName.get(enemyLead.trim());
  if (!opponent) return undefined;
  return selection
    .map(({ mon }) => {
      const matchup = directMatchup(mon, opponent, maps, relations);
      return { mon, score: matchup.score + numberScore(mon) * 0.12, reasons: matchup.reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export default function Workspace({ mode, identity }: { mode: "live" | "demo"; identity: { displayName: string; email: string } }) {
  const [state, setState] = useState<AppState>(() => mode === "demo" ? demoState : {
    ...demoState,
    user: { ...demoState.user, id: 0, email: identity.email, displayName: identity.displayName, handle: identity.email.split("@")[0], role: "user" },
    roster: [],
    items: [],
  });
  const [loading, setLoading] = useState(mode === "live");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(mode === "demo" ? "体験版：変更はこの画面を閉じると消える" : "");
  const [tab, setTab] = useState<Tab>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [rosterEditor, setRosterEditor] = useState<RosterEntry | null>(null);
  const [itemEditor, setItemEditor] = useState<OwnedItem | null>(null);
  const [format, setFormat] = useState<BattleFormat>(demoState.user.preferredFormat);
  const [opponents, setOpponents] = useState(["カイリュー", "サーフゴー", "アシレーヌ", "ゴリランダー", "ガブリアス", "ウルガモス"]);
  const [enemyLead, setEnemyLead] = useState("カイリュー");
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [previewAsUser, setPreviewAsUser] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const refresh = async () => {
    if (mode === "demo") return;
    setLoading(true);
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(userError);
      setState(data);
      setFormat(data.user.preferredFormat);
    } catch (e) {
      console.error("Failed to load application state", e);
      setError(userError);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (mode === "demo") return;
    let active = true;
    fetch("/api/state", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(userError);
        return data as AppState;
      })
      .then((data) => {
        if (!active) return;
        setState(data);
        setFormat(data.user.preferredFormat);
      })
      .catch((e: unknown) => {
        console.error("Failed to load application state", e);
        if (active) setError(userError);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode]);

  useEffect(() => {
    if (!mobileNav) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNav]);

  const mutate = async (action: string, payload: Record<string, unknown>, optimistic?: () => void) => {
    setError("");
    if (mode === "demo") {
      optimistic?.();
      setNotice("体験版のデータを更新した");
      window.setTimeout(() => setNotice("体験版：変更はこの画面を閉じると消える"), 1800);
      return true;
    }
    try {
      const response = await fetch("/api/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, payload }) });
      const data = await response.json();
      if (!response.ok) throw new Error(userError);
      if (data.signOut) window.location.href = data.signOut;
      else await refresh();
      setNotice("保存した");
      window.setTimeout(() => setNotice(""), 1800);
      return true;
    } catch (e) {
      console.error("Failed to save application state", e);
      setError(userError);
      return false;
    }
  };

  const saveBattleFormat = async (nextFormat: BattleFormat) => {
    const previousFormat = format;
    setFormat(nextFormat);
    setState((current) => ({
      ...current,
      user: { ...current.user, preferredFormat: nextFormat },
    }));
    if (mode === "demo") {
      setNotice("体験版の対戦設定を変更した");
      window.setTimeout(() => setNotice("体験版：変更はこの画面を閉じると消える"), 1800);
      return;
    }
    setSavingPreferences(true);
    try {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save-profile", payload: { preferredFormat: nextFormat } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(userError);
      setState((current) => ({ ...current, user: { ...current.user, ...data.saved } }));
      setNotice("対戦設定を保存した");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (e) {
      setFormat(previousFormat);
      setState((current) => ({
        ...current,
        user: { ...current.user, preferredFormat: previousFormat },
      }));
      console.error("Failed to save battle format", e);
      setError(userError);
    } finally {
      setSavingPreferences(false);
    }
  };

  const availableRoster = useMemo(() => eligibleRoster(state), [state]);
  const pickCount = useMemo(() => regulationPickCount(state, format), [state, format]);
  const suggestions = useMemo(() => createSuggestions(availableRoster, format), [availableRoster, format]);
  const battleParty = suggestions[selectedSuggestion]?.members ?? [];
  const selection = useMemo(
    () => chooseBattleTeam(battleParty, opponents, pickCount, state.master, state.masterRelations),
    [battleParty, opponents, pickCount, state.master, state.masterRelations],
  );
  const lead = useMemo(
    () => recommendAgainstLead(selection, enemyLead, state.master, state.masterRelations),
    [selection, enemyLead, state.master, state.masterRelations],
  );

  const isAdmin = state.user.role === "admin";
  const visibleRole: "admin" | "user" = isAdmin && !previewAsUser ? "admin" : "user";
  const nav = tabMeta.filter((item) => item.id !== "settings");
  const toggleRolePreview = () => {
    const next = !previewAsUser;
    setPreviewAsUser(next);
  };

  return (
    <main className="app-shell">
      <aside id="workspace-navigation" className={`side-nav ${mobileNav ? "open" : ""}`}>
        <Link className="brand app-brand" href="/"><span className="brand-mark">CL</span><span>CHAMPIONS<br />LAB</span></Link>
        <nav aria-label="アプリメニュー">
          {nav.map((item) => (
            <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setMobileNav(false); }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          {visibleRole === "admin" && (
            <Link className="admin-nav-link" href="/admin" onClick={() => setMobileNav(false)}>
              <span>⚙</span>
              <span>マスターデータ管理</span>
              <small>↗</small>
            </Link>
          )}
        </nav>
        <div className="side-help"><span>?</span><div><strong>困ったときは</strong><small>用語ガイドを確認</small></div></div>
        <button
          type="button"
          className={`profile-mini ${tab === "settings" ? "active" : ""}`}
          onClick={() => { setTab("settings"); setMobileNav(false); }}
          aria-label="アカウント設定を開く"
          aria-current={tab === "settings" ? "page" : undefined}
        >
          <span>{state.user.displayName.slice(0, 1)}</span>
          <div>
            <strong>{state.user.displayName}</strong>
            <small>@{state.user.handle}</small>
            {visibleRole === "admin" && <em className="admin-badge">管理者</em>}
          </div>
        </button>
      </aside>
      {mobileNav && <button type="button" className="mobile-nav-backdrop" onClick={() => setMobileNav(false)} aria-label="メニューを閉じる" />}

      <section className="app-main">
        <header className="app-top">
          <button className="menu-button" onClick={() => setMobileNav((v) => !v)} aria-label={mobileNav ? "メニューを閉じる" : "メニューを開く"} aria-expanded={mobileNav} aria-controls="workspace-navigation">☰</button>
          <div><p>BEGINNER SUPPORT MODE</p><strong>{tabMeta.find((item) => item.id === tab)?.label}</strong></div>
          <div className="top-actions">
            {mode === "demo" && <a href="/signin-with-chatgpt?return_to=%2Fapp" className="small-primary">無料で保存する</a>}
            {isAdmin && (
              <button
                className={`role-preview-toggle ${previewAsUser ? "previewing" : ""}`}
                type="button"
                onClick={toggleRolePreview}
                aria-pressed={previewAsUser}
              >
                {previewAsUser ? "管理者表示に戻る" : "一般ユーザー表示"}
              </button>
            )}
            {visibleRole === "admin" && <span className="admin-status" aria-label="管理者としてログイン中">管理者</span>}
            <label className="global-setting">
              <span>対戦形式</span>
              <select value={format} disabled={loading || savingPreferences} onChange={(event) => void saveBattleFormat(event.target.value as BattleFormat)}>
                <option value="single">シングル</option>
                <option value="double">ダブル</option>
              </select>
            </label>
          </div>
        </header>

        {previewAsUser && (
          <div className="role-preview-banner" role="status">
            一般ユーザーとしての表示を確認中
            <button type="button" onClick={toggleRolePreview}>管理者表示に戻る</button>
          </div>
        )}
        {notice && <div className="notice" role="status">{notice}</div>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
        {loading ? <Loading /> : (
          <div className="app-content">
            {tab === "home" && <Dashboard state={state} onGo={setTab} suggestions={suggestions} />}
            {tab === "roster" && <RosterPanel roster={state.roster} onEdit={setRosterEditor} onDelete={(id) => void mutate("delete-roster", { id }, () => setState((s) => ({ ...s, roster: s.roster.filter((m) => m.id !== id) })))} />}
            {tab === "items" && <ItemsPanel items={state.items} onEdit={setItemEditor} onDelete={(id) => void mutate("delete-item", { id }, () => setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) })))} />}
            {tab === "build" && <BuildPanel roster={availableRoster} format={format} pickCount={pickCount} suggestions={suggestions} selected={selectedSuggestion} setSelected={setSelectedSuggestion} onRoster={() => setTab("roster")} />}
            {tab === "battle" && <BattlePanel format={format} pickCount={pickCount} opponents={opponents} setOpponents={setOpponents} selection={selection} enemyLead={enemyLead} setEnemyLead={setEnemyLead} lead={lead} onRoster={() => setTab("roster")} />}
            {tab === "settings" && <SettingsPanel state={state} visibleRole={visibleRole} format={format} mode={mode} onSave={(payload) => void mutate("save-profile", payload, () => setState((s) => ({ ...s, user: { ...s.user, ...payload } })))} onDelete={() => void mutate("delete-account", {}, () => { window.location.href = "/"; })} />}
          </div>
        )}
      </section>

      {rosterEditor && <RosterModal value={rosterEditor} master={state.master} masterRelations={state.masterRelations} onClose={() => setRosterEditor(null)} onSave={async (value) => {
        const ok = await mutate("save-roster", value as unknown as Record<string, unknown>, () => setState((s) => ({ ...s, roster: value.id ? s.roster.map((m) => m.id === value.id ? value : m) : [...s.roster, { ...value, id: Math.max(0, ...s.roster.map((m) => m.id)) + 1 }] })));
        if (ok) setRosterEditor(null);
      }} />}
      {itemEditor && <ItemModal value={itemEditor} master={state.master} onClose={() => setItemEditor(null)} onSave={async (value) => {
        const ok = await mutate("save-item", value as unknown as Record<string, unknown>, () => setState((s) => ({ ...s, items: value.id ? s.items.map((i) => i.id === value.id ? value : i) : [...s.items, { ...value, id: Math.max(0, ...s.items.map((i) => i.id)) + 1 }] })));
        if (ok) setItemEditor(null);
      }} />}
      {tab === "roster" && <button className="floating-add" onClick={() => setRosterEditor(emptyRoster())}>＋ ポケモンを登録</button>}
      {tab === "items" && <button className="floating-add" onClick={() => setItemEditor({ id: 0, name: "", quantity: 1, notes: "" })}>＋ 持ち物を登録</button>}
    </main>
  );
}

function Loading() { return <div className="loading-panel"><span></span><p>あなたのデータを準備している…</p></div>; }

function Dashboard({ state, onGo, suggestions }: { state: AppState; onGo: (tab: Tab) => void; suggestions: ReturnType<typeof createSuggestions> }) {
  return (
    <>
      <section className="welcome-row">
        <div><p className="eyebrow">TODAY&apos;S BATTLE PLAN</p><h1>こんにちは、{state.user.displayName}。</h1><p>次にやることを1つだけ選べば、対戦まで案内する。</p></div>
        <div className="level-card"><span>準備レベル</span><strong>{state.roster.length >= 6 ? "3" : state.roster.length ? "2" : "1"}<small>/ 3</small></strong><p>{state.roster.length >= 6 ? "構築を提案できる状態" : `あと${Math.max(0, 6 - state.roster.length)}体で構築を提案`}</p></div>
      </section>
      <section className="next-step-card">
        <span className="big-step">01</span>
        <div><small>NEXT STEP</small><h2>{state.roster.length < 6 ? "まずは手持ちを6体登録しよう" : "構築候補を比べよう"}</h2><p>{state.roster.length < 6 ? "分からない項目は空欄でもよい。ポケモン名から少しずつ登録できる。" : "能力値とタイプの評価軸が異なる3案を用意した。理由を見比べて選べる。"}</p></div>
        <button onClick={() => onGo(state.roster.length < 6 ? "roster" : "build")}>{state.roster.length < 6 ? "手持ちを登録" : "構築を見る"} <span>→</span></button>
      </section>
      <div className="dashboard-grid">
        <section className="panel party-summary">
          <div className="panel-head"><div><small>MY ROSTER</small><h2>登録したポケモン</h2></div><button onClick={() => onGo("roster")}>すべて見る</button></div>
          <div className="dashboard-mon-grid">
            {state.roster.slice(0, 6).map((mon, index) => <MonsterTile key={mon.id} mon={mon} index={index} compact />)}
            {Array.from({ length: Math.max(0, 6 - state.roster.length) }).map((_, i) => <button className="empty-mon" key={i} onClick={() => onGo("roster")}>＋<small>未登録</small></button>)}
          </div>
        </section>
        <section className="panel quick-plan">
          <div className="panel-head"><div><small>QUICK ANALYSIS</small><h2>いまの構築傾向</h2></div><span className="score-ring">{suggestions[0]?.score ?? 0}</span></div>
          <div className="trend-bars"><div><span>攻撃力</span><b style={{ "--trend": "82%" } as React.CSSProperties}></b></div><div><span>耐久力</span><b style={{ "--trend": "68%" } as React.CSSProperties}></b></div><div><span>扱いやすさ</span><b style={{ "--trend": "88%" } as React.CSSProperties}></b></div></div>
          <p className="beginner-note"><span>!</span><strong>初心者へのヒント</strong><br />役割が重ならない6体を選ぶと、相手に合わせて選出しやすくなる。</p>
        </section>
      </div>
    </>
  );
}

function MonsterTile({ mon, index, compact = false }: { mon: RosterEntry; index: number; compact?: boolean }) {
  const colors = ["mint", "gold", "blue", "green", "coral", "violet"];
  return <div className={`monster-tile ${compact ? "compact" : ""}`}><span className={`creature ${colors[index % colors.length]}`}>{mon.species.slice(0, 1)}</span><div><strong>{mon.nickname || mon.form || mon.species}</strong><small>{mon.form && mon.nickname ? `${mon.form}・` : ""}{mon.types || "タイプ未登録"}</small>{!compact && mon.megaEvolution && <em>Mega Evolution</em>}</div></div>;
}

function RosterPanel({ roster, onEdit, onDelete }: { roster: RosterEntry[]; onEdit: (m: RosterEntry) => void; onDelete: (id: number) => void }) {
  return <section><PageTitle eyebrow="MY ROSTER" title="手持ちポケモン" copy="分かる項目だけで登録可能。あとからいつでも詳しくできる。" count={`${roster.length}体`} />
    <div className="roster-grid">{roster.map((mon, i) => <article className="roster-card" key={mon.id}><MonsterTile mon={mon} index={i} /><div className="chip-row"><span>{mon.ability || "特性未登録"}</span><span>{mon.heldItem || "持ち物なし"}</span><span>{mon.nature || "性格未登録"}</span></div><div className="move-list">{mon.moves.filter(Boolean).map((move) => <span key={move}>{move}</span>)}</div><div className="card-actions"><button onClick={() => onEdit(mon)}>編集</button><button className="danger-link" onClick={() => onDelete(mon.id)}>削除</button></div></article>)}</div>
    {!roster.length && <EmptyState title="まだ手持ちが登録されていない" copy="右下の「ポケモンを登録」から、名前だけでも追加できる。" />}</section>;
}

function ItemsPanel({ items, onEdit, onDelete }: { items: OwnedItem[]; onEdit: (i: OwnedItem) => void; onDelete: (id: number) => void }) {
  return <section><PageTitle eyebrow="OWNED ITEMS" title="持ち物リスト" copy="利用できる持ち物と個数を登録すると、重複を避けて構築を提案する。" count={`${items.reduce((s, i) => s + i.quantity, 0)}個`} />
    {!!items.length && <div className="item-table">{items.map((item) => <article key={item.id}><span className="item-icon">▣</span><div><strong>{item.name}</strong><small>{item.notes || "メモなし"}</small></div><b>× {item.quantity}</b><button onClick={() => onEdit(item)}>編集</button><button className="danger-link" onClick={() => onDelete(item.id)}>削除</button></article>)}</div>}
    {!items.length && <EmptyState title="持ち物が登録されていない" copy="持っている数を登録すると、同じ持ち物の使いすぎを防げる。" />}</section>;
}

function BuildPanel({ roster, format, pickCount, suggestions, selected, setSelected, onRoster }: { roster: RosterEntry[]; format: BattleFormat; pickCount: number; suggestions: ReturnType<typeof createSuggestions>; selected: number; setSelected: (v: number) => void; onRoster: () => void }) {
  const ready = roster.length >= 6;
  return <section>
    <PageTitle
      eyebrow="PARTY BUILDER"
      title="パーティー構築"
      copy={ready ? "上部で選んだ対戦形式に合わせて3案を提案する。構築候補を1つ選ぶと、対戦ナビはその6体から選出する。" : "上部の対戦形式に合わせ、手持ちが6体そろったら構築を提案する。"}
      count={format === "single" ? "シングル" : "ダブル"}
    />
    {!ready ? (
      <EmptyState title={`あと${6 - roster.length}体登録すると提案できる`} copy="対戦形式は画面上部からいつでも変更できる。技やステータスは後からでもよい。" action="手持ちを登録" onAction={onRoster} />
    ) : (
      <>
        <div className="suggestion-tabs">{suggestions.map((s, i) => <button key={`${s.title}-${i}`} className={selected === i ? "active" : ""} onClick={() => setSelected(i)}><small>PLAN {String(i + 1).padStart(2, "0")}</small><strong>{s.title}</strong><span>{s.tone}</span><b>{s.score}<em>/100</em></b></button>)}</div>
        {suggestions[selected] && <article className="suggestion-detail"><div className="suggestion-heading"><div><span className="recommend-badge">{selected === 0 ? "現在の構築候補" : "別の構築候補"}</span><h2>{suggestions[selected].title}パーティー</h2></div><p><span>?</span><strong>この提案の理由</strong>{suggestions[selected].reason}</p></div><div className="suggested-party">{suggestions[selected].members.map((mon, i) => <MonsterTile key={mon.id} mon={mon} index={i} />)}</div><div className="beginner-explain"><strong>使い方の目安</strong><span>① 相手の6体を見る</span><span>② 対戦ナビで{pickCount}体を選ぶ</span><span>③ 相手の先発に応じた順位を見る</span><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>この構築候補を使う ✓</button></div></article>}
      </>
    )}
  </section>;
}

function BattlePanel({ format, pickCount, opponents, setOpponents, selection, enemyLead, setEnemyLead, lead, onRoster }: { format: BattleFormat; pickCount: number; opponents: string[]; setOpponents: (v: string[]) => void; selection: ReturnType<typeof chooseBattleTeam>; enemyLead: string; setEnemyLead: (v: string) => void; lead?: ReturnType<typeof recommendAgainstLead>; onRoster: () => void }) {
  const settingLabel = format === "single" ? "シングル" : "ダブル";
  if (!selection.length) return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="相手の情報から、選出と先発を順番に提案する。" count={settingLabel} /><EmptyState title="まず手持ちを登録しよう" copy="選べるポケモンがないため、まだ提案を作れない。" action="手持ちを登録" onAction={onRoster} /></section>;
  return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="相手パーティーのポケモン名を入力すると、ポケモン図鑑マスターのタイプと自分の6体のタイプ・ステータスだけで選出を提案する。" count={settingLabel} />
    <div className="battle-flow"><span className="done">1<small>相手の6体</small></span><i></i><span className="done">2<small>{pickCount}体を選出</small></span><i></i><span>3<small>先発を決定</small></span></div>
    <div className="battle-layout"><section className="panel opponent-panel"><div className="panel-head"><div><small>OPPONENT PARTY</small><h2>相手ポケモン6体</h2></div><span>名前だけ入力</span></div><p className="field-hint">タイプはポケモン図鑑マスターから自動で照合する。メガ進化が判明した場合は「メガ◯◯」を入力する。</p><div className="opponent-grid">{opponents.map((value, i) => <label key={i}><span>{i + 1}</span><input value={value} onChange={(e) => { const next = [...opponents]; next[i] = e.target.value; setOpponents(next); }} placeholder="ポケモン名" /></label>)}</div></section>
      <section className="panel selection-panel"><div className="panel-head"><div><small>RECOMMENDED PICK</small><h2>この{pickCount}体がおすすめ</h2></div><span className="score-ring small">{Math.min(99, 78 + selection[0].advantages.length * 4)}</span></div>{selection.map((picked, i) => <div className={`selection-row ${i === 0 ? "best" : ""}`} key={picked.mon.id}><span className={`rank rank-${i + 1}`}>{i + 1}</span><MonsterTile mon={picked.mon} index={i} compact /><p>{picked.advantages.length ? picked.advantages.join("・") : "総合力と役割の安定性"}<small>{i === 0 ? "中心に選びたい" : "相手に応じて活躍"}</small></p></div>)}<p className="reason-card"><span>?</span><strong>選出理由</strong>相手への有効打と受け先を両立し、苦手な相手が重なりにくい{pickCount}体を優先した。</p></section>
    </div>
    <section className="lead-panel"><div><small>STEP 03 / RESPONSE</small><h2>相手が最初に出したポケモンは？</h2><p>選出済みの{pickCount}体を、相手ポケモンのタイプへの有利さとステータスで全順位表示する。</p></div><input value={enemyLead} onChange={(e) => setEnemyLead(e.target.value)} placeholder="相手が出したポケモン名" />{lead && <div className="lead-result lead-ranking">{lead.map((ranked, i) => <div className="selection-row" key={ranked.mon.id}><span className={`rank rank-${i + 1}`}>{i + 1}</span><MonsterTile mon={ranked.mon} index={i} compact /><p><strong>{i === 0 ? "最もおすすめ" : "次の候補"}</strong>{ranked.reasons.length ? ranked.reasons.join("・") : "タイプ相性とステータスを総合評価"}</p></div>)}</div>}{enemyLead && !lead && <p className="lead-unavailable">ポケモン図鑑マスターにある名称で入力すると、タイプ相性を評価できる。</p>}</section>
  </section>;
}

function SettingsPanel({ state, visibleRole, format, mode, onSave, onDelete }: { state: AppState; visibleRole: "admin" | "user"; format: BattleFormat; mode: "live" | "demo"; onSave: (payload: Record<string, unknown>) => void; onDelete: () => void }) {
  const [name, setName] = useState(state.user.displayName);
  const [handle, setHandle] = useState(state.user.handle);
  const [handleStatus, setHandleStatus] = useState<"checking" | "available" | "taken" | "invalid" | "error">("available");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const normalizedHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const handleFormatValid = /^[a-z0-9_-]{3,24}$/.test(normalizedHandle);
  const handleUnchanged = normalizedHandle === state.user.handle;

  useEffect(() => {
    const normalized = handle.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_-]{3,24}$/.test(normalized) || normalized === state.user.handle) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (mode === "demo") {
        setHandleStatus("available");
        return;
      }
      try {
        const response = await fetch("/api/state", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "check-handle", payload: { handle: normalized } }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(userError);
        setHandleStatus(data.available ? "available" : data.reason === "format" ? "invalid" : "taken");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHandleStatus("error");
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [handle, mode, state.user.handle]);

  const effectiveHandleStatus = !handleFormatValid ? "invalid" : handleUnchanged ? "available" : handleStatus;
  const handleMessage = {
    checking: "使用できるか確認中…",
    available: handleUnchanged ? "現在のユーザー名である。" : "このユーザー名は使用できる。",
    taken: "このユーザー名は既に使用されている。",
    invalid: "英小文字・数字・_・-で3〜24文字入力する必要がある。",
    error: "使用可否を確認できなかった。時間を置いて再入力してほしい。",
  }[effectiveHandleStatus];

  return <section><PageTitle eyebrow="ACCOUNT" title="アカウント設定" copy="表示名、ユーザー名と対戦形式を確認・変更できる。" />
    <div className="settings-grid"><section className="panel settings-card"><div className="settings-heading"><h2>プロフィール</h2><span className={`role-status ${visibleRole}`}>{visibleRole === "admin" ? "管理者アカウント" : "一般アカウント"}</span></div><label>表示名<input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label><label>ユーザー名<input value={handle} maxLength={24} onChange={(e) => { setHandle(e.target.value.replace(/^@/, "").toLowerCase()); setHandleStatus("checking"); }} autoCapitalize="none" aria-describedby="handle-availability" /><small id="handle-availability" className={`field-hint handle-${effectiveHandleStatus}`} aria-live="polite">{handleMessage}</small></label><label>メールアドレス<input type="email" value={state.user.email} disabled /><small className="field-hint">ChatGPTアカウントから取得するため、このサービス内では変更できない。</small></label><button className="form-primary" disabled={!name.trim() || effectiveHandleStatus !== "available"} onClick={() => onSave({ displayName: name, handle })}>変更を保存</button></section>
      <section className="panel settings-card"><h2>対戦設定</h2><p>現在の設定。画面上部から変更すると、パーティー構築と対戦ナビへすぐに反映される。</p><div className="setting-summary"><span>対戦形式<strong>{format === "single" ? "シングル" : "ダブル"}</strong></span></div></section>
      <section className="panel danger-zone"><h2>ログアウト・削除</h2><p>ログアウトしても登録データは残る。アカウント削除は手持ちと持ち物を含む全データを削除する。</p>{mode === "live" ? <><a href="/signout-with-chatgpt?return_to=%2F">ログアウト</a>{confirmDelete ? <button className="danger-button" onClick={onDelete}>本当に削除する</button> : <button className="danger-link" onClick={() => setConfirmDelete(true)}>アカウントを削除</button>}</> : <Link href="/">体験版を終了</Link>}</section>
    </div>
  </section>;
}

function PageTitle({ eyebrow, title, copy, count }: { eyebrow: string; title: string; copy: string; count?: string }) {
  return <div className="page-title"><div><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>{count && <strong>{count}</strong>}</div>;
}
function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><span>◇</span><h2>{title}</h2><p>{copy}</p>{action && <button onClick={onAction}>{action} →</button>}</div>; }

function RosterModal({ value, master, masterRelations, onClose, onSave }: { value: RosterEntry; master: MasterEntry[]; masterRelations: AppState["masterRelations"]; onClose: () => void; onSave: (v: RosterEntry) => void }) {
  const [draft, setDraft] = useState({ ...value, moves: [...value.moves], stats: { ...value.stats } });
  const update = (key: keyof RosterEntry, val: unknown) => setDraft((d) => ({ ...d, [key]: val }));
  const pokemon = master.filter((entry) => entry.category === "pokemon");
  const selectedPokemon = pokemon.find((entry) => entry.name === draft.species);
  const linkedAbilityIds = selectedPokemon
    ? masterRelations.filter((relation) => relation.sourceId === selectedPokemon.id && relation.kind === "has_ability").map((relation) => relation.targetId)
    : [];
  const linkedMoveIds = selectedPokemon
    ? masterRelations.filter((relation) => relation.sourceId === selectedPokemon.id && relation.kind === "learns_move").map((relation) => relation.targetId)
    : [];
  const allAbilities = master.filter((entry) => entry.category === "ability");
  const abilities = linkedAbilityIds.length ? allAbilities.filter((entry) => linkedAbilityIds.includes(entry.id)) : allAbilities;
  const items = master.filter((entry) => entry.category === "item");
  const natures = master.filter((entry) => entry.category === "nature");
  const allMoves = master.filter((entry) => entry.category === "move");
  const moves = linkedMoveIds.length ? allMoves.filter((entry) => linkedMoveIds.includes(entry.id)) : allMoves;
  const forms = selectedPokemon
    ? master.filter((entry) => entry.category === "form" && masterRelations.some((relation) =>
      relation.kind === "form_of" && relation.sourceId === entry.id && relation.targetId === selectedPokemon.id
    ))
    : [];
  const legacyOption = (current: string, options: MasterEntry[]) => current && !options.some((entry) => entry.name === current)
    ? <option value={current} disabled>{current}（マスター未登録）</option> : null;
  return <Modal title={draft.id ? "ポケモンを編集" : "ポケモンを登録"} subtitle="マスターデータから選択して対戦情報を登録する" onClose={onClose}>
    <div className="form-grid"><label className="wide">ポケモン *<select value={draft.species} onChange={(e) => { const selected = pokemon.find((entry) => entry.name === e.target.value); const stats = selected?.data?.stats as Stats | undefined; setDraft((current) => ({ ...current, species: e.target.value, types: selected?.type ?? "", ability: "", form: "", megaEvolution: false, moves: ["", "", "", ""], stats: stats ? { ...stats } : current.stats })); }}><option value="">選択する</option>{legacyOption(draft.species, pokemon)}{pokemon.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}{entry.type ? `（${entry.type}）` : ""}</option>)}</select></label><label>ニックネーム<input value={draft.nickname} onChange={(e) => update("nickname", e.target.value)} /></label><label>タイプ<input value={draft.types || "ポケモンのマスター情報から設定"} disabled /></label><label>特性<select value={draft.ability} onChange={(e) => update("ability", e.target.value)}><option value="">未設定</option>{legacyOption(draft.ability, abilities)}{abilities.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>持ち物<select value={draft.heldItem} onChange={(e) => update("heldItem", e.target.value)}><option value="">なし・未設定</option>{legacyOption(draft.heldItem, items)}{items.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>性格<select value={draft.nature} onChange={(e) => update("nature", e.target.value)}><option value="">未設定</option>{legacyOption(draft.nature, natures)}{natures.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>フォルム・Mega<select value={draft.form} onChange={(e) => { const selected = forms.find((entry) => entry.name === e.target.value); const stats = selected?.data?.stats as Stats | undefined; setDraft((current) => ({ ...current, form: e.target.value, types: selected?.type || selectedPokemon?.type || "", megaEvolution: Boolean(selected?.data?.mega), stats: stats ? { ...stats } : current.stats })); }}><option value="">通常フォルム</option>{legacyOption(draft.form, forms)}{forms.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}{entry.data?.mega ? "（Mega）" : ""}</option>)}</select></label><label className="toggle-field"><input type="checkbox" checked={draft.megaEvolution} disabled /><span><strong>{draft.megaEvolution ? "Mega Evolutionを使用" : "通常フォルム"}</strong><small>フォルムのマスターデータから自動判定する</small></span></label>
      <fieldset className="wide"><legend>技（最大4つ）</legend><div className="move-input-grid">{[0,1,2,3].map((i) => <select key={i} value={draft.moves[i] ?? ""} onChange={(e) => { const nextMoves = [...draft.moves]; nextMoves[i] = e.target.value; update("moves", nextMoves); }}><option value="">技 {i + 1}：未設定</option>{legacyOption(draft.moves[i] ?? "", moves)}{moves.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select>)}</div></fieldset>
      <fieldset className="wide"><legend>種族値・ステータス目安</legend><div className="stat-input-grid">{([["hp","HP"],["attack","攻撃"],["defense","防御"],["spAttack","特攻"],["spDefense","特防"],["speed","素早さ"]] as [keyof Stats,string][]).map(([key,label]) => <label key={key}>{label}<input type="number" min="1" max="255" value={draft.stats[key]} onChange={(e) => update("stats", { ...draft.stats, [key]: Number(e.target.value) })} /></label>)}</div></fieldset>
      <label className="wide">メモ<textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} placeholder="使い方や注意点を記録" /></label>
    </div><div className="modal-actions"><button onClick={onClose}>キャンセル</button><button className="form-primary" disabled={!draft.species.trim()} onClick={() => onSave(draft)}>保存する</button></div>
  </Modal>;
}

function ItemModal({ value, master, onClose, onSave }: { value: OwnedItem; master: MasterEntry[]; onClose: () => void; onSave: (v: OwnedItem) => void }) {
  const [draft, setDraft] = useState(value);
  const items = master.filter((entry) => entry.category === "item");
  return <Modal title={draft.id ? "持ち物を編集" : "持ち物を登録"} subtitle="個数を登録すると構築時の重複を確認できる" onClose={onClose}><div className="form-grid"><label className="wide">持ち物 *<select value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}><option value="">選択する</option>{draft.name && !items.some((entry) => entry.name === draft.name) && <option value={draft.name} disabled>{draft.name}（マスター未登録）</option>}{items.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>個数<input type="number" min="0" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></label><label className="wide">メモ<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label></div><div className="modal-actions"><button onClick={onClose}>キャンセル</button><button className="form-primary" disabled={!draft.name.trim()} onClick={() => onSave(draft)}>保存する</button></div></Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><small>EDITOR</small><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button onClick={onClose} aria-label="閉じる">×</button></header>{children}</section></div>;
}
