import type { AuthSession, CipherEnvelope } from "../SaveTypes";

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 100_000;
export const FALLBACK_ITERATIONS = 5000;

export function hasSubtleCrypto(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

export function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function unb64(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = (Math.random() * 256) | 0;
  return out;
}

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function fallbackKey(password: string, saltB64: string, iterations: number): Uint8Array {
  let seed = fnv1a(password + "::" + saltB64);
  const n = Math.min(iterations, 5000);
  for (let i = 0; i < n; i++) {
    seed = (Math.imul(seed ^ i, 0x9e3779b1) + fnv1a(String(seed) + password)) >>> 0;
  }
  const key = new Uint8Array(32);
  let x = seed;
  for (let i = 0; i < 32; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    key[i] = (x >>> 16) & 0xff;
  }
  return key;
}

function xorCrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}

export async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  if (!hasSubtleCrypto()) {
    return fallbackKey(password, b64(salt), iterations);
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  if (!hasSubtleCrypto()) return b64(fallbackKey(password, b64(salt), 2000));
  return b64(await deriveBits(password, salt, PBKDF2_ITERATIONS));
}

export type CodecKey = {
  raw: Uint8Array;
  aes: CryptoKey | null;
};

export async function importCodecKey(session: AuthSession): Promise<CodecKey> {
  const raw = unb64(session.key);
  if (session.mode !== "aes" || !hasSubtleCrypto()) return { raw, aes: null };
  const aes = await crypto.subtle.importKey(
    "raw",
    raw.buffer as ArrayBuffer,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  return { raw, aes };
}

export async function encryptJson(key: CodecKey, obj: unknown): Promise<string> {
  const data = enc.encode(JSON.stringify(obj));
  const iv = randomBytes(12);
  if (key.aes) {
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key.aes,
      data,
    );
    const envelope: CipherEnvelope = {
      v: 1,
      mode: "aes",
      iv: b64(iv),
      data: b64(cipher),
      at: Date.now(),
    };
    return JSON.stringify(envelope);
  }
  const mixed = new Uint8Array(iv.length + data.length);
  mixed.set(iv, 0);
  mixed.set(data, iv.length);
  const out = xorCrypt(key.raw, mixed);
  const envelope: CipherEnvelope = {
    v: 1,
    mode: "xor",
    data: b64(out),
    at: Date.now(),
  };
  return JSON.stringify(envelope);
}

export async function decryptJson(key: CodecKey, raw: string): Promise<unknown> {
  const payload = JSON.parse(raw) as CipherEnvelope;
  if (payload.mode === "xor" || !key.aes) {
    const bytes = unb64(payload.data);
    const plain = xorCrypt(key.raw, bytes);
    const body = payload.mode === "aes" ? plain : plain.subarray(12);
    return JSON.parse(dec.decode(body));
  }
  const iv = unb64(payload.iv || "");
  const data = unb64(payload.data);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key.aes,
    data.buffer as ArrayBuffer,
  );
  return JSON.parse(dec.decode(new Uint8Array(plain)));
}
