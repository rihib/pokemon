CREATE TABLE `battle_team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`roster_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `battle_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`roster_id`) REFERENCES `roster`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `battle_team_member_position_idx` ON `battle_team_members` (`team_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `battle_team_member_roster_idx` ON `battle_team_members` (`team_id`,`roster_id`);--> statement-breakpoint
CREATE INDEX `battle_team_members_team_idx` ON `battle_team_members` (`team_id`);--> statement-breakpoint
CREATE TABLE `battle_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `battle_teams_owner_idx` ON `battle_teams` (`owner_id`);