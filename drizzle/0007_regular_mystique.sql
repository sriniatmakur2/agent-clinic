CREATE TABLE `supervisors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`bio` text NOT NULL,
	`avatar_emoji` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `agents` ADD `supervisor_id` integer REFERENCES supervisors(id);