import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
const itWithDb = hasDatabase ? it : it.skip;

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    passwordHash: null,
    passwordSalt: null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("generation.create", () => {
  itWithDb("creates a new generation job with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.generation.create({
      documentType: "journal_article",
      title: "Test Article on Machine Learning",
      researchDomain: "Computer Science",
      subdomain: "Machine Learning",
      targetWordCount: 5000,
      numFigures: 3,
      numTables: 2,
      numReferences: 50,
      citationStyle: "APA7",
      targetJournal: "Nature",
      authors: [
        {
          name: "Dr. Jane Smith",
          affiliation: "MIT",
          email: "jsmith@mit.edu",
          isCorresponding: true,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.jobId).toBeGreaterThan(0);
  });

  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.generation.create({
        documentType: "journal_article",
        title: "Test Article",
        researchDomain: "Computer Science",
        targetWordCount: 5000,
        citationStyle: "APA7",
        authors: [
          {
            name: "Dr. Jane Smith",
            affiliation: "MIT",
            isCorresponding: true,
          },
        ],
      })
    ).rejects.toThrow("Please login");
  });
});
