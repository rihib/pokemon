export type BattleFormat = "single" | "double";
export type MasterCategory =
  | "pokemon"
  | "item"
  | "ability"
  | "move"
  | "nature"
  | "type"
  | "regulation";
export type MasterRelationKind =
  | "learns_move"
  | "has_ability"
  | "form_of"
  | "type_effectiveness"
  | "allows_pokemon"
  | "allows_item";

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
  };
  roster: RosterEntry[];
  items: OwnedItem[];
  master: MasterEntry[];
  masterRelations: MasterRelation[];
};
