CREATE TABLE `codex_publisher_logs` (
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
CREATE TABLE `codex_publisher_tokens` (
	`id` varchar(36) NOT NULL,
	`name` varchar(128) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`scopes` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp,
	`last_used_at` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `codex_publisher_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `codex_publisher_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `news_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`subtitle` varchar(512),
	`content` text NOT NULL,
	`excerpt` varchar(512),
	`coverImageUrl` varchar(512),
	`attributions` text,
	`category` varchar(64) NOT NULL DEFAULT 'Editorials',
	`tags` text,
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`authorId` int,
	`authorName` varchar(128) NOT NULL DEFAULT 'RTSG',
	`authorXUrl` varchar(512),
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isPublished` boolean NOT NULL DEFAULT true,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`editedAt` timestamp,
	CONSTRAINT `news_articles_id` PRIMARY KEY(`id`)
);
