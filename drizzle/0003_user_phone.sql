ALTER TABLE `users` ADD `phone` varchar(32);
--> statement-breakpoint
CREATE INDEX `users_phone_idx` ON `users` (`phone`);

