CREATE TABLE IF NOT EXISTS `codex_publisher_tokens` (
  `id` varchar(36) NOT NULL,
  `name` varchar(128) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `scopes` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `expires_at` timestamp NULL,
  `last_used_at` timestamp NULL,
  `active` boolean NOT NULL DEFAULT true,
  CONSTRAINT `codex_publisher_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `codex_publisher_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `codex_publisher_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `token_id` varchar(36),
  `action` varchar(64) NOT NULL,
  `article_id` int,
  `timestamp` timestamp NOT NULL DEFAULT (now()),
  `ip` varchar(128),
  `success` boolean NOT NULL DEFAULT false,
  `error_message` text,
  CONSTRAINT `codex_publisher_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `codex_publisher_logs_token_action_time_idx`
  ON `codex_publisher_logs` (`token_id`, `action`, `timestamp`);
