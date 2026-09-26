import { afterEach, describe, expect, it, vi } from "vitest";
import { b64, decryptJson, encryptJson, fallbackKey, importCodecKey, randomBytes } from "./CryptoCodec";
import type { AuthSession } from "../SaveTypes";

const SAMPLE = { gold: 42, name: "Harna", items: [{ uid: "a", stack: 3 }] };

function session(mode: AuthSession["mode"], key: string): AuthSession {
  return { user: "admin", at: 1, key, salt: b64(randomBytes(16)), mode };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CryptoCodec", () => {
  it("AES-GCM ida e volta com crypto.subtle", async () => {
    const key = await importCodecKey(session("aes", b64(randomBytes(32))));
    expect(key.aes).not.toBeNull();
    const blob = await encryptJson(key, SAMPLE);
    const envelope = JSON.parse(blob) as { mode: string; iv?: string };
    expect(envelope.mode).toBe("aes");
    expect(envelope.iv).toBeTruthy();
    expect(blob.includes("Harna")).toBe(false);
    expect(await decryptJson(key, blob)).toEqual(SAMPLE);
  });

  it("AES-GCM com chave errada falha", async () => {
    const key = await importCodecKey(session("aes", b64(randomBytes(32))));
    const other = await importCodecKey(session("aes", b64(randomBytes(32))));
    const blob = await encryptJson(key, SAMPLE);
    await expect(decryptJson(other, blob)).rejects.toThrow();
  });

  it("XOR ida e volta no modo file:// sem crypto.subtle", async () => {
    const raw = b64(fallbackKey("admin", b64(randomBytes(16)), 5000));
    const noSubtle = {
      getRandomValues: (a: Uint8Array) => {
        for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 256) | 0;
        return a;
      },
    };
    vi.stubGlobal("crypto", noSubtle);
    const key = await importCodecKey(session("aes", raw));
    expect(key.aes).toBeNull();
    const blob = await encryptJson(key, SAMPLE);
    expect(JSON.parse(blob).mode).toBe("xor");
    expect(blob.includes("Harna")).toBe(false);
    expect(await decryptJson(key, blob)).toEqual(SAMPLE);
  });

  it("XOR com sessão fallback mesmo havendo crypto.subtle", async () => {
    const key = await importCodecKey(session("fallback", b64(randomBytes(32))));
    expect(key.aes).toBeNull();
    const blob = await encryptJson(key, SAMPLE);
    expect(JSON.parse(blob).mode).toBe("xor");
    expect(await decryptJson(key, blob)).toEqual(SAMPLE);
  });
});
