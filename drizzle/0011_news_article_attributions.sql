ALTER TABLE `news_articles` ADD `attributions` text;
--> statement-breakpoint
ALTER TABLE `news_articles` MODIFY COLUMN `authorName` varchar(128) NOT NULL DEFAULT 'RTSG';
--> statement-breakpoint
ALTER TABLE `news_articles` ADD `authorXUrl` varchar(512);
