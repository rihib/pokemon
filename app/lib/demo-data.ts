import type { AppState, MasterEntry, MasterRelation, RosterEntry } from "./types";

export const demoRoster: RosterEntry[] = [
  { id: 1, species: "カイリュー", nickname: "", types: "ドラゴン・ひこう", ability: "マルチスケイル", heldItem: "こだわりハチマキ", nature: "いじっぱり", form: "", megaEvolution: false, moves: ["しんそく", "げきりん", "じしん", "ほのおのパンチ"], stats: { hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80 }, notes: "終盤の掃除役" },
  { id: 2, species: "サーフゴー", nickname: "", types: "はがね・ゴースト", ability: "おうごんのからだ", heldItem: "こだわりメガネ", nature: "ひかえめ", form: "", megaEvolution: false, moves: ["ゴールドラッシュ", "シャドーボール", "10まんボルト", "トリック"], stats: { hp: 87, attack: 60, defense: 95, spAttack: 133, spDefense: 91, speed: 84 }, notes: "変化技に強い" },
  { id: 3, species: "アシレーヌ", nickname: "", types: "みず・フェアリー", ability: "げきりゅう", heldItem: "とつげきチョッキ", nature: "ひかえめ", form: "", megaEvolution: false, moves: ["ムーンフォース", "うたかたのアリア", "エナジーボール", "アクアジェット"], stats: { hp: 80, attack: 74, defense: 74, spAttack: 126, spDefense: 116, speed: 60 }, notes: "ドラゴンへの切り返し" },
  { id: 4, species: "ゴリランダー", nickname: "", types: "くさ", ability: "グラスメイカー", heldItem: "とつげきチョッキ", nature: "いじっぱり", form: "", megaEvolution: false, moves: ["グラススライダー", "ウッドハンマー", "とんぼがえり", "ねこだまし"], stats: { hp: 100, attack: 125, defense: 90, spAttack: 60, spDefense: 70, speed: 85 }, notes: "先制技と交代支援" },
  { id: 5, species: "ガブリアス", nickname: "", types: "ドラゴン・じめん", ability: "さめはだ", heldItem: "きあいのタスキ", nature: "ようき", form: "", megaEvolution: false, moves: ["じしん", "スケイルショット", "つるぎのまい", "ステルスロック"], stats: { hp: 108, attack: 130, defense: 95, spAttack: 80, spDefense: 85, speed: 102 }, notes: "先発適性が高い" },
  { id: 6, species: "ポリゴン2", nickname: "", types: "ノーマル", ability: "ダウンロード", heldItem: "しんかのきせき", nature: "ずぶとい", form: "", megaEvolution: false, moves: ["れいとうビーム", "ほうでん", "じこさいせい", "トリックルーム"], stats: { hp: 85, attack: 80, defense: 90, spAttack: 105, spDefense: 95, speed: 60 }, notes: "安定した受け役" },
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
};

export const demoMaster: MasterEntry[] = [
  { id: 1, category: "pokemon", name: "カイリュー", type: "ドラゴン・ひこう", description: "高い攻撃とマルチスケイルによる行動保証が特徴。" },
  { id: 2, category: "pokemon", name: "サーフゴー", type: "はがね・ゴースト", description: "変化技を受けない特殊アタッカー。" },
  { id: 3, category: "pokemon", name: "アシレーヌ", type: "みず・フェアリー", description: "特殊耐久と攻撃性能を両立。" },
  { id: 4, category: "pokemon", name: "ゴリランダー", type: "くさ", description: "先制技とフィールドで味方を支援。" },
  { id: 5, category: "pokemon", name: "ガブリアス", type: "ドラゴン・じめん", description: "素早さと攻撃範囲に優れる。" },
  { id: 6, category: "pokemon", name: "ポリゴン2", type: "ノーマル", description: "しんかのきせきによる高耐久。" },
  { id: 7, category: "pokemon", name: "ウルガモス", type: "むし・ほのお", description: "ちょうのまいから攻める特殊アタッカー。" },
  { id: 8, category: "pokemon", name: "キョジオーン", type: "いわ", description: "高い耐久力で長期戦を作る。" },
  ...[
    ["サーナイト", "エスパー・フェアリー", "特殊攻撃と補助技を両立しやすいポケモン。"],
    ["エンペルト", "みず・はがね", "多くの耐性を持つみずタイプ。"],
    ["ドサイドン", "じめん・いわ", "高い攻撃と物理耐久が特徴。"],
    ["カバルドン", "じめん", "高い物理耐久で場を整えるポケモン。"],
    ["ハッサム", "むし・はがね", "先制技と優れた耐性を持つ物理アタッカー。"],
    ["ライチュウ", "でんき", "素早さを生かして攻めるでんきタイプ。"],
    ["ニンフィア", "フェアリー", "特殊耐久とフェアリー技が強み。"],
    ["エルフーン", "くさ・フェアリー", "いたずらごころを生かした補助が得意。"],
    ["ボスゴドラ", "はがね・いわ", "高い物理耐久を持つポケモン。"],
    ["バンギラス", "いわ・あく", "高い能力値とすなおこしが特徴。"],
    ["ウインディ", "ほのお", "攻撃とサポートを使い分けられるほのおタイプ。"],
  ].map(([name, type, description], index) => ({ id: 9 + index, category: "pokemon" as const, name, type, description })),
  ...["こだわりハチマキ", "こだわりメガネ", "きあいのタスキ", "とつげきチョッキ", "あつぞこブーツ", "しんかのきせき", "たべのこし"].map((name, index) => ({ id: 20 + index, category: "item" as const, name, type: "持ち物", description: "構築で使用する持ち物。" })),
  ...[
    ["オボンのみ", "HPが半分以下になったときにHPを回復するきのみ。"],
    ["ひかりのこな", "相手の技の命中率を下げる持ち物。"],
    ["ライチュウナイトX", "ライチュウをMega Evolutionさせるためのメガストーン。"],
    ["ボスゴドラナイト", "ボスゴドラをMega Evolutionさせるためのメガストーン。"],
    ["ラムのみ", "状態異常を1回だけ回復するきのみ。"],
  ].map(([name, description], index) => ({ id: 27 + index, category: "item" as const, name, type: "持ち物", description })),
  ...["マルチスケイル", "おうごんのからだ", "げきりゅう", "グラスメイカー", "さめはだ", "ダウンロード", "ほのおのからだ", "きよめのしお"].map((name, index) => ({ id: 40 + index, category: "ability" as const, name, type: "特性", description: "ポケモンが持つ特性。" })),
  ...["いじっぱり", "ひかえめ", "ようき", "ずぶとい", "おくびょう", "わんぱく"].map((name, index) => ({ id: 60 + index, category: "nature" as const, name, type: "性格", description: "ステータス補正に関わる性格。" })),
  ...["しんそく", "げきりん", "じしん", "ほのおのパンチ", "ゴールドラッシュ", "シャドーボール", "10まんボルト", "トリック", "ムーンフォース", "うたかたのアリア", "エナジーボール", "アクアジェット", "グラススライダー", "ウッドハンマー", "とんぼがえり", "ねこだまし", "スケイルショット", "つるぎのまい", "ステルスロック", "れいとうビーム", "ほうでん", "じこさいせい", "トリックルーム", "ほのおのまい", "むしのさざめき", "ちょうのまい", "ギガドレイン", "しおづけ", "まもる", "じわれ"].map((name, index) => ({ id: 80 + index, category: "move" as const, name, type: moveTypes[name] ?? "", description: "バトルで使用する技。" })),
  ...["ノーマル", "ほのお", "みず", "でんき", "くさ", "こおり", "かくとう", "どく", "じめん", "ひこう", "エスパー", "むし", "いわ", "ゴースト", "ドラゴン", "あく", "はがね", "フェアリー"].map((name, index) => ({ id: 200 + index, category: "type" as const, name, type: "バトルタイプ", description: "タイプ相性の計算に使用する。" })),
  { id: 240, category: "form", name: "メガカイリュー", type: "ドラゴン・ひこう", description: "カイリューのMega Evolution。", data: { mega: true } },
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
const megaDragonite = masterBy("form", "メガカイリュー");
const dragonite = masterBy("pokemon", "カイリュー");
if (megaDragonite && dragonite) {
  demoMasterRelations.push({ id: relationId++, sourceId: megaDragonite.id, targetId: dragonite.id, kind: "form_of" });
}
const regulation = masterBy("regulation", "Regulation M-B");
if (regulation) {
  for (const entry of demoMaster.filter((candidate) => ["pokemon", "item", "form"].includes(candidate.category))) {
    const kind: MasterRelation["kind"] = entry.category === "pokemon" ? "allows_pokemon" : entry.category === "item" ? "allows_item" : "allows_form";
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
  items: [
    { id: 1, name: "こだわりハチマキ", quantity: 1, notes: "カイリュー用" },
    { id: 2, name: "きあいのタスキ", quantity: 2, notes: "先発候補に持たせる" },
    { id: 3, name: "たべのこし", quantity: 1, notes: "耐久役向け" },
  ],
  master: demoMaster,
  masterRelations: demoMasterRelations,
};
