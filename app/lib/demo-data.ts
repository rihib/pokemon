import type { AppState, MasterEntry, MasterRelation, RosterEntry } from "./types";
import { championsPokemonMaster, championsVariantMaster } from "./champions-pokemon";

export const demoRoster: RosterEntry[] = [
  { id: 1, species: "カイリュー", nickname: "", types: "ドラゴン・ひこう", ability: "マルチスケイル", heldItem: "こだわりハチマキ", nature: "いじっぱり", form: "", megaEvolution: false, moves: ["しんそく", "げきりん", "じしん", "ほのおのパンチ"], stats: { hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80 }, notes: "終盤の掃除役" },
  { id: 2, species: "サーフゴー", nickname: "", types: "はがね・ゴースト", ability: "おうごんのからだ", heldItem: "こだわりメガネ", nature: "ひかえめ", form: "", megaEvolution: false, moves: ["ゴールドラッシュ", "シャドーボール", "10まんボルト", "トリック"], stats: { hp: 87, attack: 60, defense: 95, spAttack: 133, spDefense: 91, speed: 84 }, notes: "変化技に強い" },
  { id: 3, species: "アシレーヌ", nickname: "", types: "みず・フェアリー", ability: "げきりゅう", heldItem: "とつげきチョッキ", nature: "ひかえめ", form: "", megaEvolution: false, moves: ["ムーンフォース", "うたかたのアリア", "エナジーボール", "アクアジェット"], stats: { hp: 80, attack: 74, defense: 74, spAttack: 126, spDefense: 116, speed: 60 }, notes: "ドラゴンへの切り返し" },
  { id: 4, species: "バンギラス", nickname: "", types: "いわ・あく", ability: "すなおこし", heldItem: "とつげきチョッキ", nature: "いじっぱり", form: "", megaEvolution: false, moves: ["いわなだれ", "かみくだく", "じしん", "まもる"], stats: { hp: 100, attack: 134, defense: 110, spAttack: 95, spDefense: 100, speed: 61 }, notes: "高い耐久と攻撃力" },
  { id: 5, species: "ガブリアス", nickname: "", types: "ドラゴン・じめん", ability: "さめはだ", heldItem: "きあいのタスキ", nature: "ようき", form: "", megaEvolution: false, moves: ["じしん", "スケイルショット", "つるぎのまい", "ステルスロック"], stats: { hp: 108, attack: 130, defense: 95, spAttack: 80, spDefense: 85, speed: 102 }, notes: "先発適性が高い" },
  { id: 6, species: "エルフーン", nickname: "", types: "くさ・フェアリー", ability: "いたずらごころ", heldItem: "きあいのタスキ", nature: "おくびょう", form: "", megaEvolution: false, moves: ["ムーンフォース", "おいかぜ", "アンコール", "まもる"], stats: { hp: 60, attack: 67, defense: 85, spAttack: 77, spDefense: 75, speed: 116 }, notes: "素早い補助役" },
  { id: 7, species: "ウルガモス", nickname: "", types: "むし・ほのお", ability: "ほのおのからだ", heldItem: "あつぞこブーツ", nature: "おくびょう", form: "", megaEvolution: false, moves: ["ほのおのまい", "むしのさざめき", "ちょうのまい", "ギガドレイン"], stats: { hp: 85, attack: 60, defense: 65, spAttack: 135, spDefense: 105, speed: 100 }, notes: "終盤の全抜き役" },
  { id: 8, species: "キョジオーン", nickname: "", types: "いわ", ability: "きよめのしお", heldItem: "たべのこし", nature: "わんぱく", form: "", megaEvolution: false, moves: ["しおづけ", "じこさいせい", "まもる", "じわれ"], stats: { hp: 100, attack: 100, defense: 130, spAttack: 45, spDefense: 90, speed: 35 }, notes: "長期戦の軸" },
];

const moveTypes: Record<string, string> = {
  "しんそく": "ノーマル", "げきりん": "ドラゴン", "じしん": "じめん", "ほのおのパンチ": "ほのお",
  "ゴールドラッシュ": "はがね", "シャドーボール": "ゴースト", "10まんボルト": "でんき", "トリック": "エスパー",
  "ムーンフォース": "フェアリー", "うたかたのアリア": "みず", "エナジーボール": "くさ", "アクアジェット": "みず",
  "グラススライダー": "くさ", "ウッドハンマー": "くさ", "とんぼがえり": "むし", "ねこだまし": "ノーマル",
  "スケイルショット": "ドラゴン", "つるぎのまい": "ノーマル", "ステルスロック": "いわ", "れいとうビーム": "こおり",
  "ほうでん": "でんき", "じこさいせい": "ノーマル", "トリックルーム": "エスパー", "ほのおのまい": "ほのお",
  "むしのさざめき": "むし", "ちょうのまい": "むし", "ギガドレイン": "くさ", "しおづけ": "いわ",
  "まもる": "ノーマル", "じわれ": "じめん",
  "いわなだれ": "いわ", "かみくだく": "あく", "おいかぜ": "ひこう", "アンコール": "ノーマル",
};

export const demoMaster: MasterEntry[] = [
  ...championsPokemonMaster,
  ...["こだわりハチマキ", "こだわりメガネ", "きあいのタスキ", "とつげきチョッキ", "あつぞこブーツ", "しんかのきせき", "たべのこし"].map((name, index) => ({ id: 20 + index, category: "item" as const, name, type: "持ち物", description: "構築で使用する持ち物。" })),
  ...[
    ["オボンのみ", "HPが半分以下になったときにHPを回復するきのみ。"],
    ["ひかりのこな", "相手の技の命中率を下げる持ち物。"],
    ["ライチュウナイトX", "ライチュウをMega Evolutionさせるためのメガストーン。"],
    ["ボスゴドラナイト", "ボスゴドラをMega Evolutionさせるためのメガストーン。"],
    ["ラムのみ", "状態異常を1回だけ回復するきのみ。"],
  ].map(([name, description], index) => ({ id: 27 + index, category: "item" as const, name, type: "持ち物", description })),
  ...["マルチスケイル", "おうごんのからだ", "げきりゅう", "すなおこし", "さめはだ", "いたずらごころ", "ほのおのからだ", "きよめのしお"].map((name, index) => ({ id: 40 + index, category: "ability" as const, name, type: "特性", description: "ポケモンが持つ特性。" })),
  ...["いじっぱり", "ひかえめ", "ようき", "ずぶとい", "おくびょう", "わんぱく"].map((name, index) => ({ id: 60 + index, category: "nature" as const, name, type: "性格", description: "ステータス補正に関わる性格。" })),
  ...["しんそく", "げきりん", "じしん", "ほのおのパンチ", "ゴールドラッシュ", "シャドーボール", "10まんボルト", "トリック", "ムーンフォース", "うたかたのアリア", "エナジーボール", "アクアジェット", "いわなだれ", "かみくだく", "おいかぜ", "アンコール", "スケイルショット", "つるぎのまい", "ステルスロック", "れいとうビーム", "ほうでん", "じこさいせい", "トリックルーム", "ほのおのまい", "むしのさざめき", "ちょうのまい", "ギガドレイン", "しおづけ", "まもる", "じわれ"].map((name, index) => ({ id: 80 + index, category: "move" as const, name, type: moveTypes[name] ?? "", description: "バトルで使用する技。" })),
  ...["ノーマル", "ほのお", "みず", "でんき", "くさ", "こおり", "かくとう", "どく", "じめん", "ひこう", "エスパー", "むし", "いわ", "ゴースト", "ドラゴン", "あく", "はがね", "フェアリー"].map((name, index) => ({ id: 200 + index, category: "type" as const, name, type: "バトルタイプ", description: "タイプ相性の計算に使用する。" })),
  { id: 250, category: "regulation", name: "Regulation M-B", type: "2026-06-17〜2026-09-02", description: "現在のランクバトル用Regulation。", data: { startsAt: "2026-06-17", endsAt: "2026-09-02", singlePickCount: 3, doublePickCount: 4, active: true } },
];

const masterBy = (category: MasterEntry["category"], name: string) =>
  demoMaster.find((entry) => entry.category === category && entry.name === name);

export const demoMasterRelations: MasterRelation[] = [];
let relationId = 1;
for (const mon of demoRoster) {
  const pokemon = masterBy("pokemon", mon.species);
  if (!pokemon) continue;
  const ability = masterBy("ability", mon.ability);
  if (ability) demoMasterRelations.push({ id: relationId++, sourceId: pokemon.id, targetId: ability.id, kind: "has_ability" });
  for (const moveName of mon.moves) {
    const move = masterBy("move", moveName);
    if (move) demoMasterRelations.push({ id: relationId++, sourceId: pokemon.id, targetId: move.id, kind: "learns_move" });
  }
}
for (const form of championsVariantMaster) {
  const baseName = String(form.data?.baseName ?? "");
  const base = masterBy("pokemon", baseName);
  if (base) {
    demoMasterRelations.push({ id: relationId++, sourceId: form.id, targetId: base.id, kind: "form_of" });
  }
}
const regulation = masterBy("regulation", "Regulation M-B");
if (regulation) {
  for (const entry of demoMaster.filter((candidate) => ["pokemon", "item"].includes(candidate.category))) {
    const kind: MasterRelation["kind"] = entry.category === "pokemon" ? "allows_pokemon" : "allows_item";
    demoMasterRelations.push({ id: relationId++, sourceId: regulation.id, targetId: entry.id, kind });
  }
}

const typeChart: Record<string, Record<string, number>> = {
  "ノーマル": { "いわ": 0.5, "ゴースト": 0, "はがね": 0.5 },
  "ほのお": { "ほのお": 0.5, "みず": 0.5, "くさ": 2, "こおり": 2, "むし": 2, "いわ": 0.5, "ドラゴン": 0.5, "はがね": 2 },
  "みず": { "ほのお": 2, "みず": 0.5, "くさ": 0.5, "じめん": 2, "いわ": 2, "ドラゴン": 0.5 },
  "でんき": { "みず": 2, "でんき": 0.5, "くさ": 0.5, "じめん": 0, "ひこう": 2, "ドラゴン": 0.5 },
  "くさ": { "ほのお": 0.5, "みず": 2, "くさ": 0.5, "どく": 0.5, "じめん": 2, "ひこう": 0.5, "むし": 0.5, "いわ": 2, "ドラゴン": 0.5, "はがね": 0.5 },
  "こおり": { "ほのお": 0.5, "みず": 0.5, "くさ": 2, "こおり": 0.5, "じめん": 2, "ひこう": 2, "ドラゴン": 2, "はがね": 0.5 },
  "かくとう": { "ノーマル": 2, "こおり": 2, "どく": 0.5, "ひこう": 0.5, "エスパー": 0.5, "むし": 0.5, "いわ": 2, "ゴースト": 0, "あく": 2, "はがね": 2, "フェアリー": 0.5 },
  "どく": { "くさ": 2, "どく": 0.5, "じめん": 0.5, "いわ": 0.5, "ゴースト": 0.5, "はがね": 0, "フェアリー": 2 },
  "じめん": { "ほのお": 2, "でんき": 2, "くさ": 0.5, "どく": 2, "ひこう": 0, "むし": 0.5, "いわ": 2, "はがね": 2 },
  "ひこう": { "でんき": 0.5, "くさ": 2, "かくとう": 2, "むし": 2, "いわ": 0.5, "はがね": 0.5 },
  "エスパー": { "かくとう": 2, "どく": 2, "エスパー": 0.5, "あく": 0, "はがね": 0.5 },
  "むし": { "ほのお": 0.5, "くさ": 2, "かくとう": 0.5, "どく": 0.5, "ひこう": 0.5, "エスパー": 2, "ゴースト": 0.5, "あく": 2, "はがね": 0.5, "フェアリー": 0.5 },
  "いわ": { "ほのお": 2, "こおり": 2, "かくとう": 0.5, "じめん": 0.5, "ひこう": 2, "むし": 2, "はがね": 0.5 },
  "ゴースト": { "ノーマル": 0, "エスパー": 2, "ゴースト": 2, "あく": 0.5 },
  "ドラゴン": { "ドラゴン": 2, "はがね": 0.5, "フェアリー": 0 },
  "あく": { "かくとう": 0.5, "エスパー": 2, "ゴースト": 2, "あく": 0.5, "フェアリー": 0.5 },
  "はがね": { "ほのお": 0.5, "みず": 0.5, "でんき": 0.5, "こおり": 2, "いわ": 2, "はがね": 0.5, "フェアリー": 2 },
  "フェアリー": { "ほのお": 0.5, "かくとう": 2, "どく": 0.5, "ドラゴン": 2, "あく": 2, "はがね": 0.5 },
};
for (const [attackingName, defenses] of Object.entries(typeChart)) {
  const attacking = masterBy("type", attackingName);
  if (!attacking) continue;
  for (const [defendingName, multiplier] of Object.entries(defenses)) {
    const defending = masterBy("type", defendingName);
    if (defending) {
      demoMasterRelations.push({
        id: relationId++,
        sourceId: attacking.id,
        targetId: defending.id,
        kind: "type_effectiveness",
        data: { multiplier },
      });
    }
  }
}

export const demoState: AppState = {
  user: { id: 1, email: "demo@example.com", displayName: "ビギナートレーナー", handle: "beginner", role: "admin", preferredFormat: "single" },
  roster: demoRoster,
  battleTeams: [{ id: 1, name: "はじめてのバトルチーム", members: demoRoster.slice(0, 6) }],
  items: [
    { id: 1, name: "こだわりハチマキ", quantity: 1, notes: "カイリュー用" },
    { id: 2, name: "きあいのタスキ", quantity: 2, notes: "先発候補に持たせる" },
    { id: 3, name: "たべのこし", quantity: 1, notes: "耐久役向け" },
  ],
  master: demoMaster,
  masterRelations: demoMasterRelations,
};
