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

describe("admin.getMetrics", () => {
  itWithDb("returns metrics for admin users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const metrics = await caller.admin.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty("activeGenerations");
    expect(metrics).toHaveProperty("total");
    expect(metrics).toHaveProperty("completed");
    expect(metrics).toHaveProperty("processing");
    expect(metrics).toHaveProperty("failed");
    expect(metrics).toHaveProperty("documentTypes");
    expect(typeof metrics.activeGenerations).toBe("number");
  });

  it("denies access to non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getMetrics()).rejects.toThrow("Admin access required");
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

    await expect(caller.admin.getMetrics()).rejects.toThrow("Please login");
  });
});
