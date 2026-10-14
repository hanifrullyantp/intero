const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function newShareId(len = 12): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < len; i++) id += ALPHABET[bytes[i]! % ALPHABET.length];
  return id;
}
