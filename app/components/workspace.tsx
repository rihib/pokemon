"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { demoState } from "../lib/demo-data";
import type { AppState, BattleFormat, MasterEntry, OwnedItem, PlayStyle, RosterEntry, Stats } from "../lib/types";

type Tab = "home" | "roster" | "items" | "build" | "battle" | "settings";

const tabMeta: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "ホーム", icon: "⌂" },
  { id: "roster", label: "手持ち", icon: "◈" },
  { id: "items", label: "持ち物", icon: "▣" },
  { id: "build", label: "パーティー構築", icon: "◇" },
  { id: "battle", label: "対戦ナビ", icon: "◎" },
  { id: "settings", label: "アカウント", icon: "○" },
];

const styleInfo: Record<PlayStyle, { name: string; copy: string; forWhom: string; recommended?: boolean }> = {
  balance: {
    name: "バランス",
    copy: "攻撃・守り・補助の役割を偏らせず、幅広い相手に対応する。",
    forWhom: "初めて対戦する人、どれを選ぶか迷っている人",
    recommended: true,
  },
  attack: {
    name: "速攻",
    copy: "攻撃と素早さを重視し、相手の準備が整う前に短期決戦を狙う。",
    forWhom: "自分から攻めたい人、複雑な交代戦をできるだけ減らしたい人",
  },
  control: {
    name: "コントロール",
    copy: "交代・状態変化・補助技を使い、相手ができることを少しずつ狭める。",
    forWhom: "相手の行動を読んだり、作戦を組み立てたりするのが好きな人",
  },
  endurance: {
    name: "じっくり",
    copy: "耐久・回復・交代を重視し、倒されにくさを生かして長期戦で有利を作る。",
    forWhom: "慌てず考えながら戦いたい人、安全な選択を積み重ねたい人",
  },
};

const emptyStats: Stats = { hp: 80, attack: 80, defense: 80, spAttack: 80, spDefense: 80, speed: 80 };
const emptyRoster = (): RosterEntry => ({ id: 0, species: "", nickname: "", types: "", ability: "", heldItem: "", nature: "", form: "", megaEvolution: false, moves: ["", "", "", ""], stats: { ...emptyStats }, notes: "" });
const userError = "エラーが発生しました。";
function numberScore(mon: RosterEntry, style: PlayStyle) {
  const s = mon.stats;
  const offense = Math.max(s.attack, s.spAttack);
  const bulk = s.hp * .35 + s.defense * .325 + s.spDefense * .325;
  if (style === "attack") return offense * .48 + s.speed * .38 + bulk * .14;
  if (style === "control") return bulk * .35 + s.speed * .22 + offense * .25 + mon.moves.filter(Boolean).length * 3;
  if (style === "endurance") return bulk * .58 + offense * .18 + s.speed * .08 + (mon.moves.some((m) => m.includes("回復") || m.includes("じこさいせい")) ? 25 : 0);
  return offense * .32 + bulk * .35 + s.speed * .23 + (mon.megaEvolution ? 8 : 0);
}

function createSuggestions(roster: RosterEntry[], format: BattleFormat, selectedStyle: PlayStyle) {
  const variants: { style: PlayStyle; title: string; tone: string }[] = [
    { style: selectedStyle, title: "おすすめ", tone: "あなたの好みを優先" },
    { style: "balance", title: "安定重視", tone: "苦手を少なくする構築" },
    { style: format === "double" ? "control" : "attack", title: format === "double" ? "連携重視" : "攻め重視", tone: format === "double" ? "味方同士の補助を重視" : "短期決戦を狙う構築" },
  ];
  return variants.map((variant) => {
    const sorted = [...roster].sort((a, b) => numberScore(b, variant.style) - numberScore(a, variant.style));
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
    const avg = picked.length ? Math.round(picked.reduce((sum, mon) => sum + numberScore(mon, variant.style), 0) / picked.length) : 0;
    return { ...variant, members: picked.slice(0, 6), score: Math.min(99, Math.round(avg / 1.4)), reason: reasonFor(variant.style, format, picked) };
  });
}

function reasonFor(style: PlayStyle, format: BattleFormat, members: RosterEntry[]) {
  if (style === "attack") return "攻撃性能と素早さの高いポケモンを中心に、相手より先に負荷をかける構成である。";
  if (style === "control") return `${format === "double" ? "味方への補助と行動順操作" : "交代と状態変化"}を使いやすい役割を優先。相手の得意な動きを止めやすい。`;
  if (style === "endurance") return "HPと防御面を重視し、交代を繰り返しても崩れにくい組み合わせ。長い対戦で判断を立て直しやすい。";
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

function chooseBattleTeam(
  roster: RosterEntry[],
  opponents: string[],
  style: PlayStyle,
  count: number,
  master: MasterEntry[],
  relations: AppState["masterRelations"],
) {
  const opponentText = opponents.join(" ");
  const pokemonByName = new Map(master.filter((entry) => entry.category === "pokemon").map((entry) => [entry.name, entry]));
  const moveByName = new Map(master.filter((entry) => entry.category === "move").map((entry) => [entry.name, entry]));
  const typeByName = new Map(master.filter((entry) => entry.category === "type").map((entry) => [entry.name, entry]));
  const opponentTypes = opponents.flatMap((name) => pokemonByName.get(name)?.type.split(/[・/]/).filter(Boolean) ?? []);
  const multiplierFor = (attackType: string, defenseType: string) => {
    const attack = typeByName.get(attackType);
    const defense = typeByName.get(defenseType);
    if (!attack || !defense) return 1;
    const relation = relations.find((candidate) =>
      candidate.kind === "type_effectiveness" &&
      candidate.sourceId === attack.id &&
      candidate.targetId === defense.id
    );
    return Number(relation?.data?.multiplier ?? 1);
  };
  return [...roster]
    .map((mon) => {
      let score = numberScore(mon, style);
      const advantages: string[] = [];
      const moveTypes = mon.moves.map((move) => moveByName.get(move)?.type).filter((type): type is string => Boolean(type && typeByName.has(type)));
      const bestMultiplier = Math.max(1, ...moveTypes.flatMap((attackType) => opponentTypes.map((defenseType) => multiplierFor(attackType, defenseType))));
      if (bestMultiplier >= 2) {
        score += bestMultiplier >= 4 ? 28 : 18;
        advantages.push(bestMultiplier >= 4 ? "4倍弱点への打点" : "相手の弱点を突ける");
      }
      if (/ドラゴン|ガブリアス|カイリュー/.test(opponentText) && /フェアリー|こおり/.test(`${mon.types} ${mon.moves.join(" ")}`)) { score += 28; advantages.push("ドラゴンへの打点"); }
      if (/はがね|サーフゴー/.test(opponentText) && /ほのお|じめん|ゴースト/.test(`${mon.types} ${mon.moves.join(" ")}`)) { score += 24; advantages.push("はがねへの打点"); }
      if (/みず|アシレーヌ/.test(opponentText) && /くさ|でんき/.test(`${mon.types} ${mon.moves.join(" ")}`)) { score += 22; advantages.push("みずへの打点"); }
      if (mon.stats.hp + mon.stats.defense + mon.stats.spDefense >= 270) { score += 8; advantages.push("選出の安定性"); }
      return { mon, score, advantages };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
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
  const [style, setStyle] = useState<PlayStyle>(demoState.user.preferredStyle);
  const [opponents, setOpponents] = useState(["カイリュー", "サーフゴー", "ウーラオス", "ハバタクカミ", "ゴリランダー", "ガオガエン"]);
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
      setStyle(data.user.preferredStyle);
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
        setStyle(data.user.preferredStyle);
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

  const saveBattlePreferences = async (nextFormat: BattleFormat, nextStyle: PlayStyle) => {
    const previousFormat = format;
    const previousStyle = style;
    setFormat(nextFormat);
    setStyle(nextStyle);
    setState((current) => ({
      ...current,
      user: { ...current.user, preferredFormat: nextFormat, preferredStyle: nextStyle },
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
        body: JSON.stringify({ action: "save-profile", payload: { preferredFormat: nextFormat, preferredStyle: nextStyle } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(userError);
      setState((current) => ({ ...current, user: { ...current.user, ...data.saved } }));
      setNotice("対戦設定を保存した");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (e) {
      setFormat(previousFormat);
      setStyle(previousStyle);
      setState((current) => ({
        ...current,
        user: { ...current.user, preferredFormat: previousFormat, preferredStyle: previousStyle },
      }));
      console.error("Failed to save battle preferences", e);
      setError(userError);
    } finally {
      setSavingPreferences(false);
    }
  };

  const availableRoster = useMemo(() => eligibleRoster(state), [state]);
  const pickCount = useMemo(() => regulationPickCount(state, format), [state, format]);
  const suggestions = useMemo(() => createSuggestions(availableRoster, format, style), [availableRoster, format, style]);
  const selection = useMemo(
    () => chooseBattleTeam(availableRoster, opponents, style, pickCount, state.master, state.masterRelations),
    [availableRoster, opponents, style, pickCount, state.master, state.masterRelations],
  );
  const lead = useMemo(() => {
    const candidates = selection.map((s) => s.mon);
    return [...candidates].sort((a, b) => {
      const enemyHint = enemyLead.includes("カイリュー") ? (m: RosterEntry) => /フェアリー|こおり/.test(`${m.types} ${m.moves.join(" ")}`) ? 30 : 0 : () => 0;
      return numberScore(b, style) + enemyHint(b) - numberScore(a, style) - enemyHint(a);
    })[0];
  }, [selection, enemyLead, style]);

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
              <select value={format} disabled={loading || savingPreferences} onChange={(event) => void saveBattlePreferences(event.target.value as BattleFormat, style)}>
                <option value="single">シングル</option>
                <option value="double">ダブル</option>
              </select>
            </label>
            <div className="style-setting">
              <label className="global-setting">
                <span>戦い方</span>
                <select value={style} disabled={loading || savingPreferences} onChange={(event) => void saveBattlePreferences(format, event.target.value as PlayStyle)}>
                  {(Object.keys(styleInfo) as PlayStyle[]).map((key) => <option key={key} value={key}>{styleInfo[key].name}</option>)}
                </select>
              </label>
              <details className="style-help">
                <summary aria-label="戦い方の選び方を確認" title="戦い方の選び方">?</summary>
                <div className="style-help-panel">
                  <header><small>PLAY STYLE GUIDE</small><strong>どの戦い方を選べばよい？</strong><p>強さの順位ではなく、どのように勝ちたいかの違いである。迷ったらバランスがおすすめ。</p></header>
                  <div>
                    {(Object.keys(styleInfo) as PlayStyle[]).map((key) => {
                      const item = styleInfo[key];
                      return <article className={style === key ? "selected" : ""} key={key}>
                        <span>{item.recommended ? "初心者におすすめ" : "PLAY STYLE"}</span>
                        <strong>{item.name}{style === key ? "（選択中）" : ""}</strong>
                        <p>{item.copy}</p>
                        <small>向いている人：{item.forWhom}</small>
                      </article>;
                    })}
                  </div>
                </div>
              </details>
            </div>
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
            {tab === "build" && <BuildPanel roster={availableRoster} format={format} style={style} pickCount={pickCount} suggestions={suggestions} selected={selectedSuggestion} setSelected={setSelectedSuggestion} onRoster={() => setTab("roster")} />}
            {tab === "battle" && <BattlePanel format={format} style={style} pickCount={pickCount} opponents={opponents} setOpponents={setOpponents} selection={selection} enemyLead={enemyLead} setEnemyLead={setEnemyLead} lead={lead} onRoster={() => setTab("roster")} />}
            {tab === "settings" && <SettingsPanel state={state} visibleRole={visibleRole} format={format} style={style} mode={mode} onSave={(payload) => void mutate("save-profile", payload, () => setState((s) => ({ ...s, user: { ...s.user, ...payload } })))} onDelete={() => void mutate("delete-account", {}, () => { window.location.href = "/"; })} />}
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
        <div><small>NEXT STEP</small><h2>{state.roster.length < 6 ? "まずは手持ちを6体登録しよう" : "あなた向けの構築を比べよう"}</h2><p>{state.roster.length < 6 ? "分からない項目は空欄でもよい。ポケモン名から少しずつ登録できる。" : "戦い方の異なる3案を用意した。理由を見比べて選べる。"}</p></div>
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

function BuildPanel({ roster, format, style, pickCount, suggestions, selected, setSelected, onRoster }: { roster: RosterEntry[]; format: BattleFormat; style: PlayStyle; pickCount: number; suggestions: ReturnType<typeof createSuggestions>; selected: number; setSelected: (v: number) => void; onRoster: () => void }) {
  const ready = roster.length >= 6;
  return <section>
    <PageTitle
      eyebrow="PARTY BUILDER"
      title="パーティー構築"
      copy={ready ? "上部で選んだ対戦設定に合わせて3案を提案する。強さの順位ではなく、勝ち方の違いから選べる。" : "上部の対戦設定に合わせ、手持ちが6体そろったら構築を提案する。"}
      count={`${format === "single" ? "シングル" : "ダブル"}・${styleInfo[style].name}`}
    />
    {!ready ? (
      <EmptyState title={`あと${6 - roster.length}体登録すると提案できる`} copy="現在の対戦形式と戦い方は画面上部からいつでも変更できる。技やステータスは後からでもよい。" action="手持ちを登録" onAction={onRoster} />
    ) : (
      <>
        <div className="suggestion-tabs">{suggestions.map((s, i) => <button key={`${s.title}-${i}`} className={selected === i ? "active" : ""} onClick={() => setSelected(i)}><small>PLAN {String(i + 1).padStart(2, "0")}</small><strong>{s.title}</strong><span>{s.tone}</span><b>{s.score}<em>/100</em></b></button>)}</div>
        {suggestions[selected] && <article className="suggestion-detail"><div className="suggestion-heading"><div><span className="recommend-badge">{selected === 0 ? "あなた向け" : "別の選択肢"}</span><h2>{suggestions[selected].title}パーティー</h2></div><p><span>?</span><strong>この提案の理由</strong>{suggestions[selected].reason}</p></div><div className="suggested-party">{suggestions[selected].members.map((mon, i) => <MonsterTile key={mon.id} mon={mon} index={i} />)}</div><div className="beginner-explain"><strong>使い方の目安</strong><span>① 相手の6体を見る</span><span>② 対戦ナビで{pickCount}体を選ぶ</span><span>③ 最初の1体を確認</span><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>この案を選ぶ ✓</button></div></article>}
      </>
    )}
  </section>;
}

function BattlePanel({ format, style, pickCount, opponents, setOpponents, selection, enemyLead, setEnemyLead, lead, onRoster }: { format: BattleFormat; style: PlayStyle; pickCount: number; opponents: string[]; setOpponents: (v: string[]) => void; selection: ReturnType<typeof chooseBattleTeam>; enemyLead: string; setEnemyLead: (v: string) => void; lead?: RosterEntry; onRoster: () => void }) {
  const settingLabel = `${format === "single" ? "シングル" : "ダブル"}・${styleInfo[style].name}`;
  if (!selection.length) return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="相手の情報から、選出と先発を順番に提案する。" count={settingLabel} /><EmptyState title="まず手持ちを登録しよう" copy="選べるポケモンがないため、まだ提案を作れない。" action="手持ちを登録" onAction={onRoster} /></section>;
  return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="相手の6体を入力すると、上部で選んだ対戦設定に合わせて使用候補を提案する。" count={settingLabel} />
    <div className="battle-flow"><span className="done">1<small>相手の6体</small></span><i></i><span className="done">2<small>{pickCount}体を選出</small></span><i></i><span>3<small>先発を決定</small></span></div>
    <div className="battle-layout"><section className="panel opponent-panel"><div className="panel-head"><div><small>OPPONENT TEAM</small><h2>相手の6体</h2></div><span>入力は名前だけでOK</span></div><div className="opponent-grid">{opponents.map((value, i) => <label key={i}><span>{i + 1}</span><input value={value} onChange={(e) => { const next = [...opponents]; next[i] = e.target.value; setOpponents(next); }} placeholder="ポケモン名" /></label>)}</div></section>
      <section className="panel selection-panel"><div className="panel-head"><div><small>RECOMMENDED PICK</small><h2>この{pickCount}体がおすすめ</h2></div><span className="score-ring small">{Math.min(99, 78 + selection[0].advantages.length * 4)}</span></div>{selection.map((picked, i) => <div className={`selection-row ${i === 0 ? "best" : ""}`} key={picked.mon.id}><span className={`rank rank-${i + 1}`}>{i + 1}</span><MonsterTile mon={picked.mon} index={i} compact /><p>{picked.advantages.length ? picked.advantages.join("・") : "総合力と役割の安定性"}<small>{i === 0 ? "中心に選びたい" : "相手に応じて活躍"}</small></p></div>)}<p className="reason-card"><span>?</span><strong>選出理由</strong>相手への有効打と受け先を両立し、苦手な相手が重なりにくい{pickCount}体を優先した。</p></section>
    </div>
    <section className="lead-panel"><div><small>STEP 03 / LEAD</small><h2>相手が最初に出したポケモンは？</h2><p>分かった時点で入力すると、選んだ{pickCount}体から先発または交代先を提案する。</p></div><input value={enemyLead} onChange={(e) => setEnemyLead(e.target.value)} placeholder="相手のポケモン名" />{lead && <div className="lead-result"><span>推奨</span><MonsterTile mon={lead} index={1} compact /><p><strong>{lead.nickname || lead.species}から始めよう</strong>素早さと相手への打点を評価。苦手なら無理せず交代する。</p></div>}</section>
  </section>;
}

function SettingsPanel({ state, visibleRole, format, style, mode, onSave, onDelete }: { state: AppState; visibleRole: "admin" | "user"; format: BattleFormat; style: PlayStyle; mode: "live" | "demo"; onSave: (payload: Record<string, unknown>) => void; onDelete: () => void }) {
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

  return <section><PageTitle eyebrow="ACCOUNT" title="アカウント設定" copy="表示名、ユーザー名と対戦設定を変更できる。" />
    <div className="settings-grid"><section className="panel settings-card"><div className="settings-heading"><h2>プロフィール</h2><span className={`role-status ${visibleRole}`}>{visibleRole === "admin" ? "管理者アカウント" : "一般アカウント"}</span></div><label>表示名<input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label><label>ユーザー名<input value={handle} maxLength={24} onChange={(e) => { setHandle(e.target.value.replace(/^@/, "").toLowerCase()); setHandleStatus("checking"); }} autoCapitalize="none" aria-describedby="handle-availability" /><small id="handle-availability" className={`field-hint handle-${effectiveHandleStatus}`} aria-live="polite">{handleMessage}</small></label><label>メールアドレス<input type="email" value={state.user.email} disabled /><small className="field-hint">ChatGPTアカウントから取得するため、このサービス内では変更できない。</small></label><button className="form-primary" disabled={!name.trim() || effectiveHandleStatus !== "available"} onClick={() => onSave({ displayName: name, handle })}>変更を保存</button></section>
      <section className="panel settings-card"><h2>対戦設定</h2><p>現在の設定。画面上部から変更すると、パーティー構築と対戦ナビへすぐに反映される。</p><div className="setting-summary"><span>対戦形式<strong>{format === "single" ? "シングル" : "ダブル"}</strong></span><span>好みの戦い方<strong>{styleInfo[style].name}</strong></span></div></section>
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
