import type { AppState, MasterEntry, RosterEntry } from "./types";

export const demoRoster: RosterEntry[] = [
  { id: 1, species: "カイリュー", nickname: "", types: "ドラゴン・ひこう", ability: "マルチスケイル", heldItem: "こだわりハチマキ", nature: "いじっぱり", megaEvolution: false, moves: ["しんそく", "げきりん", "じしん", "ほのおのパンチ"], stats: { hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80 }, notes: "終盤の掃除役" },
  { id: 2, species: "サーフゴー", nickname: "", types: "はがね・ゴースト", ability: "おうごんのからだ", heldItem: "こだわりメガネ", nature: "ひかえめ", megaEvolution: false, moves: ["ゴールドラッシュ", "シャドーボール", "10まんボルト", "トリック"], stats: { hp: 87, attack: 60, defense: 95, spAttack: 133, spDefense: 91, speed: 84 }, notes: "変化技に強い" },
  { id: 3, species: "アシレーヌ", nickname: "", types: "みず・フェアリー", ability: "げきりゅう", heldItem: "とつげきチョッキ", nature: "ひかえめ", megaEvolution: false, moves: ["ムーンフォース", "うたかたのアリア", "エナジーボール", "アクアジェット"], stats: { hp: 80, attack: 74, defense: 74, spAttack: 126, spDefense: 116, speed: 60 }, notes: "ドラゴンへの切り返し" },
  { id: 4, species: "ゴリランダー", nickname: "", types: "くさ", ability: "グラスメイカー", heldItem: "とつげきチョッキ", nature: "いじっぱり", megaEvolution: false, moves: ["グラススライダー", "ウッドハンマー", "とんぼがえり", "ねこだまし"], stats: { hp: 100, attack: 125, defense: 90, spAttack: 60, spDefense: 70, speed: 85 }, notes: "先制技と交代支援" },
  { id: 5, species: "ガブリアス", nickname: "", types: "ドラゴン・じめん", ability: "さめはだ", heldItem: "きあいのタスキ", nature: "ようき", megaEvolution: false, moves: ["じしん", "スケイルショット", "つるぎのまい", "ステルスロック"], stats: { hp: 108, attack: 130, defense: 95, spAttack: 80, spDefense: 85, speed: 102 }, notes: "先発適性が高い" },
  { id: 6, species: "ポリゴン2", nickname: "", types: "ノーマル", ability: "ダウンロード", heldItem: "しんかのきせき", nature: "ずぶとい", megaEvolution: false, moves: ["れいとうビーム", "ほうでん", "じこさいせい", "トリックルーム"], stats: { hp: 85, attack: 80, defense: 90, spAttack: 105, spDefense: 95, speed: 60 }, notes: "安定した受け役" },
  { id: 7, species: "ウルガモス", nickname: "", types: "むし・ほのお", ability: "ほのおのからだ", heldItem: "あつぞこブーツ", nature: "おくびょう", megaEvolution: false, moves: ["ほのおのまい", "むしのさざめき", "ちょうのまい", "ギガドレイン"], stats: { hp: 85, attack: 60, defense: 65, spAttack: 135, spDefense: 105, speed: 100 }, notes: "終盤の全抜き役" },
  { id: 8, species: "キョジオーン", nickname: "", types: "いわ", ability: "きよめのしお", heldItem: "たべのこし", nature: "わんぱく", megaEvolution: false, moves: ["しおづけ", "じこさいせい", "まもる", "じわれ"], stats: { hp: 100, attack: 100, defense: 130, spAttack: 45, spDefense: 90, speed: 35 }, notes: "長期戦の軸" },
];

export const demoMaster: MasterEntry[] = [
  { id: 1, category: "pokemon", name: "カイリュー", type: "ドラゴン・ひこう", description: "高い攻撃とマルチスケイルによる行動保証が特徴。" },
  { id: 2, category: "pokemon", name: "サーフゴー", type: "はがね・ゴースト", description: "変化技を受けない特殊アタッカー。" },
  { id: 3, category: "pokemon", name: "アシレーヌ", type: "みず・フェアリー", description: "特殊耐久と攻撃性能を両立。" },
  { id: 4, category: "pokemon", name: "ゴリランダー", type: "くさ", description: "先制技とフィールドで味方を支援。" },
  { id: 5, category: "pokemon", name: "ガブリアス", type: "ドラゴン・じめん", description: "素早さと攻撃範囲に優れる。" },
  { id: 6, category: "pokemon", name: "ポリゴン2", type: "ノーマル", description: "しんかのきせきによる高耐久。" },
  { id: 7, category: "pokemon", name: "ウルガモス", type: "むし・ほのお", description: "ちょうのまいから攻める特殊アタッカー。" },
  { id: 8, category: "pokemon", name: "キョジオーン", type: "いわ", description: "高い耐久力で長期戦を作る。" },
  ...["こだわりハチマキ", "こだわりメガネ", "きあいのタスキ", "とつげきチョッキ", "あつぞこブーツ", "しんかのきせき", "たべのこし"].map((name, index) => ({ id: 20 + index, category: "item" as const, name, type: "持ち物", description: "構築で使用する持ち物。" })),
  ...["マルチスケイル", "おうごんのからだ", "げきりゅう", "グラスメイカー", "さめはだ", "ダウンロード", "ほのおのからだ", "きよめのしお"].map((name, index) => ({ id: 40 + index, category: "ability" as const, name, type: "特性", description: "ポケモンが持つ特性。" })),
  ...["いじっぱり", "ひかえめ", "ようき", "ずぶとい", "おくびょう", "わんぱく"].map((name, index) => ({ id: 60 + index, category: "nature" as const, name, type: "性格", description: "ステータス補正に関わる性格。" })),
  ...["しんそく", "げきりん", "じしん", "ほのおのパンチ", "ゴールドラッシュ", "シャドーボール", "10まんボルト", "トリック", "ムーンフォース", "うたかたのアリア", "エナジーボール", "アクアジェット", "グラススライダー", "ウッドハンマー", "とんぼがえり", "ねこだまし", "スケイルショット", "つるぎのまい", "ステルスロック", "れいとうビーム", "ほうでん", "じこさいせい", "トリックルーム", "ほのおのまい", "むしのさざめき", "ちょうのまい", "ギガドレイン", "しおづけ", "まもる", "じわれ"].map((name, index) => ({ id: 80 + index, category: "move" as const, name, type: "技", description: "バトルで使用する技。" })),
];

export const demoState: AppState = {
  user: { id: 1, email: "demo@example.com", displayName: "ビギナートレーナー", handle: "beginner", role: "admin", preferredFormat: "single", preferredStyle: "balance" },
  roster: demoRoster,
  items: [
    { id: 1, name: "こだわりハチマキ", quantity: 1, notes: "カイリュー用" },
    { id: 2, name: "きあいのタスキ", quantity: 2, notes: "先発候補に持たせる" },
    { id: 3, name: "たべのこし", quantity: 1, notes: "耐久役向け" },
  ],
  master: demoMaster,
};
