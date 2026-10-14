import { randomBytes } from "crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function newShareId(len = 12): string {
  const bytes = randomBytes(len);
  let id = "";
  for (let i = 0; i < len; i++) id += ALPHABET[bytes[i]! % ALPHABET.length];
  return id;
}
