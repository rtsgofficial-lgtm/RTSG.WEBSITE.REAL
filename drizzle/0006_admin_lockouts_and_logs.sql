CREATE TABLE IF NOT EXISTS `admin_login_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`failedAttemptCount` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`lastFailedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_login_rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_login_rate_limits_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admin_action_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorType` varchar(32) NOT NULL,
	`actorUsername` varchar(128),
	`actorUserId` int,
	`actorRole` varchar(32),
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64),
	`targetId` varchar(128),
	`metadata` text,
	`ipAddress` varchar(128),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_action_logs_id` PRIMARY KEY(`id`)
);
