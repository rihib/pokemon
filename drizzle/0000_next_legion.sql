CREATE TABLE `master_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_category_name_idx` ON `master_data` (`category`,`name`);--> statement-breakpoint
CREATE INDEX `master_category_idx` ON `master_data` (`category`);--> statement-breakpoint
CREATE TABLE `owned_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_email`) REFERENCES `users`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `items_owner_idx` ON `owned_items` (`owner_email`);--> statement-breakpoint
CREATE TABLE `roster` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
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
	FOREIGN KEY (`owner_email`) REFERENCES `users`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `roster_owner_idx` ON `roster` (`owner_email`);--> statement-breakpoint
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`handle` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`preferred_style` text DEFAULT 'balance' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_idx` ON `users` (`handle`);