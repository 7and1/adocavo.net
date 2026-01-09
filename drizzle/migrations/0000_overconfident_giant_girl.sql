CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`userId`);--> statement-breakpoint
CREATE TABLE `fake_door_clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`feature` text NOT NULL,
	`clicked_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`user_agent` text,
	`referrer` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fake_door_feature_idx` ON `fake_door_clicks` (`feature`);--> statement-breakpoint
CREATE TABLE `generated_scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`hook_id` text NOT NULL,
	`product_description` text NOT NULL,
	`scripts` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hook_id`) REFERENCES `hooks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `generated_scripts_user_idx` ON `generated_scripts` (`user_id`);--> statement-breakpoint
CREATE INDEX `generated_scripts_hook_idx` ON `generated_scripts` (`hook_id`);--> statement-breakpoint
CREATE TABLE `hooks` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`category` text NOT NULL,
	`engagement_score` integer NOT NULL,
	`source` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hooks_category_score_idx` ON `hooks` (`category`,`engagement_score`);--> statement-breakpoint
CREATE INDEX `hooks_active_idx` ON `hooks` (`is_active`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`ip` text NOT NULL,
	`endpoint` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`ip`, `endpoint`)
);
--> statement-breakpoint
CREATE INDEX `rate_limits_endpoint_idx` ON `rate_limits` (`endpoint`);--> statement-breakpoint
CREATE TABLE `script_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`generated_script_id` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `generated_script_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generated_script_id`) REFERENCES `generated_scripts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `script_favorites_user_idx` ON `script_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `script_favorites_script_idx` ON `script_favorites` (`generated_script_id`);--> statement-breakpoint
CREATE TABLE `script_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`generated_script_id` text NOT NULL,
	`user_id` text,
	`script_index` integer NOT NULL,
	`rating` integer NOT NULL,
	`is_helpful` integer DEFAULT true,
	`feedback` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`generated_script_id`) REFERENCES `generated_scripts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `script_ratings_script_idx` ON `script_ratings` (`generated_script_id`);--> statement-breakpoint
CREATE INDEX `script_ratings_user_idx` ON `script_ratings` (`user_id`);--> statement-breakpoint
CREATE INDEX `script_ratings_user_script_idx` ON `script_ratings` (`generated_script_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionToken` text NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_sessionToken_unique` ON `sessions` (`sessionToken`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`credits` integer DEFAULT 10 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE TABLE `verificationTokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verificationTokens_token_unique` ON `verificationTokens` (`token`);--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`feature_interest` text,
	`source_url` text,
	`user_tier` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_email_unique` ON `waitlist` (`email`);--> statement-breakpoint
CREATE INDEX `waitlist_email_idx` ON `waitlist` (`email`);