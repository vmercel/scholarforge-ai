ALTER TABLE `users` ADD `passwordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordSalt` varchar(255);
--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);

