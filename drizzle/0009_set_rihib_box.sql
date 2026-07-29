DELETE FROM `roster`
WHERE `owner_id` = (SELECT `id` FROM `users` WHERE `email` = 'rihib@rihib.dev');
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'ウルガモス', 'むし・ほのお', '{"hp":85,"attack":60,"defense":65,"spAttack":135,"spDefense":105,"speed":100}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'サーナイト', 'エスパー・フェアリー', '{"hp":68,"attack":65,"defense":65,"spAttack":125,"spDefense":115,"speed":80}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'エンペルト', 'みず・はがね', '{"hp":84,"attack":86,"defense":88,"spAttack":111,"spDefense":101,"speed":60}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'ドサイドン', 'じめん・いわ', '{"hp":115,"attack":140,"defense":130,"spAttack":55,"spDefense":55,"speed":40}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'カバルドン', 'じめん', '{"hp":108,"attack":112,"defense":118,"spAttack":68,"spDefense":72,"speed":47}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'ハッサム', 'むし・はがね', '{"hp":70,"attack":130,"defense":100,"spAttack":55,"spDefense":80,"speed":65}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'カイリュー', 'ドラゴン・ひこう', '{"hp":91,"attack":134,"defense":95,"spAttack":100,"spDefense":100,"speed":80}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'ライチュウ', 'でんき', '{"hp":60,"attack":90,"defense":55,"spAttack":90,"spDefense":80,"speed":110}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'アシレーヌ', 'みず・フェアリー', '{"hp":80,"attack":74,"defense":74,"spAttack":126,"spDefense":116,"speed":60}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'ニンフィア', 'フェアリー', '{"hp":95,"attack":65,"defense":65,"spAttack":110,"spDefense":130,"speed":60}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'エルフーン', 'くさ・フェアリー', '{"hp":60,"attack":67,"defense":85,"spAttack":77,"spDefense":75,"speed":116}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'ボスゴドラ', 'はがね・いわ', '{"hp":70,"attack":110,"defense":180,"spAttack":60,"spDefense":60,"speed":50}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'バンギラス', 'いわ・あく', '{"hp":100,"attack":134,"defense":110,"spAttack":95,"spDefense":100,"speed":61}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
--> statement-breakpoint
INSERT INTO `roster` (`owner_id`, `species`, `types`, `stats`, `updated_at`)
SELECT `id`, 'ウインディ', 'ほのお', '{"hp":90,"attack":110,"defense":80,"spAttack":100,"spDefense":80,"speed":95}', CURRENT_TIMESTAMP
FROM `users` WHERE `email` = 'rihib@rihib.dev';
