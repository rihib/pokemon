import type { MasterCategory } from "./types";

export type MasterCategoryPage = {
  category: MasterCategory;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  typeLabel: string;
  group: "battle" | "rules";
};

export const masterCategoryPages: MasterCategoryPage[] = [
  {
    category: "pokemon",
    slug: "pokemon",
    name: "ポケモン",
    eyebrow: "POKÉMON MASTER",
    description: "通常・別フォルム・メガシンカを含む、使用できる全ポケモンとタイプを管理する。",
    typeLabel: "タイプ",
    group: "battle",
  },
  {
    category: "item",
    slug: "items",
    name: "持ち物",
    eyebrow: "ITEM MASTER",
    description: "ポケモンに持たせられる持ち物と、初心者向けの効果説明を管理する。",
    typeLabel: "分類",
    group: "battle",
  },
  {
    category: "ability",
    slug: "abilities",
    name: "特性",
    eyebrow: "ABILITY MASTER",
    description: "ポケモンが選択できる特性と、バトル中の効果説明を管理する。",
    typeLabel: "分類",
    group: "battle",
  },
  {
    category: "move",
    slug: "moves",
    name: "技",
    eyebrow: "MOVE MASTER",
    description: "ポケモンが選択できる技と、タイプ・効果の概要を管理する。",
    typeLabel: "タイプ・分類",
    group: "battle",
  },
  {
    category: "nature",
    slug: "natures",
    name: "性格",
    eyebrow: "NATURE MASTER",
    description: "選択できる性格と、ステータス補正の説明を管理する。",
    typeLabel: "補正・分類",
    group: "battle",
  },
  {
    category: "type",
    slug: "types",
    name: "タイプ相性",
    eyebrow: "TYPE CHART",
    description: "攻撃側と防御側のタイプ相性倍率を管理する。",
    typeLabel: "識別情報",
    group: "rules",
  },
  {
    category: "regulation",
    slug: "regulations",
    name: "Regulation",
    eyebrow: "REGULATION MASTER",
    description: "期間、選出数、使用できるポケモン・持ち物を管理する。",
    typeLabel: "適用期間",
    group: "rules",
  },
];

export function masterCategoryPageFromSlug(slug: string) {
  return masterCategoryPages.find((page) => page.slug === slug);
}
