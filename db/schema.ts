import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  handle: text("handle").notNull(),
  preferredFormat: text("preferred_format", { enum: ["single", "double"] }).notNull().default("single"),
  preferredStyle: text("preferred_style").notNull().default("balance"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
  uniqueIndex("users_handle_idx").on(table.handle),
]);

export const authIdentities = sqliteTable("auth_identities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull().default("chatgpt"),
  providerEmail: text("provider_email").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("auth_provider_email_idx").on(table.provider, table.providerEmail),
  index("auth_user_idx").on(table.userId),
]);

export const masterData = sqliteTable("master_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category", {
    enum: ["pokemon", "item", "ability", "move", "nature"],
  }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default(""),
  description: text("description").notNull().default(""),
  data: text("data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("master_category_name_idx").on(table.category, table.name),
  index("master_category_idx").on(table.category),
]);

export const roster = sqliteTable("roster", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  species: text("species").notNull(),
  nickname: text("nickname").notNull().default(""),
  level: integer("level").notNull().default(50),
  types: text("types").notNull().default(""),
  teraType: text("tera_type").notNull().default(""),
  ability: text("ability").notNull().default(""),
  heldItem: text("held_item").notNull().default(""),
  nature: text("nature").notNull().default(""),
  role: text("role").notNull().default("万能"),
  moves: text("moves").notNull().default("[]"),
  stats: text("stats").notNull().default("{}"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("roster_owner_idx").on(table.ownerId),
]);

export const ownedItems = sqliteTable("owned_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("items_owner_idx").on(table.ownerId),
]);
