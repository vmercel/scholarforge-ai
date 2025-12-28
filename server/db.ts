import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  generationJobs,
  documents,
  authors,
  citations,
  figures,
  tablesData,
  revisionRequests,
  InsertGenerationJob,
  InsertDocument,
  InsertAuthor,
  InsertRevisionRequest,
  GenerationJob,
  Document
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "phone", "loginMethod", "passwordHash", "passwordSalt"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Generation Jobs
export async function createGenerationJob(job: InsertGenerationJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generationJobs).values(job);
  return result[0].insertId;
}

export async function getGenerationJobById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
  return result[0];
}

export async function getUserGenerationJobs(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt));
}

export async function updateGenerationJobProgress(
  id: number, 
  data: {
    currentPhase?: string;
    progressPercentage?: number;
    estimatedTimeRemaining?: number;
    status?: "queued" | "processing" | "completed" | "failed";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(generationJobs)
    .set(data)
    .where(eq(generationJobs.id, id));
}

export async function completeGenerationJob(
  id: number,
  data: {
    status: "completed" | "failed";
    noveltyScore?: number;
    qualityScore?: number;
    errorMessage?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(generationJobs)
    .set({
      ...data,
      completedAt: new Date(),
      progressPercentage: 100,
    })
    .where(eq(generationJobs.id, id));
}

// Documents
export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documents).values(doc);
  return result[0].insertId;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function getDocumentByJobId(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.jobId, jobId))
    .orderBy(desc(documents.updatedAt), desc(documents.id))
    .limit(1);
  return result[0];
}

// Authors
export async function createAuthors(authorsList: InsertAuthor[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (authorsList.length === 0) return;
  await db.insert(authors).values(authorsList);
}

export async function getDocumentAuthors(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(authors)
    .where(eq(authors.documentId, documentId))
    .orderBy(authors.orderIndex);
}

// Citations
export async function createCitations(citationsList: typeof citations.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (citationsList.length === 0) return;
  await db.insert(citations).values(citationsList);
}

export async function getDocumentCitations(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(citations)
    .where(eq(citations.documentId, documentId))
    .orderBy(citations.orderIndex);
}

// Figures
export async function createFigures(figuresList: typeof figures.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (figuresList.length === 0) return;
  await db.insert(figures).values(figuresList);
}

export async function getDocumentFigures(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(figures)
    .where(eq(figures.documentId, documentId))
    .orderBy(figures.positionInDocument);
}

// Tables
export async function createTables(tablesList: typeof tablesData.$inferInsert[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (tablesList.length === 0) return;
  await db.insert(tablesData).values(tablesList);
}

export async function getDocumentTables(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(tablesData)
    .where(eq(tablesData.documentId, documentId))
    .orderBy(tablesData.positionInDocument);
}

// Revision Requests
export async function createRevisionRequest(request: InsertRevisionRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(revisionRequests).values(request);
  return result[0].insertId;
}

export async function getRevisionRequestById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(revisionRequests).where(eq(revisionRequests.id, id)).limit(1);
  return result[0];
}

export async function getDocumentRevisionRequests(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(revisionRequests)
    .where(eq(revisionRequests.documentId, documentId))
    .orderBy(desc(revisionRequests.createdAt));
}

export async function updateRevisionRequestStatus(
  id: number,
  data: {
    status: "pending" | "processing" | "completed" | "failed";
    newDocumentId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status: data.status };
  if (data.status === "completed" || data.status === "failed") {
    updateData.completedAt = new Date();
  }
  if (data.newDocumentId) {
    updateData.newDocumentId = data.newDocumentId;
  }
  
  await db.update(revisionRequests)
    .set(updateData)
    .where(eq(revisionRequests.id, id));
}

// Admin queries
export async function getAllGenerationJobs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(generationJobs)
    .orderBy(desc(generationJobs.createdAt))
    .limit(100);
}

export async function getActiveGenerationsCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(generationJobs)
    .where(eq(generationJobs.status, "processing"));
  
  return result.length;
}

export async function getGenerationStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allJobs = await db.select().from(generationJobs);
  
  // Calculate statistics
  const stats = {
    total: allJobs.length,
    completed: allJobs.filter(j => j.status === "completed").length,
    processing: allJobs.filter(j => j.status === "processing").length,
    failed: allJobs.filter(j => j.status === "failed").length,
    queued: allJobs.filter(j => j.status === "queued").length,
    
    // Document type distribution
    documentTypes: allJobs.reduce((acc, job) => {
      acc[job.documentType] = (acc[job.documentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    
    // Average novelty score
    avgNoveltyScore: allJobs
      .filter(j => j.noveltyScore !== null)
      .reduce((sum, j) => sum + (j.noveltyScore || 0), 0) / 
      allJobs.filter(j => j.noveltyScore !== null).length || 0,
      
    // Average quality score
    avgQualityScore: allJobs
      .filter(j => j.qualityScore !== null)
      .reduce((sum, j) => sum + (j.qualityScore || 0), 0) / 
      allJobs.filter(j => j.qualityScore !== null).length || 0,
  };
  
  return stats;
}
