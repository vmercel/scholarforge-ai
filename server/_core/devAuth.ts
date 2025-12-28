import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import * as db from "../db";

function getBodyString(req: Request, key: string): string | undefined {
  const raw = (req.body as any)?.[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function registerDevAuthRoutes(app: Express) {
  app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
    if (ENV.isProduction) {
      res.status(404).send("Not Found");
      return;
    }

    const name = getBodyString(req, "name") ?? "Dev User";
    const email = getBodyString(req, "email");
    const openId = getBodyString(req, "openId") ?? `dev_${nanoid(12)}`;

    try {
      await db.upsertUser({
        openId,
        name,
        email: email ?? null,
        loginMethod: "dev",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[DevAuth] Login failed", error);
      res.status(500).json({ success: false, error: "Dev login failed" });
    }
  });

  // Dev signup route mirrors dev-login so local testing can exercise the signup flow.
  app.post("/api/auth/dev-signup", async (req: Request, res: Response) => {
    if (ENV.isProduction) {
      res.status(404).send("Not Found");
      return;
    }

    const name = getBodyString(req, "name") ?? "Dev User";
    const email = getBodyString(req, "email");
    const openId = getBodyString(req, "openId") ?? `dev_${nanoid(12)}`;

    try {
      await db.upsertUser({
        openId,
        name,
        email: email ?? null,
        loginMethod: "dev",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[DevAuth] Signup failed", error);
      res.status(500).json({ success: false, error: "Dev signup failed" });
    }
  });
}
