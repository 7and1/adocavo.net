CREATE TABLE `hook_review_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`category` text NOT NULL,
	`engagement_score` integer NOT NULL,
	`source` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_id` text,
	`reviewed_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `hook_review_status_idx` ON `hook_review_queue` (`status`);--> statement-breakpoint
CREATE INDEX `hook_review_category_idx` ON `hook_review_queue` (`category`);--> statement-breakpoint
CREATE INDEX `hook_review_created_idx` ON `hook_review_queue` (`created_at`);--> statement-breakpoint
DROP INDEX `script_ratings_user_script_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `script_ratings_user_script_idx` ON `script_ratings` (`generated_script_id`,`user_id`);