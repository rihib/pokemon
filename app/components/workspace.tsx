"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { demoState } from "../lib/demo-data";
import type { AppState, BattleFormat, BattleTeam, MasterEntry, OwnedItem, RosterEntry, Stats } from "../lib/types";

type Tab = "home" | "roster" | "items" | "build" | "teams" | "battle" | "settings";

const tabMeta: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "ホーム", icon: "⌂" },
  { id: "roster", label: "ボックス", icon: "◈" },
  { id: "items", label: "持ち物", icon: "▣" },
  { id: "teams", label: "マイチーム", icon: "◉" },
  { id: "build", label: "チーム構築", icon: "◇" },
  { id: "battle", label: "対戦ナビ", icon: "◎" },
  { id: "settings", label: "アカウント", icon: "○" },
];

const emptyStats: Stats = { hp: 80, attack: 80, defense: 80, spAttack: 80, spDefense: 80, speed: 80 };
const emptyRoster = (): RosterEntry => ({ id: 0, species: "", nickname: "", types: "", ability: "", heldItem: "", nature: "", form: "", megaEvolution: false, moves: ["", "", "", ""], stats: { ...emptyStats }, notes: "" });
const emptyBattleTeam = () => ({ id: 0, name: "", memberIds: [] as number[] });
const userError = "エラーが発生しました。";
function numberScore(mon: RosterEntry) {
  const s = mon.stats;
  const offense = Math.max(s.attack, s.spAttack);
  const bulk = s.hp * .35 + s.defense * .325 + s.spDefense * .325;
  return offense * .32 + bulk * .35 + s.speed * .23 + (mon.megaEvolution ? 8 : 0);
}

type SuggestionProfile = "balanced" | "offense" | "bulk";
type ScoreBreakdownItem = { label: string; points: number; detail: string; kind: "base" | "bonus" | "penalty" };
type TeamScoreBreakdown = { score: number; items: ScoreBreakdownItem[] };

function scoreForProfile(mon: RosterEntry, profile: SuggestionProfile) {
  const stats = mon.stats;
  const offense = Math.max(stats.attack, stats.spAttack);
  const bulk = stats.hp * .35 + stats.defense * .325 + stats.spDefense * .325;
  if (profile === "offense") return offense * .48 + stats.speed * .38 + bulk * .14;
  if (profile === "bulk") return bulk * .55 + offense * .23 + stats.speed * .12;
  return offense * .32 + bulk * .35 + stats.speed * .23;
}

function teamScore(members: RosterEntry[], profile: SuggestionProfile) {
  return teamScoreBreakdown(members, profile).score;
}

function typeCoverage(members: RosterEntry[]) {
  return new Set(members.flatMap((mon) => mon.types.split(/[・/]/).filter(Boolean))).size;
}

function teamScoreBreakdown(members: RosterEntry[], profile: SuggestionProfile): TeamScoreBreakdown {
  if (!members.length) return { score: 0, items: [{ label: "メンバー未登録", points: 0, detail: "6体を登録すると評価できる。", kind: "base" }] };
  const profileCopy: Record<SuggestionProfile, string> = {
    balanced: "攻撃・耐久・素早さを均等に評価",
    offense: "攻撃・特攻と素早さを重視",
    bulk: "HP・防御・特防を重視",
  };
  const basePoints = Math.round(members.reduce((sum, mon) => sum + scoreForProfile(mon, profile), 0) / members.length / 1.4);
  const allTypes = members.flatMap((mon) => mon.types.split(/[・/]/).filter(Boolean));
  const distinctTypes = new Set(allTypes).size;
  const typeBonus = Math.max(0, Math.min(10, (distinctTypes - 3) * 2));
  const duplicateTypes = [...new Set(allTypes)].reduce((sum, type) => sum + Math.max(0, allTypes.filter((entry) => entry === type).length - 1), 0);
  const duplicatePenalty = Math.min(10, duplicateTypes * 2);
  const megaBonus = Math.min(8, members.filter((mon) => mon.megaEvolution).length * 4);
  const incompletePenalty = Math.max(0, 6 - members.length) * 8;
  const rawScore = basePoints + typeBonus + megaBonus - duplicatePenalty - incompletePenalty;
  const capPenalty = Math.max(0, rawScore - 99);
  const floorBonus = Math.max(0, -rawScore);
  const items: ScoreBreakdownItem[] = [
    { label: "能力値の基礎点", points: basePoints, detail: profileCopy[profile], kind: "base" },
    { label: "タイプの幅", points: typeBonus, detail: `${distinctTypes}種類。4種類目から1種類ごとに+2点`, kind: "bonus" },
    { label: "メガ進化", points: megaBonus, detail: members.some((mon) => mon.megaEvolution) ? `メガ進化 ${members.filter((mon) => mon.megaEvolution).length}体で+4点ずつ` : "メガ進化の採用なし", kind: "bonus" },
    { label: "タイプの重複", points: -duplicatePenalty, detail: duplicateTypes ? `重複 ${duplicateTypes}件で-2点ずつ` : "重複なし", kind: "penalty" },
    { label: "メンバー不足", points: -incompletePenalty, detail: members.length === 6 ? "6体そろっている" : `${6 - members.length}体不足で-8点ずつ`, kind: "penalty" },
  ];
  if (capPenalty) items.push({ label: "表示上限", points: -capPenalty, detail: "スコアは99点を上限としている", kind: "penalty" });
  if (floorBonus) items.push({ label: "最低点補正", points: floorBonus, detail: "スコアは0点を下限としている", kind: "bonus" });
  return { score: rawScore - capPenalty + floorBonus, items };
}

function pokemonIdentity(mon: RosterEntry, master: MasterEntry[]) {
  const entry = master.find((candidate) => candidate.category === "pokemon" && candidate.name === (mon.form || mon.species));
  const dexNo = Number(entry?.data?.dexNo);
  return Number.isInteger(dexNo) && dexNo > 0 ? `dex:${dexNo}` : `name:${mon.species}`;
}

function distinctPokemonCount(roster: RosterEntry[], master: MasterEntry[]) {
  return new Set(roster.map((mon) => pokemonIdentity(mon, master))).size;
}

function createSuggestions(roster: RosterEntry[], format: BattleFormat, master: MasterEntry[]) {
  const variants = [
    { title: "総合おすすめ", tone: "タイプと能力値の偏りを抑える", profile: "balanced" },
    { title: "打点を確保", tone: "攻撃・特攻・素早さを優先", profile: "offense" },
    { title: "安定した構成", tone: "耐久力とタイプの分散を優先", profile: "bulk" },
  ] as const;
  return variants.map((variant) => {
    const scoreFor = (mon: RosterEntry) => scoreForProfile(mon, variant.profile);
    const sorted = [...roster].sort((a, b) => scoreFor(b) - scoreFor(a));
    const picked: RosterEntry[] = [];
    const usedTypes = new Set<string>();
    const usedSpecies = new Set<string>();
    for (const mon of sorted) {
      const identity = pokemonIdentity(mon, master);
      if (usedSpecies.has(identity)) continue;
      const newTypes = mon.types.split(/[・/]/).filter((t) => t && !usedTypes.has(t));
      if (picked.length < 6 && (newTypes.length || picked.length >= 4)) {
        picked.push(mon);
        usedSpecies.add(identity);
        mon.types.split(/[・/]/).forEach((t) => usedTypes.add(t));
      }
    }
    for (const mon of sorted) {
      const identity = pokemonIdentity(mon, master);
      if (picked.length >= 6 || usedSpecies.has(identity)) continue;
      picked.push(mon);
      usedSpecies.add(identity);
    }
    const members = picked.slice(0, 6);
    return { ...variant, members, score: teamScore(members, variant.profile), reason: reasonFor(variant.profile, format, picked) };
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
  if (!allowedPokemonIds.length) return state.roster;
  const allowedPokemonNames = new Set(state.master.filter((entry) => allowedPokemonIds.includes(entry.id)).map((entry) => entry.name));
  return state.roster.filter((mon) => allowedPokemonNames.has(mon.form || mon.species));
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
    pokemonByName: new Map(master.filter((entry) => entry.category === "pokemon").map((entry) => [entry.name, entry])),
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

type AcquisitionAdvice = {
  label: string;
  title: string;
  copy: string;
  points: string[];
};

function createAcquisitionAdvice(
  party: RosterEntry[],
  ownedItems: OwnedItem[],
  master: MasterEntry[],
  relations: AppState["masterRelations"],
  format: BattleFormat,
): AcquisitionAdvice[] {
  if (!party.length) return [];
  const maps = createMasterMaps(master);
  const allTypes = [...maps.typeByName.keys()];
  const weakTypeCounts = allTypes
    .map((attackType) => ({
      attackType,
      count: party.filter((mon) => combinedTypeMultiplier(attackType, splitTypes(mon.types), maps, relations) >= 2).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const topThreats = weakTypeCounts.slice(0, 2);
  const defensiveType = allTypes
    .map((candidateType) => ({
      type: candidateType,
      score: topThreats.reduce((sum, threat) => sum + threat.count * (combinedTypeMultiplier(threat.attackType, [candidateType], maps, relations) <= .5 ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];
  const partyAttackTypes = new Set(party.flatMap((mon) => splitTypes(mon.types)));
  const offensiveGap = allTypes
    .map((defenseType) => ({
      defenseType,
      covered: [...partyAttackTypes].some((attackType) => combinedTypeMultiplier(attackType, [defenseType], maps, relations) >= 2),
    }))
    .filter((entry) => !entry.covered)
    .map((entry) => entry.defenseType);
  const bestAttackType = allTypes
    .map((attackType) => ({
      type: attackType,
      score: offensiveGap.filter((defenseType) => combinedTypeMultiplier(attackType, [defenseType], maps, relations) >= 2).length,
    }))
    .sort((a, b) => b.score - a.score)[0];
  const averages = party.reduce((sum, mon) => ({
    hp: sum.hp + mon.stats.hp,
    attack: sum.attack + mon.stats.attack,
    defense: sum.defense + mon.stats.defense,
    spAttack: sum.spAttack + mon.stats.spAttack,
    spDefense: sum.spDefense + mon.stats.spDefense,
    speed: sum.speed + mon.stats.speed,
  }), { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 });
  const averageSpeed = averages.speed / party.length;
  const averageBulk = (averages.hp + averages.defense + averages.spDefense) / party.length;
  const statTarget = averageSpeed < 90
    ? "素早さ100以上を目安"
    : averageBulk < 260
      ? "HP・防御・特防の合計300以上を目安"
      : "攻撃または特攻120以上を目安";
  const candidate = master.find((entry) =>
    entry.category === "pokemon" &&
    !party.some((mon) => mon.species === entry.name) &&
    Boolean(defensiveType && splitTypes(entry.type).includes(defensiveType.type)),
  );
  const pokemonAdvice: AcquisitionAdvice = {
    label: "NEXT POKÉMON",
    title: defensiveType?.score
      ? `${defensiveType.type}タイプを補強`
      : "タイプの選択肢を増やす",
    copy: topThreats.length
      ? `${topThreats.map((threat) => `${threat.attackType}タイプに${threat.count}体が弱い`).join("、")}。受け先を増やすと、選出の安定性が上がる。`
      : "タイプの弱点が大きく偏っていない。次は攻撃範囲を広げるポケモンを加えるとよい。",
    points: [
      statTarget,
      bestAttackType?.score ? `${bestAttackType.type}タイプで未対応のタイプに打点を持たせる` : "既存メンバーと異なるタイプを優先",
      candidate ? `図鑑マスターの候補：${candidate.name}（${candidate.type}）` : "図鑑マスターから条件に合うポケモンを追加",
    ],
  };
  const physicalCount = party.filter((mon) => mon.stats.attack >= mon.stats.spAttack).length;
  const specialCount = party.length - physicalCount;
  const itemNames = new Set(ownedItems.filter((item) => item.quantity > 0).map((item) => item.name));
  const preferredItems = [
    physicalCount >= specialCount ? "こだわりハチマキ" : "こだわりメガネ",
    averageBulk < 260 ? "きあいのタスキ" : format === "double" ? "オボンのみ" : "たべのこし",
  ];
  const masterItemNames = new Set(master.filter((entry) => entry.category === "item").map((entry) => entry.name));
  const missingItems = preferredItems.filter((name) => masterItemNames.has(name) && !itemNames.has(name));
  const itemAdvice: AcquisitionAdvice = {
    label: "NEXT ITEMS",
    title: missingItems.length ? `「${missingItems[0]}」の取得を優先` : "持ち物の選択肢を増やす",
    copy: missingItems.length
      ? "現在のバトルチームには、この役割を支える持ち物の在庫がない。先に確保すると構築候補を切り替えやすくなる。"
      : "主要な役割向けの持ち物は確保できている。重複しにくい別の役割向け持ち物を増やすと対応力が上がる。",
    points: [
      physicalCount >= specialCount ? "物理アタッカーの火力を伸ばす持ち物" : "特殊アタッカーの火力を伸ばす持ち物",
      averageBulk < 260 ? "行動保証を作る「きあいのタスキ」系" : "交代戦を支える回復・耐久系の持ち物",
      party.some((mon) => mon.megaEvolution) ? "メガ進化を使う個体には対応するメガストーンを確保" : "メガ進化を採用する場合は対応するメガストーンも確認",
    ],
  };
  return [pokemonAdvice, itemAdvice];
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
    battleTeams: [],
  });
  const [loading, setLoading] = useState(mode === "live");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(mode === "demo" ? "体験版：変更はこの画面を閉じると消える" : "");
  const [tab, setTab] = useState<Tab>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [rosterEditor, setRosterEditor] = useState<RosterEntry | null>(null);
  const [itemEditor, setItemEditor] = useState<OwnedItem | null>(null);
  const [teamEditor, setTeamEditor] = useState<{ id: number; name: string; memberIds: number[] } | null>(null);
  const [format, setFormat] = useState<BattleFormat>(demoState.user.preferredFormat);
  const [opponents, setOpponents] = useState(["カイリュー", "サーフゴー", "アシレーヌ", "ゴリランダー", "ガブリアス", "ウルガモス"]);
  const [enemyLead, setEnemyLead] = useState("カイリュー");
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [selectedBattleTeamId, setSelectedBattleTeamId] = useState(0);
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
    setSelectedBattleTeamId((current) => state.battleTeams.some((team) => team.id === current) ? current : (state.battleTeams[0]?.id ?? 0));
  }, [state.battleTeams]);

  useEffect(() => {
    if (!mobileNav) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNav]);

  const mutate = async (
    action: string,
    payload: Record<string, unknown>,
    options?: { optimistic?: () => void; rollback?: () => void; skipRefresh?: boolean; successMessage?: string; failureMessage?: string },
  ) => {
    setError("");
    if (mode === "demo") {
      options?.optimistic?.();
      setNotice("体験版のデータを更新した");
      window.setTimeout(() => setNotice("体験版：変更はこの画面を閉じると消える"), 1800);
      return true;
    }
    if (options?.skipRefresh) options.optimistic?.();
    try {
      const response = await fetch("/api/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, payload }) });
      const data = await response.json();
      if (!response.ok) throw new Error(userError);
      if (data.signOut) window.location.href = data.signOut;
      else if (!options?.skipRefresh) await refresh();
      setNotice(options?.successMessage ?? "保存した");
      window.setTimeout(() => setNotice(""), 1800);
      return true;
    } catch (e) {
      console.error("Failed to save application state", e);
      options?.rollback?.();
      setError(options?.failureMessage ?? userError);
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
  const suggestions = useMemo(() => createSuggestions(availableRoster, format, state.master), [availableRoster, format, state.master]);
  const selectedBattleTeam = state.battleTeams.find((team) => team.id === selectedBattleTeamId);
  const battleParty = selectedBattleTeam?.members ?? [];
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
            {tab === "roster" && <RosterPanel roster={state.roster} onEdit={setRosterEditor} onDelete={(id) => {
              const removed = state.roster.find((mon) => mon.id === id);
              void mutate("delete-roster", { id }, {
                skipRefresh: true,
                successMessage: "ポケモンを削除した",
                failureMessage: "削除できなかった。元に戻した。",
                optimistic: () => setState((current) => ({ ...current, roster: current.roster.filter((mon) => mon.id !== id) })),
                rollback: () => { if (removed) setState((current) => current.roster.some((mon) => mon.id === id) ? current : ({ ...current, roster: [...current.roster, removed].sort((a, b) => a.id - b.id) })); },
              });
            }} />}
            {tab === "items" && <ItemsPanel items={state.items} onEdit={setItemEditor} onDelete={(id) => {
              const removed = state.items.find((item) => item.id === id);
              void mutate("delete-item", { id }, {
                skipRefresh: true,
                successMessage: "持ち物を削除した",
                failureMessage: "削除できなかった。元に戻した。",
                optimistic: () => setState((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) })),
                rollback: () => { if (removed) setState((current) => current.items.some((item) => item.id === id) ? current : ({ ...current, items: [...current.items, removed].sort((a, b) => a.id - b.id) })); },
              });
            }} />}
            {tab === "build" && <BuildPanel roster={availableRoster} items={state.items} master={state.master} masterRelations={state.masterRelations} teams={state.battleTeams} format={format} pickCount={pickCount} suggestions={suggestions} selected={selectedSuggestion} setSelected={setSelectedSuggestion} onRoster={() => setTab("roster")} />}
            {tab === "teams" && <BattleTeamsPanel teams={state.battleTeams} roster={state.roster} activeTeamId={selectedBattleTeamId} onCreate={() => setTeamEditor(emptyBattleTeam())} onEdit={(team) => setTeamEditor({ id: team.id, name: team.name, memberIds: team.members.map((member) => member.id) })} onUse={(id) => { setSelectedBattleTeamId(id); setTab("battle"); }} onDelete={(id) => {
              const removed = state.battleTeams.find((team) => team.id === id);
              void mutate("delete-battle-team", { id }, {
                skipRefresh: true,
                successMessage: "バトルチームを削除した",
                failureMessage: "削除できなかった。元に戻した。",
                optimistic: () => { setState((current) => ({ ...current, battleTeams: current.battleTeams.filter((team) => team.id !== id) })); if (selectedBattleTeamId === id) setSelectedBattleTeamId(0); },
                rollback: () => { if (removed) setState((current) => ({ ...current, battleTeams: [...current.battleTeams, removed].sort((a, b) => a.id - b.id) })); },
              });
            }} />}
            {tab === "battle" && <BattlePanel format={format} pickCount={pickCount} teams={state.battleTeams} selectedTeam={selectedBattleTeam} onSelectTeam={setSelectedBattleTeamId} onManageTeams={() => setTab("teams")} opponents={opponents} setOpponents={setOpponents} selection={selection} enemyLead={enemyLead} setEnemyLead={setEnemyLead} lead={lead} />}
            {tab === "settings" && <SettingsPanel state={state} visibleRole={visibleRole} format={format} mode={mode} onSave={(payload) => void mutate("save-profile", payload, { optimistic: () => setState((s) => ({ ...s, user: { ...s.user, ...payload } })) })} onDelete={() => void mutate("delete-account", {}, { optimistic: () => { window.location.href = "/"; } })} />}
          </div>
        )}
      </section>

      {rosterEditor && <RosterModal value={rosterEditor} master={state.master} masterRelations={state.masterRelations} onClose={() => setRosterEditor(null)} onSave={async (value) => {
        const ok = await mutate("save-roster", value as unknown as Record<string, unknown>, { optimistic: () => setState((s) => ({ ...s, roster: value.id ? s.roster.map((m) => m.id === value.id ? value : m) : [...s.roster, { ...value, id: Math.max(0, ...s.roster.map((m) => m.id)) + 1 }] })) });
        if (ok) setRosterEditor(null);
      }} />}
      {itemEditor && <ItemModal value={itemEditor} master={state.master} onClose={() => setItemEditor(null)} onSave={async (value) => {
        const ok = await mutate("save-item", value as unknown as Record<string, unknown>, { optimistic: () => setState((s) => ({ ...s, items: value.id ? s.items.map((i) => i.id === value.id ? value : i) : [...s.items, { ...value, id: Math.max(0, ...s.items.map((i) => i.id)) + 1 }] })) });
        if (ok) setItemEditor(null);
      }} />}
      {teamEditor && <BattleTeamModal value={teamEditor} roster={state.roster} master={state.master} onClose={() => setTeamEditor(null)} onSave={async (value) => {
        const ok = await mutate("save-battle-team", value, { optimistic: () => setState((current) => {
          const members = value.memberIds.map((id) => current.roster.find((member) => member.id === id)).filter((member): member is RosterEntry => Boolean(member));
          const next = { id: value.id || Math.max(0, ...current.battleTeams.map((team) => team.id)) + 1, name: value.name, members };
          return { ...current, battleTeams: value.id ? current.battleTeams.map((team) => team.id === value.id ? next : team) : [...current.battleTeams, next] };
        }) });
        if (ok) setTeamEditor(null);
      }} />}
      {tab === "roster" && <button className="floating-add" onClick={() => setRosterEditor(emptyRoster())}>＋ ボックスに登録</button>}
      {tab === "items" && <button className="floating-add" onClick={() => setItemEditor({ id: 0, name: "", quantity: 1, notes: "" })}>＋ 持ち物を登録</button>}
      {tab === "teams" && <button className="floating-add" onClick={() => setTeamEditor(emptyBattleTeam())}>＋ チームを作成</button>}
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
        <div><small>NEXT STEP</small><h2>{distinctPokemonCount(state.roster, state.master) < 6 ? "ボックスに異なるポケモンを6体登録しよう" : !state.battleTeams.length ? "実際に使うマイチームを登録しよう" : "対戦ナビで選出を確認しよう"}</h2><p>{distinctPokemonCount(state.roster, state.master) < 6 ? "同じポケモンを複数登録できる。チームには異なるポケモンが6体必要である。" : !state.battleTeams.length ? "チーム構築の提案とは別に、実際に対戦で使う6体を保存する。複数チームを登録できる。" : "登録したマイチームを選び、相手の6体に対する選出を確認する。"}</p></div>
        <button onClick={() => onGo(distinctPokemonCount(state.roster, state.master) < 6 ? "roster" : !state.battleTeams.length ? "teams" : "battle")}>{distinctPokemonCount(state.roster, state.master) < 6 ? "ボックスに登録" : !state.battleTeams.length ? "チームを作成" : "対戦ナビへ"} <span>→</span></button>
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
  return <section><PageTitle eyebrow="BOX" title="ボックス" copy="同じポケモンも複数登録できる。あとからいつでも詳しくできる。" count={`${roster.length}体`} />
    <div className="roster-grid">{roster.map((mon, i) => <article className="roster-card" key={mon.id}><MonsterTile mon={mon} index={i} /><div className="chip-row"><span>{mon.ability || "特性未登録"}</span><span>{mon.heldItem || "持ち物なし"}</span><span>{mon.nature || "性格未登録"}</span></div><div className="move-list">{mon.moves.filter(Boolean).map((move) => <span key={move}>{move}</span>)}</div><div className="card-actions"><button onClick={() => onEdit(mon)}>編集</button><button className="danger-link" onClick={() => onDelete(mon.id)}>削除</button></div></article>)}</div>
    {!roster.length && <EmptyState title="ボックスにポケモンがいない" copy="右下の「ボックスに登録」から、名前だけでも追加できる。" />}</section>;
}

function ItemsPanel({ items, onEdit, onDelete }: { items: OwnedItem[]; onEdit: (i: OwnedItem) => void; onDelete: (id: number) => void }) {
  return <section><PageTitle eyebrow="OWNED ITEMS" title="持ち物リスト" copy="利用できる持ち物と個数を登録すると、重複を避けて構築を提案する。" count={`${items.reduce((s, i) => s + i.quantity, 0)}個`} />
    {!!items.length && <div className="item-table">{items.map((item) => <article key={item.id}><span className="item-icon">▣</span><div><strong>{item.name}</strong><small>{item.notes || "メモなし"}</small></div><b>× {item.quantity}</b><button onClick={() => onEdit(item)}>編集</button><button className="danger-link" onClick={() => onDelete(item.id)}>削除</button></article>)}</div>}
    {!items.length && <EmptyState title="持ち物が登録されていない" copy="持っている数を登録すると、同じ持ち物の使いすぎを防げる。" />}</section>;
}

function BuildPanel({ roster, items, master, masterRelations, teams, format, pickCount, suggestions, selected, setSelected, onRoster }: { roster: RosterEntry[]; items: OwnedItem[]; master: MasterEntry[]; masterRelations: AppState["masterRelations"]; teams: BattleTeam[]; format: BattleFormat; pickCount: number; suggestions: ReturnType<typeof createSuggestions>; selected: number; setSelected: (v: number) => void; onRoster: () => void }) {
  const uniqueSpeciesCount = distinctPokemonCount(roster, master);
  const ready = uniqueSpeciesCount >= 6;
  const selectedSuggestion = suggestions[selected];
  const acquisitionAdvice = selectedSuggestion
    ? createAcquisitionAdvice(selectedSuggestion.members, items, master, masterRelations, format)
    : [];
  const suggestedBreakdown = selectedSuggestion ? teamScoreBreakdown(selectedSuggestion.members, selectedSuggestion.profile) : undefined;
  const suggestedTypeCount = selectedSuggestion ? typeCoverage(selectedSuggestion.members) : 0;
  const scoredTeams = selectedSuggestion ? teams.map((team) => {
    const breakdown = teamScoreBreakdown(team.members, selectedSuggestion.profile);
    return { team, breakdown, typeCount: typeCoverage(team.members), scoreDifference: breakdown.score - selectedSuggestion.score };
  }) : [];
  return <section>
    <PageTitle
      eyebrow="TEAM BUILDER"
      title="チーム構築"
      copy={ready ? "上部で選んだ対戦形式に合わせて3案を提案する。ここは検討用の候補であり、対戦ナビで使う実在のマイチームとは別である。" : "上部の対戦形式に合わせ、ボックスに異なるポケモンが6体そろったら構築を提案する。"}
      count={format === "single" ? "シングル" : "ダブル"}
    />
    {!ready ? (
      <EmptyState title={`あと${6 - uniqueSpeciesCount}種類登録すると提案できる`} copy="同じポケモンはボックスに複数登録できるが、チームには1体しか入れられない。" action="ボックスに登録" onAction={onRoster} />
    ) : (
      <>
        <div className="suggestion-tabs">{suggestions.map((s, i) => <button key={`${s.title}-${i}`} className={selected === i ? "active" : ""} onClick={() => setSelected(i)}><small>PLAN {String(i + 1).padStart(2, "0")}</small><strong>{s.title}</strong><span>{s.tone}</span><b>{s.score}<em>/100</em></b></button>)}</div>
        {selectedSuggestion && <><section className="team-comparison"><header><div><small>MY TEAMS VS PROPOSAL</small><h2>{teams.length ? `登録済みマイチーム ${teams.length}件` : "マイチームが未登録"}</h2><p>{teams.length ? "すべてのマイチームを、いま選んでいる提案と同じ評価軸で比較する。" : "マイチームを登録すると、提案とのスコア差とタイプの幅を確認できる。"}</p></div><b>{selectedSuggestion.score}<em>/100</em></b></header>{scoredTeams.length ? <div className="my-team-comparison-list">{scoredTeams.map(({ team, breakdown, typeCount, scoreDifference }) => <article className="my-team-comparison" key={team.id}><header><div><small>MY TEAM</small><h3>{team.name}</h3></div><b>{breakdown.score}<em>/100</em></b></header><div className="team-comparison-summary"><article><small>スコア差</small><strong className={scoreDifference >= 0 ? "positive" : "negative"}>{scoreDifference >= 0 ? "+" : ""}{scoreDifference} pts</strong><span>提案 {selectedSuggestion.score} pts</span></article><article><small>タイプの幅</small><strong>{typeCount} 種類</strong><span>提案 {suggestedTypeCount} 種類</span></article><article><small>メンバー構成</small><strong>{team.members.length} / 6</strong><span>提案と見比べて調整</span></article></div></article>)}</div> : <p className="team-comparison-empty">マイチームを登録すると、ここにすべてのチームの比較を表示する。</p>}<div className="score-breakdown-grid">{suggestedBreakdown && <ScoreBreakdownCard title={`提案：${selectedSuggestion.title}チーム`} breakdown={suggestedBreakdown} />}{scoredTeams.map(({ team, breakdown }) => <ScoreBreakdownCard key={team.id} title={`マイチーム：${team.name}`} breakdown={breakdown} />)}</div></section><article className="suggestion-detail"><div className="suggestion-heading"><div><span className="recommend-badge">{selected === 0 ? "構築の提案候補" : "別の構築候補"}</span><h2>{selectedSuggestion.title}チーム</h2></div><p><span>?</span><strong>この提案の理由</strong>{selectedSuggestion.reason}</p></div><div className="suggested-party">{selectedSuggestion.members.map((mon, i) => <MonsterTile key={mon.id} mon={mon} index={i} />)}</div><section className="acquisition-advice"><header><small>HOW TO IMPROVE</small><h2>次に取得すると強くなるもの</h2><p>この構築候補の弱点・タイプ範囲・能力値・持ち物在庫から、次の一手を提案する。</p></header><div>{acquisitionAdvice.map((advice) => <article key={advice.label}><small>{advice.label}</small><h3>{advice.title}</h3><p>{advice.copy}</p><ul>{advice.points.map((point) => <li key={point}>{point}</li>)}</ul></article>)}</div></section><div className="beginner-explain"><strong>使い方の目安</strong><span>① 提案を構築検討に使う</span><span>② 実際に使う6体は「マイチーム」に登録する</span><span>③ 対戦ナビは登録したマイチームから選出する</span></div></article></>}
      </>
    )}
  </section>;
}

function ScoreBreakdownCard({ title, breakdown }: { title: string; breakdown: TeamScoreBreakdown }) {
  return <article className="score-breakdown-card"><header><div><small>SCORE BREAKDOWN</small><h3>{title}</h3></div><b>{breakdown.score}<em>/100</em></b></header><ul>{breakdown.items.map((item) => <li key={item.label} className={item.kind}><span><strong>{item.label}</strong><small>{item.detail}</small></span><b className={item.points > 0 ? "positive" : item.points < 0 ? "negative" : "neutral"}>{item.points > 0 ? "+" : ""}{item.points} pts</b></li>)}</ul></article>;
}

function BattleTeamsPanel({ teams, roster, activeTeamId, onCreate, onEdit, onUse, onDelete }: { teams: BattleTeam[]; roster: RosterEntry[]; activeTeamId: number; onCreate: () => void; onEdit: (team: BattleTeam) => void; onUse: (id: number) => void; onDelete: (id: number) => void }) {
  return <section><PageTitle eyebrow="MY BATTLE TEAMS" title="マイチーム" copy="実際に使う6体を、ボックスから選んで保存する。複数のチームを登録できる。" count={`${teams.length}チーム`} />
    {!teams.length && <EmptyState title="バトルチームが未登録" copy="ボックスから異なる6体を選び、対戦ナビで使う実際のチームを登録する。" action="チームを作成" onAction={onCreate} />}
    {!!teams.length && <div className="team-grid">{teams.map((team) => <article className={`team-card ${team.id === activeTeamId ? "active" : ""}`} key={team.id}><header><div><small>MY BATTLE TEAM</small><h2>{team.name}</h2></div>{team.id === activeTeamId && <span>対戦ナビで使用中</span>}</header><div className="team-member-grid">{team.members.map((member, index) => <MonsterTile key={member.id} mon={member} index={index} compact />)}</div><div className="card-actions"><button onClick={() => onUse(team.id)}>このチームで対戦ナビ</button><button onClick={() => onEdit(team)}>編集</button><button className="danger-link" onClick={() => onDelete(team.id)}>削除</button></div></article>)}</div>}
    {!!teams.length && roster.length < 6 && <p className="field-hint">ボックスのポケモンを増やすと、別のチームも作成できる。</p>}
  </section>;
}

function BattlePanel({ format, pickCount, teams, selectedTeam, onSelectTeam, onManageTeams, opponents, setOpponents, selection, enemyLead, setEnemyLead, lead }: { format: BattleFormat; pickCount: number; teams: BattleTeam[]; selectedTeam?: BattleTeam; onSelectTeam: (id: number) => void; onManageTeams: () => void; opponents: string[]; setOpponents: (v: string[]) => void; selection: ReturnType<typeof chooseBattleTeam>; enemyLead: string; setEnemyLead: (v: string) => void; lead?: ReturnType<typeof recommendAgainstLead> }) {
  const settingLabel = format === "single" ? "シングル" : "ダブル";
  if (!selectedTeam) return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="実際に使用するマイチームを選んでから、相手への選出を提案する。" count={settingLabel} /><EmptyState title="マイチームを選択しよう" copy="チーム構築の提案ではなく、自分で登録した6体のチームを対戦ナビの前提にする。" action={teams.length ? "マイチームを選ぶ" : "チームを作成"} onAction={onManageTeams} /></section>;
  return <section><PageTitle eyebrow="BATTLE NAVI" title="対戦ナビ" copy="相手バトルチームのポケモン名を入力すると、選択中のマイチーム6体だけから選出を提案する。" count={settingLabel} />
    <section className="panel active-team-panel"><div><small>USING MY BATTLE TEAM</small><h2>{selectedTeam.name}</h2><p>この6体を前提に、相手への選出と先発を提案する。</p></div>{teams.length > 1 && <label>使用するチーム<select value={selectedTeam.id} onChange={(event) => onSelectTeam(Number(event.target.value))}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}<div className="active-team-members">{selectedTeam.members.map((member, index) => <MonsterTile key={member.id} mon={member} index={index} compact />)}</div><button onClick={onManageTeams}>マイチームを管理</button></section>
    <div className="battle-flow"><span className="done">1<small>相手の6体</small></span><i></i><span className="done">2<small>{pickCount}体を選出</small></span><i></i><span>3<small>先発を決定</small></span></div>
    <div className="battle-layout"><section className="panel opponent-panel"><div className="panel-head"><div><small>OPPONENT BATTLE TEAM</small><h2>相手バトルチーム6体</h2></div><span>名前だけ入力</span></div><p className="field-hint">タイプはポケモン図鑑マスターから自動で照合する。メガ進化が判明した場合は「メガ◯◯」を入力する。</p><div className="opponent-grid">{opponents.map((value, i) => <label key={i}><span>{i + 1}</span><input value={value} onChange={(e) => { const next = [...opponents]; next[i] = e.target.value; setOpponents(next); }} placeholder="ポケモン名" /></label>)}</div></section>
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
      <section className="panel settings-card"><h2>対戦設定</h2><p>現在の設定。画面上部から変更すると、チーム構築と対戦ナビへすぐに反映される。</p><div className="setting-summary"><span>対戦形式<strong>{format === "single" ? "シングル" : "ダブル"}</strong></span></div></section>
      <section className="panel danger-zone"><h2>ログアウト・削除</h2><p>ログアウトしても登録データは残る。アカウント削除はボックスと持ち物を含む全データを削除する。</p>{mode === "live" ? <><a href="/signout-with-chatgpt?return_to=%2F">ログアウト</a>{confirmDelete ? <button className="danger-button" onClick={onDelete}>本当に削除する</button> : <button className="danger-link" onClick={() => setConfirmDelete(true)}>アカウントを削除</button>}</> : <Link href="/">体験版を終了</Link>}</section>
    </div>
  </section>;
}

function PageTitle({ eyebrow, title, copy, count }: { eyebrow: string; title: string; copy: string; count?: string }) {
  return <div className="page-title"><div><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>{count && <strong>{count}</strong>}</div>;
}
function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><span>◇</span><h2>{title}</h2><p>{copy}</p>{action && <button onClick={onAction}>{action} →</button>}</div>; }

function RosterModal({ value, master, masterRelations, onClose, onSave }: { value: RosterEntry; master: MasterEntry[]; masterRelations: AppState["masterRelations"]; onClose: () => void; onSave: (v: RosterEntry) => Promise<void> }) {
  const [draft, setDraft] = useState({ ...value, moves: [...value.moves], stats: { ...value.stats } });
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
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
  const legacyOption = (current: string, options: MasterEntry[]) => current && !options.some((entry) => entry.name === current)
    ? <option value={current} disabled>{current}（マスター未登録）</option> : null;
  const save = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try { await onSave(draft); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <Modal title={draft.id ? "ポケモンを編集" : "ボックスにポケモンを登録"} subtitle="マスターデータから選択して対戦情報を登録する" onClose={onClose}>
    <div className="form-grid"><label className="wide">ポケモン *<select value={draft.species} onChange={(e) => { const selected = pokemon.find((entry) => entry.name === e.target.value); const stats = selected?.data?.stats as Stats | undefined; setDraft((current) => ({ ...current, species: e.target.value, types: selected?.type ?? "", ability: "", form: "", megaEvolution: Boolean(selected?.data?.mega), moves: ["", "", "", ""], stats: stats ? { ...stats } : current.stats })); }}><option value="">選択する</option>{legacyOption(draft.species, pokemon)}{pokemon.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}{entry.data?.mega ? "（メガシンカ）" : entry.data?.baseName ? "（別フォルム）" : entry.type ? `（${entry.type}）` : ""}</option>)}</select><small className="field-hint">通常・別フォルム・メガシンカを1つの一覧から選ぶ。同じ図鑑番号のポケモンはバトルチームに重複させない。</small></label><label>ニックネーム<input value={draft.nickname} onChange={(e) => update("nickname", e.target.value)} /></label><label>タイプ<input value={draft.types || "ポケモンのマスター情報から設定"} disabled /></label><label>特性<select value={draft.ability} onChange={(e) => update("ability", e.target.value)}><option value="">未設定</option>{legacyOption(draft.ability, abilities)}{abilities.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>持ち物<select value={draft.heldItem} onChange={(e) => update("heldItem", e.target.value)}><option value="">なし・未設定</option>{legacyOption(draft.heldItem, items)}{items.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>性格<select value={draft.nature} onChange={(e) => update("nature", e.target.value)}><option value="">未設定</option>{legacyOption(draft.nature, natures)}{natures.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label className="toggle-field"><input type="checkbox" checked={draft.megaEvolution} disabled /><span><strong>{draft.megaEvolution ? "メガシンカ" : draft.species ? "通常・別フォルム" : "未選択"}</strong><small>選択したポケモンのマスターデータから自動判定する</small></span></label>
      <fieldset className="wide"><legend>技（最大4つ）</legend><div className="move-input-grid">{[0,1,2,3].map((i) => <select key={i} value={draft.moves[i] ?? ""} onChange={(e) => { const nextMoves = [...draft.moves]; nextMoves[i] = e.target.value; update("moves", nextMoves); }}><option value="">技 {i + 1}：未設定</option>{legacyOption(draft.moves[i] ?? "", moves)}{moves.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select>)}</div></fieldset>
      <fieldset className="wide"><legend>種族値・ステータス目安</legend><div className="stat-input-grid">{([["hp","HP"],["attack","攻撃"],["defense","防御"],["spAttack","特攻"],["spDefense","特防"],["speed","素早さ"]] as [keyof Stats,string][]).map(([key,label]) => <label key={key}>{label}<input type="number" min="1" max="255" value={draft.stats[key]} onChange={(e) => update("stats", { ...draft.stats, [key]: Number(e.target.value) })} /></label>)}</div></fieldset>
      <label className="wide">メモ<textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} placeholder="使い方や注意点を記録" /></label>
    </div><div className="modal-actions"><button onClick={onClose} disabled={saving}>キャンセル</button><button className="form-primary" disabled={saving || !draft.species.trim()} onClick={() => void save()}>{saving ? "保存中…" : "保存する"}</button></div>
  </Modal>;
}

function BattleTeamModal({ value, roster, master, onClose, onSave }: { value: { id: number; name: string; memberIds: number[] }; roster: RosterEntry[]; master: MasterEntry[]; onClose: () => void; onSave: (value: { id: number; name: string; memberIds: number[] }) => Promise<void> }) {
  const [name, setName] = useState(value.name);
  const [memberIds, setMemberIds] = useState(value.memberIds);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const selectedMembers = roster.filter((member) => memberIds.includes(member.id));
  const selectedIdentities = new Map(selectedMembers.map((member) => [pokemonIdentity(member, master), member.id]));
  const toggleMember = (member: RosterEntry) => {
    setMemberIds((current) => {
      if (current.includes(member.id)) return current.filter((id) => id !== member.id);
      if (current.length >= 6 || selectedIdentities.has(pokemonIdentity(member, master))) return current;
      return [...current, member.id];
    });
  };
  const save = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try { await onSave({ id: value.id, name: name.trim(), memberIds }); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <Modal title={value.id ? "マイチームを編集" : "マイチームを作成"} subtitle="実際に使う6体をボックスから選ぶ。構築提案とは別に保存される。" onClose={onClose}>
    <div className="form-grid"><label className="wide">チーム名 *<input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="例：シングル用バランス" /></label><fieldset className="wide team-member-picker"><legend>メンバー {memberIds.length} / 6</legend><p>同じ図鑑番号のポケモンは1体だけ選択できる。</p><div>{roster.map((member) => { const selected = memberIds.includes(member.id); const duplicate = selectedIdentities.has(pokemonIdentity(member, master)) && !selected; const limitReached = memberIds.length >= 6 && !selected; return <label key={member.id} className={selected ? "selected" : ""}><input type="checkbox" checked={selected} disabled={saving || duplicate || limitReached} onChange={() => toggleMember(member)} /><MonsterTile mon={member} index={member.id} compact /><small>{duplicate ? "同じポケモンを選択済み" : ""}</small></label>; })}</div>{!roster.length && <p>先にボックスへポケモンを登録する必要がある。</p>}</fieldset></div><div className="modal-actions"><button onClick={onClose} disabled={saving}>キャンセル</button><button className="form-primary" disabled={saving || !name.trim() || memberIds.length !== 6} onClick={() => void save()}>{saving ? "保存中…" : "6体で保存する"}</button></div>
  </Modal>;
}

function ItemModal({ value, master, onClose, onSave }: { value: OwnedItem; master: MasterEntry[]; onClose: () => void; onSave: (v: OwnedItem) => Promise<void> }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const items = master.filter((entry) => entry.category === "item");
  const save = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try { await onSave(draft); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <Modal title={draft.id ? "持ち物を編集" : "持ち物を登録"} subtitle="個数を登録すると構築時の重複を確認できる" onClose={onClose}><div className="form-grid"><label className="wide">持ち物 *<select value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}><option value="">選択する</option>{draft.name && !items.some((entry) => entry.name === draft.name) && <option value={draft.name} disabled>{draft.name}（マスター未登録）</option>}{items.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><label>個数<input type="number" min="0" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></label><label className="wide">メモ<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label></div><div className="modal-actions"><button onClick={onClose} disabled={saving}>キャンセル</button><button className="form-primary" disabled={saving || !draft.name.trim()} onClick={() => void save()}>{saving ? "保存中…" : "保存する"}</button></div></Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><small>EDITOR</small><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button onClick={onClose} aria-label="閉じる">×</button></header>{children}</section></div>;
}
