ALTER TABLE `roster` ADD `mega_evolution` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `roster` DROP COLUMN `level`;--> statement-breakpoint
ALTER TABLE `roster` DROP COLUMN `tera_type`;--> statement-breakpoint
ALTER TABLE `roster` DROP COLUMN `role`;