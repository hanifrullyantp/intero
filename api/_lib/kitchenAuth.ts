import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export type KitchenToken = { sub: string; email: string; name: string; app: "3d-intero" };

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be set");
  return "dev-intero-jwt-secret!";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signKitchenToken(user: { id: string; email: string; name: string }): string {
  const payload: KitchenToken = { sub: user.id, email: user.email, name: user.name, app: "3d-intero" };
  return jwt.sign(payload, jwtSecret(), { expiresIn: "30d" });
}

export function readKitchenToken(header: string | null): KitchenToken | null {
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret()) as Partial<KitchenToken>;
    if (payload.app !== "3d-intero" || !payload.sub || !payload.email) return null;
    return { sub: payload.sub, email: payload.email, name: payload.name || payload.email, app: "3d-intero" };
  } catch {
    return null;
  }
}
