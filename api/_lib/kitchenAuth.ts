import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

export type KitchenToken = { sub: string; email: string; name: string; app: "3d-intero" };

function jwtSecret(): string {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 16) return configured;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRole && serviceRole.length >= 16) return serviceRole;
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be set");
  return "dev-intero-jwt-secret!";
}

function b64url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(plain, salt, 32)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

async function verifyScrypt(plain: string, stored: string): Promise<boolean> {
  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const actual = (await scrypt(plain, salt, 32)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function checkPassword(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2")) {
    try {
      const bcrypt = (await import("bcryptjs")).default;
      return bcrypt.compare(plain, stored);
    } catch {
      return false;
    }
  }
  return verifyScrypt(plain, stored);
}

export function signKitchenToken(user: { id: string; email: string; name: string }): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({
    sub: user.id,
    email: user.email,
    name: user.name,
    app: "3d-intero",
    iat: now,
    exp: now + 30 * 24 * 60 * 60,
  }));
  const data = `${header}.${body}`;
  const signature = createHmac("sha256", jwtSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function readKitchenToken(header: string | null): KitchenToken | null {
  if (!header?.startsWith("Bearer ")) return null;
  const [h, p, s] = header.slice(7).split(".");
  if (!h || !p || !s) return null;
  const expected = createHmac("sha256", jwtSecret()).update(`${h}.${p}`).digest("base64url");
  const actualBuf = Buffer.from(s);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Partial<KitchenToken> & { exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (payload.app !== "3d-intero" || !payload.sub || !payload.email) return null;
    return { sub: payload.sub, email: payload.email, name: payload.name || payload.email, app: "3d-intero" };
  } catch {
    return null;
  }
}
