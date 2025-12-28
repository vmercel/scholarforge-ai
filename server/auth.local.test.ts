import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { hashPassword } from "./_core/password";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(async () => ({})),
  getUserByEmail: vi.fn(async () => undefined),
  upsertUser: vi.fn(async () => undefined),
  getUserByOpenId: vi.fn(async () => undefined),
}));

vi.mock("./db", () => dbMocks);

function createCtx(): { ctx: TrpcContext; cookies: CookieCall[] } {
  const cookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: () => undefined,
    } as any,
  };
  return { ctx, cookies };
}

describe("auth local signup/login", () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((fn: any) => typeof fn?.mockClear === "function" && fn.mockClear());
  });

  it("signs up a user and sets a session cookie", async () => {
    const { ctx, cookies } = createCtx();
    const caller = appRouter.createCaller(ctx);

    dbMocks.getUserByOpenId.mockImplementation(async (openId: string) => ({
      id: 1,
      openId,
      name: "Test User",
      email: "test@example.com",
      loginMethod: "local",
      passwordHash: "x",
      passwordSalt: "y",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));

    const result = await caller.auth.signup({
      name: "Test User",
      email: "test@example.com",
      password: "Passw0rd1",
    });

    expect(result.user.email).toBe("test@example.com");
    expect((result.user as any).passwordHash).toBeUndefined();
    expect(dbMocks.upsertUser).toHaveBeenCalled();

    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(typeof cookies[0]?.value).toBe("string");
    expect(cookies[0]?.options).toMatchObject({
      maxAge: ONE_YEAR_MS,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("logs in a user and sets a session cookie", async () => {
    const { ctx, cookies } = createCtx();
    const caller = appRouter.createCaller(ctx);

    const pw = await hashPassword("Passw0rd1");
    dbMocks.getUserByEmail.mockImplementation(async () => ({
      id: 2,
      openId: "local_abc123",
      name: "User",
      email: "user@example.com",
      loginMethod: "local",
      passwordHash: pw.hash,
      passwordSalt: pw.salt,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));

    const result = await caller.auth.login({
      email: "user@example.com",
      password: "Passw0rd1",
    });

    expect(result.user.email).toBe("user@example.com");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.options).toMatchObject({ maxAge: ONE_YEAR_MS });
  });
});

