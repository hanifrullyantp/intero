import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const COOKIE = "intero_admin";

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set (min 16 chars) in production");
  }
  console.warn("[intero] JWT_SECRET missing — using insecure dev default");
  return "dev-intero-jwt-secret!";
}

export async function verifyPassword(plain: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plainEnv = process.env.ADMIN_PASSWORD;
  if (hash) {
    return bcrypt.compare(plain, hash);
  }
  if (plainEnv) {
    return plain === plainEnv;
  }
  return false;
}

export function signToken(username: string): string {
  return jwt.sign({ sub: username }, getJwtSecret(), { expiresIn: "7d" });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE, { path: "/" });
}

export function readToken(req: Request): string | null {
  const c = req.cookies?.[COOKIE];
  if (typeof c === "string" && c) return c;
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub: string };
    (req as AuthedRequest).adminUser = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export { COOKIE };
