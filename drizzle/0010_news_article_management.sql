ALTER TABLE `news_articles` ADD `subtitle` varchar(512);
--> statement-breakpoint
ALTER TABLE `news_articles` ADD `tags` text;
--> statement-breakpoint
ALTER TABLE `news_articles` ADD `status` enum('draft','published') NOT NULL DEFAULT 'published';
--> statement-breakpoint
UPDATE `news_articles` SET `status` = CASE WHEN `isPublished` = true THEN 'published' ELSE 'draft' END;
--> statement-breakpoint
CREATE FULLTEXT INDEX `news_articles_search_idx` ON `news_articles` (`title`, `subtitle`, `excerpt`, `content`, `tags`);
