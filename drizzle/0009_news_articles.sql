CREATE TABLE IF NOT EXISTS `news_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`excerpt` varchar(512),
	`coverImageUrl` varchar(512),
	`category` varchar(64) NOT NULL DEFAULT 'Editorials',
	`authorId` int,
	`authorName` varchar(128) NOT NULL DEFAULT 'RTSG News',
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isPublished` boolean NOT NULL DEFAULT true,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`editedAt` timestamp,
	CONSTRAINT `news_articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `category`;
