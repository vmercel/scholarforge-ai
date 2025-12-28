import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { generateDocument } from "./services/documentGeneration";
import { processRevisionRequest } from "./services/revisionProcessing";
import { exportDocument } from "./services/documentExport";
import { sdk } from "./_core/sdk";
import {
  hashPassword,
  normalizeEmail,
  validatePasswordStrength,
  verifyPassword,
} from "./_core/password";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const { passwordHash: _ph, passwordSalt: _ps, ...safe } = ctx.user as any;
      return safe;
    }),
    signup: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const databaseHandle = await db.getDb();
        if (!databaseHandle) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not configured",
          });
        }

        const email = normalizeEmail(input.email);
        const passwordError = validatePasswordStrength(input.password);
        if (passwordError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: passwordError });
        }

        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists.",
          });
        }

        const openId = `local_${nanoid(12)}`;
        const signedInAt = new Date();
        const pw = await hashPassword(input.password);

        await db.upsertUser({
          openId,
          name: input.name.trim(),
          email,
          loginMethod: "local",
          passwordHash: pw.hash,
          passwordSalt: pw.salt,
          lastSignedIn: signedInAt,
        });

        const user = await db.getUserByOpenId(openId);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        const sessionToken = await sdk.createSessionToken(openId, {
          name: user.name ?? input.name.trim(),
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        const { passwordHash: _ph, passwordSalt: _ps, ...safe } = user as any;
        return { user: safe } as const;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const databaseHandle = await db.getDb();
        if (!databaseHandle) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not configured",
          });
        }

        const email = normalizeEmail(input.email);
        const user = await db.getUserByEmail(email);

        const passwordHash = (user as any)?.passwordHash as string | null | undefined;
        const passwordSalt = (user as any)?.passwordSalt as string | null | undefined;
        if (!user || !passwordHash || !passwordSalt) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const ok = await verifyPassword(input.password, {
          hash: passwordHash,
          salt: passwordSalt,
        });
        if (!ok) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name ?? "",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        const { passwordHash: _ph, passwordSalt: _ps, ...safe } = user as any;
        return { user: safe } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Generation Jobs
  generation: router({
    // Create a new generation job
    create: protectedProcedure
      .input(z.object({
        documentType: z.string(),
        title: z.string(),
        researchDomain: z.string(),
        subdomain: z.string().optional(),
        targetWordCount: z.number(),
        numFigures: z.number().optional(),
        numTables: z.number().optional(),
        numReferences: z.number().optional(),
        citationStyle: z.string(),
        targetJournal: z.string().optional(),
        abstractProvided: z.string().optional(),
        keyHypotheses: z.array(z.string()).optional(),
        methodologyConstraints: z.array(z.string()).optional(),
        authors: z.array(z.object({
          name: z.string(),
          affiliation: z.string(),
          email: z.string().optional(),
          orcid: z.string().optional(),
          isCorresponding: z.boolean(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { authors, ...jobData } = input;
        
        // Create generation job
        const jobId = await db.createGenerationJob({
          userId: ctx.user.id,
          ...jobData,
          status: "queued",
          progressPercentage: 0,
        });
        
        // Trigger real document generation in background
        generateDocument({
          jobId,
          ...jobData,
          authors: authors.map(a => ({
            ...a,
            isCorresponding: a.isCorresponding || false,
          })),
        }).catch(error => {
          console.error("Generation error:", error);
          db.completeGenerationJob(jobId, {
            status: "failed",
            errorMessage: error.message,
          });
        });
        
        return { jobId, success: true };
      }),
    
    // Get job status
    getStatus: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await db.getGenerationJobById(input.jobId);
        
        if (!job) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
        }
        
        // Check ownership
        if (job.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return job;
      }),
    
    // Get user's generation history
    getHistory: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserGenerationJobs(ctx.user.id);
      }),
    
    // Cancel a generation job
    cancel: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.getGenerationJobById(input.jobId);
        
        if (!job) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
        }
        
        if (job.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        if (job.status === "completed" || job.status === "failed") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel completed or failed job' });
        }
        
        await db.completeGenerationJob(input.jobId, {
          status: "failed",
          errorMessage: "Cancelled by user",
        });
        
        return { success: true };
      }),
  }),

  // Documents
  documents: router({
    // Get document by ID
    getById: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.documentId);
        
        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
        }
        
        // Get associated job to check ownership
        const job = await db.getGenerationJobById(document.jobId);
        if (job.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        // Get related data
        const authors = await db.getDocumentAuthors(document.id);
        const citations = await db.getDocumentCitations(document.id);
        const figures = await db.getDocumentFigures(document.id);
        const tables = await db.getDocumentTables(document.id);
        
        return {
          ...document,
          authors,
          citations,
          figures,
          tables,
        };
      }),
    
    // Get document by job ID
    getByJobId: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await db.getGenerationJobById(input.jobId);
        
        if (!job) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
        }
        
        if (job.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        const document = await db.getDocumentByJobId(input.jobId);
        
        if (!document) {
          return null;
        }
        
        // Get related data
        const authors = await db.getDocumentAuthors(document.id);
        const citations = await db.getDocumentCitations(document.id);
        const figures = await db.getDocumentFigures(document.id);
        const tables = await db.getDocumentTables(document.id);
        
        return {
          ...document,
          authors,
          citations,
          figures,
          tables,
        };
      }),

    export: protectedProcedure
      .input(
        z.object({
          documentId: z.number(),
          format: z.enum(["markdown", "latex"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.documentId);

        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }

        const job = await db.getGenerationJobById(document.jobId);
        if (job.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const authors = await db.getDocumentAuthors(document.id);
        const citations = await db.getDocumentCitations(document.id);

        return exportDocument(input.format, document, { authors, citations });
      }),
  }),

  // Revision Requests
  revisions: router({
    // Create revision request
    create: protectedProcedure
      .input(z.object({
        documentId: z.number(),
        revisionType: z.enum(["targeted_edit", "global_revision", "expansion", "reduction", "style_adjustment"]),
        instructions: z.string(),
        preserveArgument: z.boolean(),
        preserveFigures: z.boolean(),
        preserveWordCount: z.boolean(),
        preserveCitations: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.documentId);
        
        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
        }
        
        // Check ownership
        const job = await db.getGenerationJobById(document.jobId);
        if (job.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        const requestId = await db.createRevisionRequest({
          documentId: input.documentId,
          userId: ctx.user.id,
          revisionType: input.revisionType,
          instructions: input.instructions,
          preserveArgument: input.preserveArgument ? 1 : 0,
          preserveFigures: input.preserveFigures ? 1 : 0,
          preserveWordCount: input.preserveWordCount ? 1 : 0,
          preserveCitations: input.preserveCitations ? 1 : 0,
          status: "pending",
        });
        
        // Process revision in background (best-effort).
        processRevisionRequest(requestId).catch(error => {
          console.error("[Revisions] Background processing failed", error);
          db.updateRevisionRequestStatus(requestId, { status: "failed" }).catch(err => {
            console.error("[Revisions] Failed to mark request failed", err);
          });
        });
        
        return { requestId, success: true };
      }),
    
    // Get revision request status
    getStatus: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ ctx, input }) => {
        const request = await db.getRevisionRequestById(input.requestId);
        
        if (!request) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Revision request not found' });
        }
        
        if (request.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return request;
      }),
    
    // Get document revision history
    getHistory: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const document = await db.getDocumentById(input.documentId);
        
        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
        }
        
        const job = await db.getGenerationJobById(document.jobId);
        if (job.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return db.getDocumentRevisionRequests(input.documentId);
      }),
  }),

  // Admin endpoints
  admin: router({
    // Get system metrics
    getMetrics: adminProcedure
      .query(async () => {
        const stats = await db.getGenerationStats();
        const activeCount = await db.getActiveGenerationsCount();
        
        return {
          activeGenerations: activeCount,
          ...stats,
        };
      }),
    
    // Get all generation jobs (admin view)
    getAllJobs: adminProcedure
      .query(async () => {
        return db.getAllGenerationJobs();
      }),
  }),
});

export type AppRouter = typeof appRouter;
