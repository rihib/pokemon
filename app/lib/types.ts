export type BattleFormat = "single" | "double";
export type PlayStyle = "balance" | "attack" | "control" | "endurance";
export type MasterCategory = "pokemon" | "item" | "ability" | "move" | "nature";

export type Stats = {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
};

export type RosterEntry = {
  id: number;
  species: string;
  nickname: string;
  level: number;
  types: string;
  teraType: string;
  ability: string;
  heldItem: string;
  nature: string;
  role: string;
  moves: string[];
  stats: Stats;
  notes: string;
};

export type OwnedItem = {
  id: number;
  name: string;
  quantity: number;
  notes: string;
};

export type MasterEntry = {
  id: number;
  category: MasterCategory;
  name: string;
  type: string;
  description: string;
  data?: Record<string, unknown>;
};

export type AppState = {
  user: {
    email: string;
    displayName: string;
    handle: string;
    role: "admin" | "user";
    preferredStyle: PlayStyle;
  };
  roster: RosterEntry[];
  items: OwnedItem[];
  master: MasterEntry[];
};
