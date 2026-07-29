-- Custom SQL migration file, put your code below! --
UPDATE `roster`
SET
  `species` = COALESCE((
    SELECT `name`
    FROM `master_data`
    WHERE `category` = 'form' AND `name` = `roster`.`form`
    LIMIT 1
  ), `species`),
  `types` = COALESCE((
    SELECT `type`
    FROM `master_data`
    WHERE `category` = 'form' AND `name` = `roster`.`form`
    LIMIT 1
  ), `types`),
  `form` = '',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `form` <> '';
--> statement-breakpoint
UPDATE `master_relations`
SET `kind` = 'allows_pokemon'
WHERE `kind` = 'allows_form';
--> statement-breakpoint
UPDATE `master_data`
SET `category` = 'pokemon', `updated_at` = CURRENT_TIMESTAMP
WHERE `category` = 'form';
--> statement-breakpoint
UPDATE `master_data`
SET `category` = 'archived', `updated_at` = CURRENT_TIMESTAMP
WHERE `category` = 'pokemon'
  AND `name` IN ('ゴリランダー', 'ポリゴン2');
