PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__user_id_map` (
	`id` integer PRIMARY KEY NOT NULL,
	`legacy_email` text NOT NULL UNIQUE
);--> statement-breakpoint
INSERT INTO `__user_id_map` (`id`, `legacy_email`)
SELECT
	ROW_NUMBER() OVER (
		ORDER BY CASE WHEN lower(`email`) = 'rihib@rihib.dev' THEN 0 ELSE 1 END, `created_at`, `email`
	),
	`email`
FROM `users`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`handle` text NOT NULL,
	`preferred_format` text DEFAULT 'single' NOT NULL,
	`preferred_style` text DEFAULT 'balance' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_users` (`id`, `email`, `display_name`, `handle`, `preferred_format`, `preferred_style`, `created_at`)
SELECT
	`__user_id_map`.`id`,
	lower(`users`.`email`),
	`users`.`display_name`,
	lower(`users`.`handle`),
	`users`.`preferred_format`,
	`users`.`preferred_style`,
	`users`.`created_at`
FROM `users`
INNER JOIN `__user_id_map` ON `__user_id_map`.`legacy_email` = `users`.`email`;--> statement-breakpoint
CREATE TABLE `__owned_items_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
INSERT INTO `__owned_items_data` (`id`, `owner_id`, `name`, `quantity`, `notes`, `created_at`, `updated_at`)
SELECT
	`owned_items`.`id`,
	`__user_id_map`.`id`,
	`owned_items`.`name`,
	`owned_items`.`quantity`,
	`owned_items`.`notes`,
	`owned_items`.`created_at`,
	`owned_items`.`updated_at`
FROM `owned_items`
INNER JOIN `__user_id_map` ON `__user_id_map`.`legacy_email` = `owned_items`.`owner_email`;--> statement-breakpoint
CREATE TABLE `__roster_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`species` text NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`level` integer DEFAULT 50 NOT NULL,
	`types` text DEFAULT '' NOT NULL,
	`tera_type` text DEFAULT '' NOT NULL,
	`ability` text DEFAULT '' NOT NULL,
	`held_item` text DEFAULT '' NOT NULL,
	`nature` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '万能' NOT NULL,
	`moves` text DEFAULT '[]' NOT NULL,
	`stats` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
INSERT INTO `__roster_data` (`id`, `owner_id`, `species`, `nickname`, `level`, `types`, `tera_type`, `ability`, `held_item`, `nature`, `role`, `moves`, `stats`, `notes`, `created_at`, `updated_at`)
SELECT
	`roster`.`id`,
	`__user_id_map`.`id`,
	`roster`.`species`,
	`roster`.`nickname`,
	`roster`.`level`,
	`roster`.`types`,
	`roster`.`tera_type`,
	`roster`.`ability`,
	`roster`.`held_item`,
	`roster`.`nature`,
	`roster`.`role`,
	`roster`.`moves`,
	`roster`.`stats`,
	`roster`.`notes`,
	`roster`.`created_at`,
	`roster`.`updated_at`
FROM `roster`
INNER JOIN `__user_id_map` ON `__user_id_map`.`legacy_email` = `roster`.`owner_email`;--> statement-breakpoint
DROP TABLE `owned_items`;--> statement-breakpoint
DROP TABLE `roster`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_idx` ON `users` (`handle`);--> statement-breakpoint
CREATE TABLE `owned_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `owned_items` SELECT * FROM `__owned_items_data`;--> statement-breakpoint
DROP TABLE `__owned_items_data`;--> statement-breakpoint
CREATE TABLE `roster` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`species` text NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`level` integer DEFAULT 50 NOT NULL,
	`types` text DEFAULT '' NOT NULL,
	`tera_type` text DEFAULT '' NOT NULL,
	`ability` text DEFAULT '' NOT NULL,
	`held_item` text DEFAULT '' NOT NULL,
	`nature` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '万能' NOT NULL,
	`moves` text DEFAULT '[]' NOT NULL,
	`stats` text DEFAULT '{}' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `roster` SELECT * FROM `__roster_data`;--> statement-breakpoint
DROP TABLE `__roster_data`;--> statement-breakpoint
CREATE INDEX `items_owner_idx` ON `owned_items` (`owner_id`);--> statement-breakpoint
CREATE INDEX `roster_owner_idx` ON `roster` (`owner_id`);--> statement-breakpoint
CREATE TABLE `auth_identities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text DEFAULT 'chatgpt' NOT NULL,
	`provider_email` text NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `auth_identities` (`provider`, `provider_email`, `user_id`)
SELECT 'chatgpt', lower(`legacy_email`), `id` FROM `__user_id_map`;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_provider_email_idx` ON `auth_identities` (`provider`,`provider_email`);--> statement-breakpoint
CREATE INDEX `auth_user_idx` ON `auth_identities` (`user_id`);--> statement-breakpoint
DROP TABLE `__user_id_map`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
