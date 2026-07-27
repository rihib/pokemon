export type BattleFormat = "single" | "double";
export type PlayStyle = "balance" | "attack" | "control" | "endurance";
export type MasterCategory =
  | "pokemon"
  | "item"
  | "ability"
  | "move"
  | "nature"
  | "type"
  | "form"
  | "regulation";
export type MasterRelationKind =
  | "learns_move"
  | "has_ability"
  | "form_of"
  | "type_effectiveness"
  | "allows_pokemon"
  | "allows_item"
  | "allows_form";

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
  types: string;
  ability: string;
  heldItem: string;
  nature: string;
  form: string;
  megaEvolution: boolean;
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

export type MasterRelation = {
  id: number;
  sourceId: number;
  targetId: number;
  kind: MasterRelationKind;
  data?: Record<string, unknown>;
};

export type AppState = {
  user: {
    id: number;
    email: string;
    displayName: string;
    handle: string;
    role: "admin" | "user";
    preferredFormat: BattleFormat;
    preferredStyle: PlayStyle;
  };
  roster: RosterEntry[];
  items: OwnedItem[];
  master: MasterEntry[];
  masterRelations: MasterRelation[];
};
