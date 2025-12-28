CREATE TABLE `authors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`affiliation` text NOT NULL,
	`email` varchar(320),
	`orcid` varchar(50),
	`isCorresponding` int NOT NULL DEFAULT 0,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `citations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`doi` varchar(100),
	`title` text NOT NULL,
	`authorsText` text NOT NULL,
	`journal` varchar(255),
	`year` int,
	`volume` varchar(50),
	`pages` varchar(50),
	`url` text,
	`citationKey` varchar(100),
	`formattedCitations` json,
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `citations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`title` text NOT NULL,
	`abstract` text,
	`content` text NOT NULL,
	`keywords` json,
	`documentType` varchar(100) NOT NULL,
	`wordCount` int NOT NULL,
	`citationStyle` varchar(50) NOT NULL,
	`noveltyScore` float,
	`qualityScore` int,
	`noveltyClassification` varchar(50),
	`markdownUrl` text,
	`docxUrl` text,
	`pdfUrl` text,
	`latexUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `figures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`figureNumber` varchar(20) NOT NULL,
	`figureType` varchar(50),
	`caption` text NOT NULL,
	`imageUrl` text NOT NULL,
	`generationMethod` varchar(100),
	`altText` text,
	`positionInDocument` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `figures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
	`documentType` varchar(100) NOT NULL,
	`title` text NOT NULL,
	`researchDomain` varchar(255) NOT NULL,
	`subdomain` varchar(255),
	`targetWordCount` int NOT NULL,
	`numFigures` int,
	`numTables` int,
	`numReferences` int,
	`citationStyle` varchar(50) NOT NULL,
	`targetJournal` varchar(255),
	`abstractProvided` text,
	`keyHypotheses` json,
	`methodologyConstraints` json,
	`currentPhase` varchar(100),
	`progressPercentage` int DEFAULT 0,
	`estimatedTimeRemaining` int,
	`noveltyScore` float,
	`qualityScore` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `generation_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revision_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`userId` int NOT NULL,
	`revisionType` enum('targeted_edit','global_revision','expansion','reduction','style_adjustment') NOT NULL,
	`instructions` text NOT NULL,
	`preserveArgument` int NOT NULL DEFAULT 1,
	`preserveFigures` int NOT NULL DEFAULT 1,
	`preserveWordCount` int NOT NULL DEFAULT 0,
	`preserveCitations` int NOT NULL DEFAULT 1,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`newDocumentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `revision_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tables_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`tableNumber` varchar(20) NOT NULL,
	`caption` text NOT NULL,
	`htmlContent` text NOT NULL,
	`csvData` text,
	`columnHeaders` json,
	`positionInDocument` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tables_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `authors` ADD CONSTRAINT `authors_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `citations` ADD CONSTRAINT `citations_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_jobId_generation_jobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `generation_jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `figures` ADD CONSTRAINT `figures_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generation_jobs` ADD CONSTRAINT `generation_jobs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `revision_requests` ADD CONSTRAINT `revision_requests_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `revision_requests` ADD CONSTRAINT `revision_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `revision_requests` ADD CONSTRAINT `revision_requests_newDocumentId_documents_id_fk` FOREIGN KEY (`newDocumentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tables_data` ADD CONSTRAINT `tables_data_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;