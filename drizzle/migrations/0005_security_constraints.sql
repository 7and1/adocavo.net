-- Additional Security Constraints Migration
-- Extends constraints from migration 0004 to add missing status values

-- Note: This migration assumes 0004_db_optimization.sql has been applied
-- This adds the 'in_review' status to hook_review_queue.status constraint

-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we recreate the table
CREATE TABLE `hook_review_queue_new` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`category` text NOT NULL,
	`engagement_score` integer NOT NULL,
	`source` text,
	`status` text NOT NULL DEFAULT 'pending',
	`reviewer_id` text,
	`reviewed_at` integer,
	`notes` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CHECK(`status` IN ('pending', 'approved', 'rejected', 'in_review'))
);

-- Migrate data from old table
INSERT INTO `hook_review_queue_new` SELECT * FROM `hook_review_queue`;

-- Drop old table and rename new one
DROP TABLE `hook_review_queue`;
ALTER TABLE `hook_review_queue_new` RENAME TO `hook_review_queue`;

-- Recreate indexes
CREATE INDEX `hook_review_status_idx` ON `hook_review_queue` (`status`);
CREATE INDEX `hook_review_category_idx` ON `hook_review_queue` (`category`);
CREATE INDEX `hook_review_created_idx` ON `hook_review_queue` (`created_at`);

-- Recreate the composite index from 0004
CREATE INDEX IF NOT EXISTS hook_review_status_created_idx
  ON hook_review_queue (status, created_at DESC);

