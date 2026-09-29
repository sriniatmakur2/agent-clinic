CREATE TABLE `therapist_specialties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`therapist_id` integer NOT NULL,
	`ailment_id` integer NOT NULL,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ailment_id`) REFERENCES `ailments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `therapists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`bio` text NOT NULL,
	`avatar_emoji` text NOT NULL
);
