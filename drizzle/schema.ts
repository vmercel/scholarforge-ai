import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  passwordSalt: varchar("passwordSalt", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Generation jobs table - tracks document generation requests
 */
export const generationJobs = mysqlTable("generation_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed"]).default("queued").notNull(),
  
  // Document parameters
  documentType: varchar("documentType", { length: 100 }).notNull(),
  title: text("title").notNull(),
  researchDomain: varchar("researchDomain", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 255 }),
  
  // Structural parameters
  targetWordCount: int("targetWordCount").notNull(),
  numFigures: int("numFigures"),
  numTables: int("numTables"),
  numReferences: int("numReferences"),
  
  // Formatting
  citationStyle: varchar("citationStyle", { length: 50 }).notNull(),
  targetJournal: varchar("targetJournal", { length: 255 }),
  
  // Content direction (stored as JSON)
  abstractProvided: text("abstractProvided"),
  keyHypotheses: json("keyHypotheses").$type<string[]>(),
  methodologyConstraints: json("methodologyConstraints").$type<string[]>(),
  
  // Generation progress
  currentPhase: varchar("currentPhase", { length: 100 }),
  progressPercentage: int("progressPercentage").default(0),
  estimatedTimeRemaining: int("estimatedTimeRemaining"), // in minutes
  
  // Quality metrics
  noveltyScore: float("noveltyScore"),
  qualityScore: int("qualityScore"),
  
  // Error tracking
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

/**
 * Documents table - stores generated document metadata
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull().references(() => generationJobs.id),
  
  // Document content
  title: text("title").notNull(),
  abstract: text("abstract"),
  content: text("content").notNull(), // Markdown content
  keywords: json("keywords").$type<string[]>(),
  
  // Metadata
  documentType: varchar("documentType", { length: 100 }).notNull(),
  wordCount: int("wordCount").notNull(),
  citationStyle: varchar("citationStyle", { length: 50 }).notNull(),
  
  // Quality metrics
  noveltyScore: float("noveltyScore"),
  qualityScore: int("qualityScore"),
  noveltyClassification: varchar("noveltyClassification", { length: 50 }),
  
  // File URLs (stored in S3)
  markdownUrl: text("markdownUrl"),
  docxUrl: text("docxUrl"),
  pdfUrl: text("pdfUrl"),
  latexUrl: text("latexUrl"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Authors table - manages document authors
 */
export const authors = mysqlTable("authors", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull().references(() => documents.id),
  
  name: varchar("name", { length: 255 }).notNull(),
  affiliation: text("affiliation").notNull(),
  email: varchar("email", { length: 320 }),
  orcid: varchar("orcid", { length: 50 }),
  isCorresponding: int("isCorresponding").default(0).notNull(), // boolean as int
  orderIndex: int("orderIndex").notNull(), // for ordering authors
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Author = typeof authors.$inferSelect;
export type InsertAuthor = typeof authors.$inferInsert;

/**
 * Citations table - stores citation metadata
 */
export const citations = mysqlTable("citations", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull().references(() => documents.id),
  
  doi: varchar("doi", { length: 100 }),
  title: text("title").notNull(),
  authorsText: text("authorsText").notNull(), // Formatted author string
  journal: varchar("journal", { length: 255 }),
  year: int("year"),
  volume: varchar("volume", { length: 50 }),
  pages: varchar("pages", { length: 50 }),
  url: text("url"),
  citationKey: varchar("citationKey", { length: 100 }),
  
  // Pre-formatted citations in multiple styles
  formattedCitations: json("formattedCitations").$type<Record<string, string>>(),
  
  orderIndex: int("orderIndex").notNull(), // for ordering in bibliography
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Citation = typeof citations.$inferSelect;
export type InsertCitation = typeof citations.$inferInsert;

/**
 * Figures table - tracks figure metadata
 */
export const figures = mysqlTable("figures", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull().references(() => documents.id),
  
  figureNumber: varchar("figureNumber", { length: 20 }).notNull(),
  figureType: varchar("figureType", { length: 50 }), // plot, diagram, photo, etc.
  caption: text("caption").notNull(),
  imageUrl: text("imageUrl").notNull(), // S3 URL
  generationMethod: varchar("generationMethod", { length: 100 }), // matplotlib, dalle, mermaid, etc.
  altText: text("altText"),
  positionInDocument: int("positionInDocument").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Figure = typeof figures.$inferSelect;
export type InsertFigure = typeof figures.$inferInsert;

/**
 * Tables data table - tracks table metadata
 */
export const tablesData = mysqlTable("tables_data", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull().references(() => documents.id),
  
  tableNumber: varchar("tableNumber", { length: 20 }).notNull(),
  caption: text("caption").notNull(),
  htmlContent: text("htmlContent").notNull(), // HTML table content
  csvData: text("csvData"), // CSV representation
  columnHeaders: json("columnHeaders").$type<string[]>(),
  positionInDocument: int("positionInDocument").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TableData = typeof tablesData.$inferSelect;
export type InsertTableData = typeof tablesData.$inferInsert;

/**
 * Revision requests table - tracks document revision requests
 */
export const revisionRequests = mysqlTable("revision_requests", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull().references(() => documents.id),
  userId: int("userId").notNull().references(() => users.id),
  
  revisionType: mysqlEnum("revisionType", [
    "targeted_edit",
    "global_revision",
    "expansion",
    "reduction",
    "style_adjustment"
  ]).notNull(),
  
  instructions: text("instructions").notNull(),
  
  // Preservation options
  preserveArgument: int("preserveArgument").default(1).notNull(),
  preserveFigures: int("preserveFigures").default(1).notNull(),
  preserveWordCount: int("preserveWordCount").default(0).notNull(),
  preserveCitations: int("preserveCitations").default(1).notNull(),
  
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  
  // Result
  newDocumentId: int("newDocumentId").references(() => documents.id),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type RevisionRequest = typeof revisionRequests.$inferSelect;
export type InsertRevisionRequest = typeof revisionRequests.$inferInsert;
