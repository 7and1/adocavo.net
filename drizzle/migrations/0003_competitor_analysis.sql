CREATE TABLE `competitor_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tiktok_url` text NOT NULL,
	`title` text,
	`author` text,
	`transcript` text NOT NULL,
	`transcript_source` text NOT NULL,
	`hook` text,
	`structure` text,
	`template` text,
	`cta` text,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `competitor_analyses_user_idx` ON `competitor_analyses` (`user_id`);
--> statement-breakpoint
CREATE INDEX `competitor_analyses_created_idx` ON `competitor_analyses` (`created_at`);
