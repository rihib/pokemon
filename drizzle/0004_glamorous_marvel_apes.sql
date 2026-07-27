CREATE TABLE `master_relations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`target_id` integer NOT NULL,
	`kind` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `master_data`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `master_data`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_relation_unique_idx` ON `master_relations` (`source_id`,`target_id`,`kind`);--> statement-breakpoint
CREATE INDEX `master_relation_source_idx` ON `master_relations` (`source_id`);--> statement-breakpoint
CREATE INDEX `master_relation_target_idx` ON `master_relations` (`target_id`);--> statement-breakpoint
ALTER TABLE `roster` ADD `form` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `master_data` SET `type` = 'ノーマル' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('しんそく','ねこだまし','つるぎのまい','じこさいせい','まもる');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'ドラゴン' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('げきりん','スケイルショット');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'じめん' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('じしん','じわれ');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'ほのお' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('ほのおのパンチ','ほのおのまい');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'はがね' WHERE `category` = 'move' AND `type` = '技' AND `name` = 'ゴールドラッシュ';--> statement-breakpoint
UPDATE `master_data` SET `type` = 'ゴースト' WHERE `category` = 'move' AND `type` = '技' AND `name` = 'シャドーボール';--> statement-breakpoint
UPDATE `master_data` SET `type` = 'でんき' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('10まんボルト','ほうでん');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'エスパー' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('トリック','トリックルーム');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'フェアリー' WHERE `category` = 'move' AND `type` = '技' AND `name` = 'ムーンフォース';--> statement-breakpoint
UPDATE `master_data` SET `type` = 'みず' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('うたかたのアリア','アクアジェット');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'くさ' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('エナジーボール','グラススライダー','ウッドハンマー','ギガドレイン');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'むし' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('とんぼがえり','むしのさざめき','ちょうのまい');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'いわ' WHERE `category` = 'move' AND `type` = '技' AND `name` IN ('ステルスロック','しおづけ');--> statement-breakpoint
UPDATE `master_data` SET `type` = 'こおり' WHERE `category` = 'move' AND `type` = '技' AND `name` = 'れいとうビーム';
