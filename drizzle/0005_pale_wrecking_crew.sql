CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer NOT NULL,
	`therapist_id` integer NOT NULL,
	`requested_at` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`therapy_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapy_id`) REFERENCES `therapies`(`id`) ON UPDATE no action ON DELETE no action
);
