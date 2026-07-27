import type { AppState, MasterEntry, RosterEntry } from "./types";

export const demoRoster: RosterEntry[] = [
  { id: 1, species: "カイリュー", nickname: "", level: 50, types: "ドラゴン・ひこう", teraType: "ノーマル", ability: "マルチスケイル", heldItem: "こだわりハチマキ", nature: "いじっぱり", role: "万能アタッカー", moves: ["しんそく", "げきりん", "じしん", "ほのおのパンチ"], stats: { hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80 }, notes: "終盤の掃除役" },
  { id: 2, species: "サーフゴー", nickname: "", level: 50, types: "はがね・ゴースト", teraType: "はがね", ability: "おうごんのからだ", heldItem: "こだわりメガネ", nature: "ひかえめ", role: "特殊アタッカー", moves: ["ゴールドラッシュ", "シャドーボール", "10まんボルト", "トリック"], stats: { hp: 87, attack: 60, defense: 95, spAttack: 133, spDefense: 91, speed: 84 }, notes: "変化技に強い" },
  { id: 3, species: "アシレーヌ", nickname: "", level: 50, types: "みず・フェアリー", teraType: "どく", ability: "げきりゅう", heldItem: "とつげきチョッキ", nature: "ひかえめ", role: "特殊受け", moves: ["ムーンフォース", "うたかたのアリア", "エナジーボール", "アクアジェット"], stats: { hp: 80, attack: 74, defense: 74, spAttack: 126, spDefense: 116, speed: 60 }, notes: "ドラゴンへの切り返し" },
  { id: 4, species: "ゴリランダー", nickname: "", level: 50, types: "くさ", teraType: "ほのお", ability: "グラスメイカー", heldItem: "とつげきチョッキ", nature: "いじっぱり", role: "サポーター", moves: ["グラススライダー", "ウッドハンマー", "とんぼがえり", "ねこだまし"], stats: { hp: 100, attack: 125, defense: 90, spAttack: 60, spDefense: 70, speed: 85 }, notes: "先制技と交代支援" },
  { id: 5, species: "ガブリアス", nickname: "", level: 50, types: "ドラゴン・じめん", teraType: "ほのお", ability: "さめはだ", heldItem: "きあいのタスキ", nature: "ようき", role: "高速アタッカー", moves: ["じしん", "スケイルショット", "つるぎのまい", "ステルスロック"], stats: { hp: 108, attack: 130, defense: 95, spAttack: 80, spDefense: 85, speed: 102 }, notes: "先発適性が高い" },
  { id: 6, species: "ポリゴン2", nickname: "", level: 50, types: "ノーマル", teraType: "ゴースト", ability: "ダウンロード", heldItem: "しんかのきせき", nature: "ずぶとい", role: "物理受け", moves: ["れいとうビーム", "ほうでん", "じこさいせい", "トリックルーム"], stats: { hp: 85, attack: 80, defense: 90, spAttack: 105, spDefense: 95, speed: 60 }, notes: "安定した受け役" },
  { id: 7, species: "ウルガモス", nickname: "", level: 50, types: "むし・ほのお", teraType: "くさ", ability: "ほのおのからだ", heldItem: "あつぞこブーツ", nature: "おくびょう", role: "積みアタッカー", moves: ["ほのおのまい", "むしのさざめき", "ちょうのまい", "ギガドレイン"], stats: { hp: 85, attack: 60, defense: 65, spAttack: 135, spDefense: 105, speed: 100 }, notes: "終盤の全抜き役" },
  { id: 8, species: "キョジオーン", nickname: "", level: 50, types: "いわ", teraType: "みず", ability: "きよめのしお", heldItem: "たべのこし", nature: "わんぱく", role: "耐久", moves: ["しおづけ", "じこさいせい", "まもる", "じわれ"], stats: { hp: 100, attack: 100, defense: 130, spAttack: 45, spDefense: 90, speed: 35 }, notes: "長期戦の軸" },
];

export const demoMaster: MasterEntry[] = [
  { id: 1, category: "pokemon", name: "カイリュー", type: "ドラゴン・ひこう", description: "高い攻撃とマルチスケイルによる行動保証が特徴。" },
  { id: 2, category: "pokemon", name: "サーフゴー", type: "はがね・ゴースト", description: "変化技を受けない特殊アタッカー。" },
  { id: 3, category: "pokemon", name: "アシレーヌ", type: "みず・フェアリー", description: "特殊耐久と攻撃性能を両立。" },
  { id: 4, category: "pokemon", name: "ゴリランダー", type: "くさ", description: "先制技とフィールドで味方を支援。" },
  { id: 5, category: "pokemon", name: "ガブリアス", type: "ドラゴン・じめん", description: "素早さと攻撃範囲に優れる。" },
  { id: 6, category: "pokemon", name: "ポリゴン2", type: "ノーマル", description: "しんかのきせきによる高耐久。" },
  { id: 7, category: "item", name: "こだわりハチマキ", type: "火力", description: "同じ技しか選べなくなる代わりに物理技を強化。" },
  { id: 8, category: "item", name: "きあいのタスキ", type: "行動保証", description: "HP満タンから一撃で倒される攻撃を耐える。" },
  { id: 9, category: "ability", name: "マルチスケイル", type: "耐久", description: "HP満タン時に受けるダメージを軽減。" },
  { id: 10, category: "move", name: "しんそく", type: "ノーマル", description: "高い優先度を持つ先制攻撃。" },
  { id: 11, category: "nature", name: "いじっぱり", type: "攻撃↑ 特攻↓", description: "物理攻撃を重視する性格。" },
];

export const demoState: AppState = {
  user: { email: "demo@example.com", displayName: "ビギナートレーナー", handle: "beginner", role: "admin", preferredFormat: "single", preferredStyle: "balance" },
  roster: demoRoster,
  items: [
    { id: 1, name: "こだわりハチマキ", quantity: 1, notes: "カイリュー用" },
    { id: 2, name: "きあいのタスキ", quantity: 2, notes: "先発候補に持たせる" },
    { id: 3, name: "たべのこし", quantity: 1, notes: "耐久役向け" },
  ],
  master: demoMaster,
};
