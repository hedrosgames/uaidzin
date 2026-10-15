(function() {
  "use strict";
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const PBKDF2_ITERATIONS = 1e5;
  const FALLBACK_ITERATIONS = 5e3;
  function hasSubtleCrypto() {
    return typeof crypto !== "undefined" && !!crypto.subtle;
  }
  function b64(buf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function randomBytes(n) {
    const out = new Uint8Array(n);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(out);
      return out;
    }
    for (let i = 0; i < n; i++) out[i] = Math.random() * 256 | 0;
    return out;
  }
  function fnv1a(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function fallbackKey(password, saltB64, iterations) {
    let seed = fnv1a(password + "::" + saltB64);
    const n = Math.min(iterations, 5e3);
    for (let i = 0; i < n; i++) {
      seed = Math.imul(seed ^ i, 2654435761) + fnv1a(String(seed) + password) >>> 0;
    }
    const key = new Uint8Array(32);
    let x = seed;
    for (let i = 0; i < 32; i++) {
      x = Math.imul(x, 1664525) + 1013904223 >>> 0;
      key[i] = x >>> 16 & 255;
    }
    return key;
  }
  function xorCrypt(key, data) {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
    return out;
  }
  async function deriveBits(password, salt, iterations) {
    if (!hasSubtleCrypto()) {
      return fallbackKey(password, b64(salt), iterations);
    }
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt.buffer, iterations, hash: "SHA-256" },
      keyMaterial,
      256
    );
    return new Uint8Array(bits);
  }
  async function hashPassword(password, salt) {
    if (!hasSubtleCrypto()) return b64(fallbackKey(password, b64(salt), 2e3));
    return b64(await deriveBits(password, salt, PBKDF2_ITERATIONS));
  }
  async function importCodecKey(session) {
    const raw = unb64(session.key);
    if (session.mode !== "aes" || !hasSubtleCrypto()) return { raw, aes: null };
    const aes = await crypto.subtle.importKey(
      "raw",
      raw.buffer,
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
    return { raw, aes };
  }
  async function encryptJson(key, obj) {
    const data = enc.encode(JSON.stringify(obj));
    const iv = randomBytes(12);
    if (key.aes) {
      const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv.buffer },
        key.aes,
        data
      );
      const envelope2 = {
        v: 1,
        mode: "aes",
        iv: b64(iv),
        data: b64(cipher),
        at: Date.now()
      };
      return JSON.stringify(envelope2);
    }
    const mixed = new Uint8Array(iv.length + data.length);
    mixed.set(iv, 0);
    mixed.set(data, iv.length);
    const out = xorCrypt(key.raw, mixed);
    const envelope = {
      v: 1,
      mode: "xor",
      data: b64(out),
      at: Date.now()
    };
    return JSON.stringify(envelope);
  }
  async function decryptJson(key, raw) {
    const payload = JSON.parse(raw);
    if (payload.mode === "xor" || !key.aes) {
      const bytes = unb64(payload.data);
      const plain2 = xorCrypt(key.raw, bytes);
      const body = payload.mode === "aes" ? plain2 : plain2.subarray(12);
      return JSON.parse(dec.decode(body));
    }
    const iv = unb64(payload.iv || "");
    const data = unb64(payload.data);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer },
      key.aes,
      data.buffer
    );
    return JSON.parse(dec.decode(new Uint8Array(plain)));
  }
  const rawDungeons = [
    {
      id: "dungeon-1",
      name: "Dungeon 1",
      minLevel: 1,
      maxLevel: 40,
      entryItemId: null,
      durationSeconds: 600,
      arenas: [
        {
          id: "d1-a1",
          centerX: 0,
          centerZ: 2,
          halfSize: 18,
          spawns: [
            {
              id: "d1-a1-s1-a",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: -14,
              z: -11
            },
            {
              id: "d1-a1-s1-b",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: -12.8,
              z: -10.2
            },
            {
              id: "d1-a1-s1-c",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: -13.2,
              z: -12.2
            },
            {
              id: "d1-a1-s2-a",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: 14,
              z: -11
            },
            {
              id: "d1-a1-s2-b",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: 12.8,
              z: -10.2
            },
            {
              id: "d1-a1-s2-c",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: 13.2,
              z: -12.2
            },
            {
              id: "d1-a1-s3-a",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: -14,
              z: 9.5
            },
            {
              id: "d1-a1-s3-b",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: -12.8,
              z: 8.7
            },
            {
              id: "d1-a1-s3-c",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: -13.2,
              z: 10.7
            },
            {
              id: "d1-a1-s4-a",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: 14,
              z: 9.5
            },
            {
              id: "d1-a1-s4-b",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: 12.8,
              z: 8.7
            },
            {
              id: "d1-a1-s4-c",
              archetype: "chaser",
              monsterId: "caveira_campo",
              x: 13.2,
              z: 10.7
            }
          ]
        },
        {
          id: "d1-a2",
          centerX: 0,
          centerZ: -34,
          halfSize: 18,
          spawns: [
            {
              id: "d1-a2-w1-a",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: -14,
              z: -22.5
            },
            {
              id: "d1-a2-w1-b",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: -12.8,
              z: -23.3
            },
            {
              id: "d1-a2-w1-c",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: -13.2,
              z: -21.3
            },
            {
              id: "d1-a2-w2-a",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: 14,
              z: -22.5
            },
            {
              id: "d1-a2-w2-b",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: 12.8,
              z: -23.3
            },
            {
              id: "d1-a2-w2-c",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: 13.2,
              z: -21.3
            },
            {
              id: "d1-a2-w3-a",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: -14,
              z: -45.5
            },
            {
              id: "d1-a2-w3-b",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: -12.8,
              z: -44.7
            },
            {
              id: "d1-a2-w3-c",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: -13.2,
              z: -46.7
            },
            {
              id: "d1-a2-w4-a",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: 14,
              z: -45.5
            },
            {
              id: "d1-a2-w4-b",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: 12.8,
              z: -44.7
            },
            {
              id: "d1-a2-w4-c",
              archetype: "chaser",
              monsterId: "lobo_selvagem",
              x: 13.2,
              z: -46.7
            }
          ]
        },
        {
          id: "d1-a3",
          centerX: 0,
          centerZ: -72,
          halfSize: 20,
          spawns: [
            {
              id: "d1-a3-g1-a",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: -15,
              z: -57.5
            },
            {
              id: "d1-a3-g1-b",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: -13.7,
              z: -58.3
            },
            {
              id: "d1-a3-g1-c",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: -14.2,
              z: -56.3
            },
            {
              id: "d1-a3-g2-a",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: 15,
              z: -57.5
            },
            {
              id: "d1-a3-g2-b",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: 13.7,
              z: -58.3
            },
            {
              id: "d1-a3-g2-c",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: 14.2,
              z: -56.3
            },
            {
              id: "d1-a3-g3-a",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: -15,
              z: -86
            },
            {
              id: "d1-a3-g3-b",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: -13.7,
              z: -85.2
            },
            {
              id: "d1-a3-g3-c",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: -14.2,
              z: -87.2
            },
            {
              id: "d1-a3-g4-a",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: 15,
              z: -86
            },
            {
              id: "d1-a3-g4-b",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: 13.7,
              z: -85.2
            },
            {
              id: "d1-a3-g4-c",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: 14.2,
              z: -87.2
            },
            {
              id: "d1-a3-boss",
              archetype: "ranged",
              monsterId: "caveira_fogo",
              x: 0,
              z: -82,
              isBoss: true
            }
          ]
        }
      ]
    },
    {
      id: "dungeon-2",
      name: "Dungeon 2",
      minLevel: 35,
      maxLevel: 90,
      entryItemId: "vela",
      durationSeconds: 600,
      arenas: [
        {
          id: "d2-b1",
          centerX: -8,
          centerZ: -4,
          halfSize: 7,
          spawns: [
            {
              id: "d2-b1-s1",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: -9.5,
              z: -3
            },
            {
              id: "d2-b1-s2",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: -6.5,
              z: -3.5
            },
            {
              id: "d2-b1-elite",
              archetype: "ranged",
              monsterId: "caveira_especial",
              x: -8,
              z: -5
            }
          ]
        },
        {
          id: "d2-b2",
          centerX: 8,
          centerZ: -4,
          halfSize: 7,
          spawns: [
            {
              id: "d2-b2-s1",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: 6.5,
              z: -3.5
            },
            {
              id: "d2-b2-s2",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: 9.5,
              z: -3
            },
            {
              id: "d2-b2-elite",
              archetype: "ranged",
              monsterId: "caveira_especial",
              x: 8,
              z: -5
            }
          ]
        },
        {
          id: "d2-b3",
          centerX: -7,
          centerZ: 6,
          halfSize: 7,
          spawns: [
            {
              id: "d2-b3-s1",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: -8.5,
              z: 7
            },
            {
              id: "d2-b3-s2",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: -5.5,
              z: 6.5
            },
            {
              id: "d2-b3-elite",
              archetype: "ranged",
              monsterId: "caveira_especial",
              x: -7,
              z: 5
            }
          ]
        },
        {
          id: "d2-b4",
          centerX: 7,
          centerZ: 6,
          halfSize: 7,
          spawns: [
            {
              id: "d2-b4-s1",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: 5.5,
              z: 6.5
            },
            {
              id: "d2-b4-s2",
              archetype: "chaser",
              monsterId: "caveira_normal",
              x: 8.5,
              z: 7
            },
            {
              id: "d2-b4-boss",
              archetype: "ranged",
              monsterId: "caveira_especial",
              x: 7,
              z: 5,
              isBoss: true
            }
          ]
        }
      ]
    },
    {
      id: "dungeon-3",
      name: "Dungeon 3",
      minLevel: 80,
      maxLevel: 150,
      entryItemId: "entry_d3",
      durationSeconds: 600,
      arenas: [
        {
          id: "d3-a1",
          centerX: 0,
          centerZ: 0,
          halfSize: 10,
          spawns: [
            {
              id: "d3-a1-c1",
              archetype: "chaser",
              x: 5,
              z: 4
            },
            {
              id: "d3-a1-c2",
              archetype: "chaser",
              x: -5,
              z: 4
            },
            {
              id: "d3-a1-f1",
              archetype: "fixed",
              x: 0,
              z: -6
            }
          ]
        },
        {
          id: "d3-a2",
          centerX: -2,
          centerZ: -26,
          halfSize: 9,
          spawns: [
            {
              id: "d3-a2-c1",
              archetype: "chaser",
              x: 4,
              z: -23
            },
            {
              id: "d3-a2-c2",
              archetype: "chaser",
              x: -6,
              z: -28
            },
            {
              id: "d3-a2-r1",
              archetype: "ranged",
              x: 0,
              z: -34
            }
          ]
        },
        {
          id: "d3-a3",
          centerX: 0,
          centerZ: -50,
          halfSize: 10,
          spawns: [
            {
              id: "d3-a3-c1",
              archetype: "chaser",
              x: 6,
              z: -48
            },
            {
              id: "d3-a3-c2",
              archetype: "chaser",
              x: -6,
              z: -48
            },
            {
              id: "d3-a3-boss",
              archetype: "fixed",
              x: 0,
              z: -53,
              isBoss: true
            }
          ]
        }
      ]
    },
    {
      id: "dungeon-4",
      name: "Dungeon 4",
      minLevel: 140,
      maxLevel: 220,
      entryItemId: "entry_d4",
      durationSeconds: 600,
      arenas: [
        {
          id: "d4-a1",
          centerX: 0,
          centerZ: 0,
          halfSize: 8,
          spawns: [
            {
              id: "d4-a1-f1",
              archetype: "fixed",
              x: 4,
              z: -4
            },
            {
              id: "d4-a1-f2",
              archetype: "fixed",
              x: -4,
              z: -4
            },
            {
              id: "d4-a1-c1",
              archetype: "chaser",
              x: 5,
              z: 3
            },
            {
              id: "d4-a1-c2",
              archetype: "chaser",
              x: -5,
              z: 3
            }
          ]
        },
        {
          id: "d4-a2",
          centerX: 0,
          centerZ: -22,
          halfSize: 8,
          spawns: [
            {
              id: "d4-a2-f1",
              archetype: "fixed",
              x: 5,
              z: -26
            },
            {
              id: "d4-a2-r1",
              archetype: "ranged",
              x: -5,
              z: -28
            },
            {
              id: "d4-a2-c1",
              archetype: "chaser",
              x: 0,
              z: -19
            },
            {
              id: "d4-a2-r2",
              archetype: "ranged",
              x: 6,
              z: -28
            }
          ]
        },
        {
          id: "d4-a3",
          centerX: 0,
          centerZ: -46,
          halfSize: 9,
          spawns: [
            {
              id: "d4-a3-c1",
              archetype: "chaser",
              x: 5,
              z: -45
            },
            {
              id: "d4-a3-r1",
              archetype: "ranged",
              x: -5,
              z: -52
            },
            {
              id: "d4-a3-boss",
              archetype: "fixed",
              x: 0,
              z: -48,
              isBoss: true
            }
          ]
        }
      ]
    },
    {
      id: "dungeon-5",
      name: "Dungeon 5",
      minLevel: 200,
      maxLevel: 280,
      entryItemId: "entry_d5",
      durationSeconds: 600,
      arenas: [
        {
          id: "d5-a1",
          centerX: 0,
          centerZ: 0,
          halfSize: 8,
          spawns: [
            {
              id: "d5-a1-r1",
              archetype: "ranged",
              x: 6,
              z: -6
            },
            {
              id: "d5-a1-r2",
              archetype: "ranged",
              x: -6,
              z: -6
            },
            {
              id: "d5-a1-f1",
              archetype: "fixed",
              x: 0,
              z: 3
            }
          ]
        },
        {
          id: "d5-a2",
          centerX: 2,
          centerZ: -24,
          halfSize: 10,
          spawns: [
            {
              id: "d5-a2-r1",
              archetype: "ranged",
              x: 7,
              z: -30
            },
            {
              id: "d5-a2-c1",
              archetype: "chaser",
              x: -4,
              z: -24
            },
            {
              id: "d5-a2-f1",
              archetype: "fixed",
              x: 0,
              z: -28
            },
            {
              id: "d5-a2-r2",
              archetype: "ranged",
              x: -7,
              z: -31
            }
          ]
        },
        {
          id: "d5-a3",
          centerX: 0,
          centerZ: -48,
          halfSize: 11,
          spawns: [
            {
              id: "d5-a3-r1",
              archetype: "ranged",
              x: 6,
              z: -54
            },
            {
              id: "d5-a3-r2",
              archetype: "ranged",
              x: -6,
              z: -54
            },
            {
              id: "d5-a3-boss",
              archetype: "fixed",
              x: 0,
              z: -50,
              isBoss: true
            }
          ]
        }
      ]
    },
    {
      id: "dungeon-6",
      name: "Dungeon 6",
      minLevel: 260,
      maxLevel: 330,
      entryItemId: "entry_d6",
      durationSeconds: 600,
      arenas: [
        {
          id: "d6-a1",
          centerX: 0,
          centerZ: 0,
          halfSize: 10,
          spawns: [
            {
              id: "d6-a1-c1",
              archetype: "chaser",
              x: 5,
              z: 4
            },
            {
              id: "d6-a1-c2",
              archetype: "chaser",
              x: -5,
              z: 4
            },
            {
              id: "d6-a1-f1",
              archetype: "fixed",
              x: 0,
              z: -6
            }
          ]
        },
        {
          id: "d6-a2",
          centerX: -2,
          centerZ: -26,
          halfSize: 9,
          spawns: [
            {
              id: "d6-a2-c1",
              archetype: "chaser",
              x: 4,
              z: -23
            },
            {
              id: "d6-a2-c2",
              archetype: "chaser",
              x: -6,
              z: -28
            },
            {
              id: "d6-a2-r1",
              archetype: "ranged",
              x: 0,
              z: -34
            }
          ]
        },
        {
          id: "d6-a3",
          centerX: 0,
          centerZ: -50,
          halfSize: 10,
          spawns: [
            {
              id: "d6-a3-c1",
              archetype: "chaser",
              x: 6,
              z: -48
            },
            {
              id: "d6-a3-c2",
              archetype: "chaser",
              x: -6,
              z: -48
            },
            {
              id: "d6-a3-boss",
              archetype: "fixed",
              x: 0,
              z: -53,
              isBoss: true
            }
          ]
        }
      ]
    },
    {
      id: "dungeon-7",
      name: "Dungeon 7",
      minLevel: 310,
      maxLevel: 370,
      entryItemId: "entry_d7",
      durationSeconds: 600,
      arenas: [
        {
          id: "d7-a1",
          centerX: 0,
          centerZ: 0,
          halfSize: 8,
          spawns: [
            {
              id: "d7-a1-f1",
              archetype: "fixed",
              x: 4,
              z: -4
            },
            {
              id: "d7-a1-f2",
              archetype: "fixed",
              x: -4,
              z: -4
            },
            {
              id: "d7-a1-c1",
              archetype: "chaser",
              x: 5,
              z: 3
            },
            {
              id: "d7-a1-c2",
              archetype: "chaser",
              x: -5,
              z: 3
            }
          ]
        },
        {
          id: "d7-a2",
          centerX: 0,
          centerZ: -22,
          halfSize: 8,
          spawns: [
            {
              id: "d7-a2-f1",
              archetype: "fixed",
              x: 5,
              z: -26
            },
            {
              id: "d7-a2-r1",
              archetype: "ranged",
              x: -5,
              z: -28
            },
            {
              id: "d7-a2-c1",
              archetype: "chaser",
              x: 0,
              z: -19
            },
            {
              id: "d7-a2-r2",
              archetype: "ranged",
              x: 6,
              z: -28
            }
          ]
        },
        {
          id: "d7-a3",
          centerX: 0,
          centerZ: -46,
          halfSize: 9,
          spawns: [
            {
              id: "d7-a3-c1",
              archetype: "chaser",
              x: 5,
              z: -45
            },
            {
              id: "d7-a3-r1",
              archetype: "ranged",
              x: -5,
              z: -52
            },
            {
              id: "d7-a3-boss",
              archetype: "fixed",
              x: 0,
              z: -48,
              isBoss: true
            }
          ]
        }
      ]
    },
    {
      id: "dungeon-8",
      name: "Dungeon 8",
      minLevel: 350,
      maxLevel: 400,
      entryItemId: "entry_d8",
      durationSeconds: 600,
      arenas: [
        {
          id: "d8-a1",
          centerX: 0,
          centerZ: 0,
          halfSize: 10,
          spawns: [
            {
              id: "d8-a1-c1",
              archetype: "chaser",
              x: 5,
              z: 4
            },
            {
              id: "d8-a1-c2",
              archetype: "chaser",
              x: -5,
              z: 4
            },
            {
              id: "d8-a1-f1",
              archetype: "fixed",
              x: 0,
              z: -6
            }
          ]
        },
        {
          id: "d8-a2",
          centerX: -2,
          centerZ: -26,
          halfSize: 9,
          spawns: [
            {
              id: "d8-a2-c1",
              archetype: "chaser",
              x: 4,
              z: -23
            },
            {
              id: "d8-a2-c2",
              archetype: "chaser",
              x: -6,
              z: -28
            },
            {
              id: "d8-a2-r1",
              archetype: "ranged",
              x: 0,
              z: -34
            }
          ]
        },
        {
          id: "d8-a3",
          centerX: 0,
          centerZ: -50,
          halfSize: 10,
          spawns: [
            {
              id: "d8-a3-c1",
              archetype: "chaser",
              x: 6,
              z: -48
            },
            {
              id: "d8-a3-c2",
              archetype: "chaser",
              x: -6,
              z: -48
            },
            {
              id: "d8-a3-boss",
              archetype: "fixed",
              x: 0,
              z: -53,
              isBoss: true
            }
          ]
        }
      ]
    }
  ];
  const DUNGEONS_MORTAL = rawDungeons;
  function findDungeon(id) {
    return DUNGEONS_MORTAL.find((d) => d.id === id);
  }
  findDungeon("dungeon-1").arenas.slice(0, -1).map((arena) => arena.centerZ - arena.halfSize);
  const PROGRESSION_BALANCE = {
    baseAttributes: { FOR: 5, DES: 5, CONS: 5, INT: 5 }
  };
  function nextItemUid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  const rawItems = [
    {
      id: "pocao_menor",
      name: "Poção Menor",
      slot: "misc",
      rarity: "Comum",
      desc: "Restaura parte do HP.",
      icon: "/assets/icons/items/pocao_menor.png",
      sellValue: 4,
      stackable: true,
      available: false
    },
    {
      id: "mat_ori",
      name: "Poeira de Ori",
      slot: "material",
      rarity: "Comum",
      desc: "Refina equipamento até +6. Arraste sobre a peça no inventário ou equipada.",
      icon: "/assets/icons/items/mat_ori.png",
      sellValue: 2,
      stackable: true,
      available: true
    },
    {
      id: "mat_lac",
      name: "Poeira de Lac",
      slot: "material",
      rarity: "Comum",
      desc: "Refina equipamento de +7 até +9. Arraste sobre a peça no inventário ou equipada.",
      icon: "/assets/icons/items/mat_lac.png",
      sellValue: 8,
      stackable: true,
      available: true
    },
    {
      id: "poeira_ori",
      name: "Poeira de Ori",
      slot: "material",
      rarity: "Comum",
      desc: "Material de reforço até +5.",
      icon: "/assets/icons/items/mat_ori.png",
      sellValue: 2,
      stackable: true,
      available: false
    },
    {
      id: "poeira_lac",
      name: "Poeira de Lac",
      slot: "material",
      rarity: "Comum",
      desc: "Material de reforço de +6 a +10.",
      icon: "/assets/icons/items/mat_lac.png",
      sellValue: 8,
      stackable: true,
      available: false
    },
    {
      id: "entry_d4",
      name: "Selo D4",
      slot: "entry",
      rarity: "Comum",
      desc: "Consome ao entrar na Dungeon 4.",
      icon: "/assets/icons/items/entry_d4.png",
      sellValue: 20,
      available: true
    },
    {
      id: "entry_d5",
      name: "Selo D5",
      slot: "entry",
      rarity: "Comum",
      desc: "Consome ao entrar na Dungeon 5.",
      icon: "/assets/icons/items/entry_d5.png",
      sellValue: 35,
      available: true
    },
    {
      id: "entry_d6",
      name: "Selo D6",
      slot: "entry",
      rarity: "Comum",
      desc: "Consome ao entrar na Dungeon 6.",
      icon: "/assets/icons/items/entry_d6.png",
      sellValue: 50,
      available: true
    },
    {
      id: "entry_d7",
      name: "Selo D7",
      slot: "entry",
      rarity: "Comum",
      desc: "Consome ao entrar na Dungeon 7.",
      icon: "/assets/icons/items/entry_d7.png",
      sellValue: 75,
      available: true
    },
    {
      id: "entry_d8",
      name: "Selo D8",
      slot: "entry",
      rarity: "Comum",
      desc: "Consome ao entrar na Dungeon 8.",
      icon: "/assets/icons/items/entry_d8.png",
      sellValue: 100,
      available: true
    },
    {
      id: "espada_curta",
      name: "Espada Curta",
      slot: "weapon",
      rarity: "Comum",
      desc: "Ataque +4",
      icon: "/assets/icons/items/espada_curta.png",
      weaponSet: "sword-shield",
      attackBonus: 2,
      defenseBonus: 0,
      sellValue: 20,
      available: true
    },
    {
      id: "machado_leve",
      name: "Machado Leve",
      slot: "weapon",
      rarity: "Comum",
      desc: "Ataque +5",
      icon: "/assets/icons/items/machado_leve.png",
      weaponSet: "axe-shield",
      attackBonus: 3,
      defenseBonus: 0,
      sellValue: 0,
      available: true
    },
    {
      id: "armadura_leve",
      name: "Armadura Leve",
      slot: "armor",
      rarity: "Comum",
      desc: "Defesa +3",
      icon: "/assets/icons/items/armadura_leve.png",
      attackBonus: 0,
      defenseBonus: 2,
      sellValue: 18,
      available: true
    },
    {
      id: "capacete",
      name: "Capacete",
      slot: "head",
      rarity: "Comum",
      desc: "Defesa +2",
      icon: "/assets/icons/items/capacete.png",
      attackBonus: 0,
      defenseBonus: 1,
      sellValue: 14,
      available: true
    },
    {
      id: "anel_cobre",
      name: "Anel de Cobre",
      slot: "ring1",
      rarity: "Comum",
      desc: "Ataque +1 · Defesa +1",
      icon: "/assets/icons/items/anel_cobre.png",
      attackBonus: 1,
      defenseBonus: 1,
      sellValue: 10,
      available: true
    },
    {
      id: "anel_ferro",
      name: "Anel de Ferro",
      slot: "ring2",
      rarity: "Incomum",
      desc: "Ataque +2 · Defesa +2",
      icon: "/assets/icons/items/anel_ferro.png",
      attackBonus: 1,
      defenseBonus: 1,
      sellValue: 40,
      available: true
    },
    {
      id: "colar_simples",
      name: "Colar Simples",
      slot: "neck",
      rarity: "Comum",
      desc: "Ataque +1 · Defesa +1",
      icon: "/assets/icons/items/colar_simples.png",
      attackBonus: 1,
      defenseBonus: 1,
      sellValue: 12,
      available: true
    },
    {
      id: "brinco_osso",
      name: "Brinco de Osso",
      slot: "ear",
      rarity: "Comum",
      desc: "Ataque +1",
      icon: "/assets/icons/items/brinco_osso.png",
      attackBonus: 1,
      defenseBonus: 0,
      sellValue: 8,
      available: true
    },
    {
      id: "armor_chest_tk_silver",
      name: "Peitoral Thegn Knight Silver",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura silver de Thegn Knight. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_tk_silver.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 5,
      classId: "TK",
      available: true
    },
    {
      id: "armor_chest_tk_gold",
      name: "Peitoral Thegn Knight Gold",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura gold de Thegn Knight. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_tk_gold.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 8,
      classId: "TK",
      available: true
    },
    {
      id: "armor_chest_tk_adamant",
      name: "Peitoral Thegn Knight Adamant",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura adamant de Thegn Knight. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_tk_adamant.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 12,
      classId: "TK",
      available: true
    },
    {
      id: "armor_chest_fm_silver",
      name: "Peitoral Frost Maiden Silver",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura silver de Frost Maiden. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_fm_silver.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 5,
      classId: "FM",
      available: true
    },
    {
      id: "armor_chest_fm_gold",
      name: "Peitoral Frost Maiden Gold",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura gold de Frost Maiden. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_fm_gold.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 8,
      classId: "FM",
      available: true
    },
    {
      id: "armor_chest_fm_adamant",
      name: "Peitoral Frost Maiden Adamant",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura adamant de Frost Maiden. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_fm_adamant.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 12,
      classId: "FM",
      available: true
    },
    {
      id: "armor_chest_bm_silver",
      name: "Peitoral Beast Master Silver",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura silver de Beast Master. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_bm_silver.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 5,
      classId: "BM",
      available: true
    },
    {
      id: "armor_chest_bm_gold",
      name: "Peitoral Beast Master Gold",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura gold de Beast Master. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_bm_gold.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 8,
      classId: "BM",
      available: true
    },
    {
      id: "armor_chest_bm_adamant",
      name: "Peitoral Beast Master Adamant",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura adamant de Beast Master. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_bm_adamant.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 12,
      classId: "BM",
      available: true
    },
    {
      id: "armor_chest_ht_silver",
      name: "Peitoral Huntress Silver",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura silver de Huntress. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_ht_silver.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 5,
      classId: "HT",
      available: true
    },
    {
      id: "armor_chest_ht_gold",
      name: "Peitoral Huntress Gold",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura gold de Huntress. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_ht_gold.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 8,
      classId: "HT",
      available: true
    },
    {
      id: "armor_chest_ht_adamant",
      name: "Peitoral Huntress Adamant",
      slot: "armor",
      rarity: "Comum",
      desc: "Armadura adamant de Huntress. Defesa provisória por tier, fonte: valores atuais de equipamentos em items.json.",
      icon: "/assets/icons/items/armor_chest_ht_adamant.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 0,
      defenseBonus: 12,
      classId: "HT",
      available: true
    },
    {
      id: "pocao_vida",
      name: "Poção de Vida",
      slot: "consumable",
      rarity: "Comum",
      desc: "Restaura até 500 de vida.",
      icon: "/assets/icons/items/pocao_vida.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "restore",
        hp: 500,
        mp: 0
      },
      available: true
    },
    {
      id: "pocao_mana",
      name: "Poção de Mana",
      slot: "consumable",
      rarity: "Comum",
      desc: "Restaura até 500 de mana.",
      icon: "/assets/icons/items/pocao_mana.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "restore",
        hp: 0,
        mp: 500
      },
      available: true
    },
    {
      id: "pocao_vida_mana",
      name: "Poção de Vida e Mana",
      slot: "consumable",
      rarity: "Comum",
      desc: "Restaura até 500 de vida e 500 de mana.",
      icon: "/assets/icons/items/pocao_vida_mana.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "restore",
        hp: 500,
        mp: 500
      },
      available: true
    },
    {
      id: "antidoto",
      name: "Antídoto",
      slot: "consumable",
      rarity: "Comum",
      desc: "Remove efeitos negativos.",
      icon: "/assets/icons/items/antidoto.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "cleanse"
      },
      available: true
    },
    {
      id: "ouro",
      name: "Ouro",
      slot: "currency",
      rarity: "Comum",
      desc: "Crédito direto na reserva de ouro; não ocupa slot da bolsa.",
      icon: "/assets/icons/items/ouro.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "currency"
      },
      available: true
    },
    {
      id: "bau_xp",
      name: "Baú de XP",
      slot: "consumable",
      rarity: "Comum",
      desc: "Dobra o XP de inimigos derrotados por 4 horas. Duração provisória conforme pedido do Felipe.",
      icon: "/assets/icons/items/bau_xp.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "xp_multiplier",
        magnitude: 1,
        durationSec: 14400
      },
      available: true
    },
    {
      id: "frango_assado",
      name: "Frango Assado",
      slot: "consumable",
      rarity: "Comum",
      desc: "Adiciona 1000 de dano por ataque durante 4 horas.",
      icon: "/assets/icons/items/frango_assado.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "attack_flat",
        magnitude: 1e3,
        durationSec: 14400
      },
      available: true
    },
    {
      id: "entry_d2",
      name: "Entrada da Dungeon 2",
      slot: "entry",
      rarity: "Comum",
      desc: "Consome ao entrar na Dungeon 2.",
      icon: "/assets/icons/items/entry_d2.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      available: false
    },
    {
      id: "entry_d3",
      name: "Entrada da Dungeon 3",
      slot: "entry",
      rarity: "Comum",
      desc: "Consome ao entrar na Dungeon 3.",
      icon: "/assets/icons/items/entry_d3.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      available: true
    },
    {
      id: "scroll_01",
      name: "Pergaminho Fogo",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Fogo; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_01.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "scroll_02",
      name: "Pergaminho Gelo",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Gelo; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_02.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "scroll_03",
      name: "Pergaminho Raio",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Raio; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_03.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "scroll_04",
      name: "Pergaminho Veneno",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Veneno; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_04.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "scroll_05",
      name: "Pergaminho Sangue",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Sangue; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_05.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "scroll_06",
      name: "Pergaminho Sombra",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Sombra; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_06.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "scroll_07",
      name: "Pergaminho Luz",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Luz; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_07.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "scroll_08",
      name: "Pergaminho Vento",
      slot: "misc",
      rarity: "Comum",
      desc: "Pergaminho Vento; efeito aguardando definição.",
      icon: "/assets/icons/items/scroll_08.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "book_01",
      name: "Livro de Guerra",
      slot: "consumable",
      rarity: "Comum",
      desc: "Ensina a passiva Vida na linhagem Livros.",
      icon: "/assets/icons/items/book_01.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "learn_book",
        skillId: "book_hp"
      },
      available: true
    },
    {
      id: "book_02",
      name: "Livro de Sabedoria",
      slot: "consumable",
      rarity: "Comum",
      desc: "Ensina a passiva Ouro na linhagem Livros.",
      icon: "/assets/icons/items/book_02.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "learn_book",
        skillId: "book_gold"
      },
      available: true
    },
    {
      id: "book_03",
      name: "Livro de Bestiário",
      slot: "consumable",
      rarity: "Comum",
      desc: "Ensina a passiva Experiência na linhagem Livros.",
      icon: "/assets/icons/items/book_03.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "learn_book",
        skillId: "book_xp"
      },
      available: true
    },
    {
      id: "book_04",
      name: "Livro de Runas",
      slot: "consumable",
      rarity: "Comum",
      desc: "Ensina a passiva Cooldown na linhagem Livros.",
      icon: "/assets/icons/items/book_04.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "learn_book",
        skillId: "book_cd"
      },
      available: true
    },
    {
      id: "gema_01",
      name: "Gema Rubi",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Rubi reservada para composições futuras.",
      icon: "/assets/icons/items/gema_01.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_02",
      name: "Gema Safira",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Safira reservada para composições futuras.",
      icon: "/assets/icons/items/gema_02.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_03",
      name: "Gema Esmeralda",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Esmeralda reservada para composições futuras.",
      icon: "/assets/icons/items/gema_03.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_04",
      name: "Gema Ametista",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Ametista reservada para composições futuras.",
      icon: "/assets/icons/items/gema_04.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_05",
      name: "Gema Topázio",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Topázio reservada para composições futuras.",
      icon: "/assets/icons/items/gema_05.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_06",
      name: "Gema Diamante",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Diamante reservada para composições futuras.",
      icon: "/assets/icons/items/gema_06.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_07",
      name: "Gema Ônix",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Ônix reservada para composições futuras.",
      icon: "/assets/icons/items/gema_07.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_08",
      name: "Gema Opala",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Opala reservada para composições futuras.",
      icon: "/assets/icons/items/gema_08.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_09",
      name: "Gema Jade",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Jade reservada para composições futuras.",
      icon: "/assets/icons/items/gema_09.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_10",
      name: "Gema Granada",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Granada reservada para composições futuras.",
      icon: "/assets/icons/items/gema_10.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_11",
      name: "Gema Turquesa",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Turquesa reservada para composições futuras.",
      icon: "/assets/icons/items/gema_11.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_12",
      name: "Gema Quartzo",
      slot: "material",
      rarity: "Comum",
      desc: "Gema Quartzo reservada para composições futuras.",
      icon: "/assets/icons/items/gema_12.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_bless",
      name: "Gema Bless",
      slot: "material",
      rarity: "Comum",
      desc: "Refina equipamento de +10 até +12. Arraste sobre a peça no inventário ou equipada.",
      icon: "/assets/icons/items/gema_bless.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_soul",
      name: "Gema Soul",
      slot: "material",
      rarity: "Comum",
      desc: "Refina equipamento de +13 até +15. Arraste sobre a peça no inventário ou equipada.",
      icon: "/assets/icons/items/gema_soul.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_life",
      name: "Gema Life",
      slot: "material",
      rarity: "Comum",
      desc: "Aumenta o adicional da peça (até 10 níveis). Arraste sobre arma, armadura ou acessório.",
      icon: "/assets/icons/items/gema_life.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "gema_chaos",
      name: "Gema do Chaos",
      slot: "material",
      rarity: "Comum",
      desc: "Gema do Chaos, referência visual de MMORPG; usos em composição/refino sem receita nova.",
      icon: "/assets/icons/items/gema_chaos.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "ring_01",
      name: "Anel da Vitalidade",
      slot: "ring1",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_01.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 2,
      available: true
    },
    {
      id: "ring_02",
      name: "Anel da Fortuna",
      slot: "ring1",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_02.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 2,
      defenseBonus: 1,
      available: true
    },
    {
      id: "ring_03",
      name: "Anel da Precisão",
      slot: "ring1",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_03.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 1,
      available: true
    },
    {
      id: "ring_04",
      name: "Anel da Força",
      slot: "ring1",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_04.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 2,
      available: true
    },
    {
      id: "ring_05",
      name: "Anel da Agilidade",
      slot: "ring2",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_05.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 2,
      defenseBonus: 1,
      available: true
    },
    {
      id: "ring_06",
      name: "Anel da Proteção",
      slot: "ring2",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_06.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 1,
      available: true
    },
    {
      id: "ring_07",
      name: "Anel da Sanguessuga",
      slot: "ring2",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_07.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 2,
      available: true
    },
    {
      id: "ring_08",
      name: "Anel da Fortaleza",
      slot: "ring2",
      rarity: "Comum",
      desc: "Bônus provisórios inspirados em acessórios de MMORPG; fonte de escala: bônus atuais dos equipamentos em items.json.",
      icon: "/assets/icons/items/ring_08.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 2,
      defenseBonus: 1,
      available: true
    },
    {
      id: "earring_01",
      name: "Brinco Lobo",
      slot: "ear",
      rarity: "Comum",
      desc: "Bônus provisório de ataque; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/earring_01.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 2,
      available: true
    },
    {
      id: "earring_02",
      name: "Brinco Águia",
      slot: "ear",
      rarity: "Comum",
      desc: "Bônus provisório de ataque; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/earring_02.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 1,
      available: true
    },
    {
      id: "earring_03",
      name: "Brinco Corvo",
      slot: "ear",
      rarity: "Comum",
      desc: "Bônus provisório de ataque; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/earring_03.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 2,
      defenseBonus: 1,
      available: true
    },
    {
      id: "earring_04",
      name: "Brinco Fênix",
      slot: "ear",
      rarity: "Comum",
      desc: "Bônus provisório de ataque; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/earring_04.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 2,
      defenseBonus: 0,
      available: true
    },
    {
      id: "necklace_01",
      name: "Colar Guardião",
      slot: "neck",
      rarity: "Comum",
      desc: "Bônus provisórios de ataque e defesa; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/necklace_01.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 2,
      available: true
    },
    {
      id: "necklace_02",
      name: "Colar Oráculo",
      slot: "neck",
      rarity: "Comum",
      desc: "Bônus provisórios de ataque e defesa; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/necklace_02.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 1,
      defenseBonus: 2,
      available: true
    },
    {
      id: "necklace_03",
      name: "Colar Caçador",
      slot: "neck",
      rarity: "Comum",
      desc: "Bônus provisórios de ataque e defesa; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/necklace_03.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 2,
      defenseBonus: 1,
      available: true
    },
    {
      id: "necklace_04",
      name: "Colar Tempestade",
      slot: "neck",
      rarity: "Comum",
      desc: "Bônus provisórios de ataque e defesa; fonte: escala atual de equipamentos em items.json.",
      icon: "/assets/icons/items/necklace_04.png",
      sellValue: 1,
      stackable: false,
      attackBonus: 2,
      defenseBonus: 1,
      available: true
    },
    {
      id: "rune_fehu",
      name: "Runa Fehu",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Fehu; componente de composição futura.",
      icon: "/assets/icons/items/rune_fehu.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_uruz",
      name: "Runa Uruz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Uruz; componente de composição futura.",
      icon: "/assets/icons/items/rune_uruz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_thurisaz",
      name: "Runa Thurisaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Thurisaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_thurisaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_ansuz",
      name: "Runa Ansuz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Ansuz; componente de composição futura.",
      icon: "/assets/icons/items/rune_ansuz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_raidho",
      name: "Runa Raidho",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Raidho; componente de composição futura.",
      icon: "/assets/icons/items/rune_raidho.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_kenaz",
      name: "Runa Kenaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Kenaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_kenaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_gebo",
      name: "Runa Gebo",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Gebo; componente de composição futura.",
      icon: "/assets/icons/items/rune_gebo.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_wunjo",
      name: "Runa Wunjo",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Wunjo; componente de composição futura.",
      icon: "/assets/icons/items/rune_wunjo.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_hagalaz",
      name: "Runa Hagalaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Hagalaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_hagalaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_nauthiz",
      name: "Runa Nauthiz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Nauthiz; componente de composição futura.",
      icon: "/assets/icons/items/rune_nauthiz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_isa",
      name: "Runa Isa",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Isa; componente de composição futura.",
      icon: "/assets/icons/items/rune_isa.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_jera",
      name: "Runa Jera",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Jera; componente de composição futura.",
      icon: "/assets/icons/items/rune_jera.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_eihwaz",
      name: "Runa Eihwaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Eihwaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_eihwaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_perthro",
      name: "Runa Perthro",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Perthro; componente de composição futura.",
      icon: "/assets/icons/items/rune_perthro.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_algiz",
      name: "Runa Algiz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Algiz; componente de composição futura.",
      icon: "/assets/icons/items/rune_algiz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_sowilo",
      name: "Runa Sowilo",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Sowilo; componente de composição futura.",
      icon: "/assets/icons/items/rune_sowilo.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_tiwaz",
      name: "Runa Tiwaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Tiwaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_tiwaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_berkano",
      name: "Runa Berkano",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Berkano; componente de composição futura.",
      icon: "/assets/icons/items/rune_berkano.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_ehwaz",
      name: "Runa Ehwaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Ehwaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_ehwaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_mannaz",
      name: "Runa Mannaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Mannaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_mannaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_laguz",
      name: "Runa Laguz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Laguz; componente de composição futura.",
      icon: "/assets/icons/items/rune_laguz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_ingwaz",
      name: "Runa Ingwaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Ingwaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_ingwaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_dagaz",
      name: "Runa Dagaz",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Dagaz; componente de composição futura.",
      icon: "/assets/icons/items/rune_dagaz.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "rune_othala",
      name: "Runa Othala",
      slot: "material",
      rarity: "Comum",
      desc: "Runa Elder Futhark Othala; componente de composição futura.",
      icon: "/assets/icons/items/rune_othala.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "composition_component"
      },
      available: true
    },
    {
      id: "chalice_xp_01",
      name: "Cálice da Sabedoria Rubi",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_01.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_02",
      name: "Cálice da Sabedoria Safira",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_02.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_03",
      name: "Cálice da Sabedoria Esmeralda",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_03.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_04",
      name: "Cálice da Sabedoria Âmbar",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_04.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_05",
      name: "Cálice da Sabedoria Ametista",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_05.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_06",
      name: "Cálice da Sabedoria Água-marinha",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_06.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_07",
      name: "Cálice da Sabedoria Jade",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_07.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_08",
      name: "Cálice da Sabedoria Granada",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_08.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_09",
      name: "Cálice da Sabedoria Topázio",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_09.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_10",
      name: "Cálice da Sabedoria Opala",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_10.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_11",
      name: "Cálice da Sabedoria Turquesa",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_11.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "chalice_xp_12",
      name: "Cálice da Sabedoria Quartzo Rosa",
      slot: "consumable",
      rarity: "Comum",
      desc: "Concede XP ao ser usado; valor provisório uniforme de 100 XP, baseado no pedido de cálices de XP.",
      icon: "/assets/icons/items/chalice_xp_12.png",
      sellValue: 1,
      stackable: true,
      attackBonus: 0,
      defenseBonus: 0,
      effect: {
        type: "grant_xp",
        amount: 100
      },
      available: true
    },
    {
      id: "weapon_sword",
      name: "Espada",
      slot: "weapon",
      rarity: "Comum",
      desc: "Peça individual Espada. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_sword.png",
      sellValue: 10,
      attackBonus: 3,
      defenseBonus: 0,
      stackable: false,
      available: true,
      weaponSet: "sword-shield"
    },
    {
      id: "weapon_shield",
      name: "Escudo",
      slot: "offhand",
      rarity: "Comum",
      desc: "Peça individual Escudo. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_shield.png",
      sellValue: 10,
      attackBonus: 0,
      defenseBonus: 3,
      stackable: false,
      available: true
    },
    {
      id: "weapon_axe",
      name: "Machado",
      slot: "weapon",
      rarity: "Comum",
      desc: "Peça individual Machado. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_axe.png",
      sellValue: 10,
      attackBonus: 4,
      defenseBonus: 0,
      stackable: false,
      available: true,
      weaponSet: "axe-shield"
    },
    {
      id: "weapon_greatsword",
      name: "Espadão",
      slot: "weapon",
      rarity: "Comum",
      desc: "Peça individual Espadão. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_greatsword.png",
      sellValue: 10,
      attackBonus: 5,
      defenseBonus: 0,
      stackable: false,
      available: true,
      weaponSet: "greatsword"
    },
    {
      id: "weapon_staff",
      name: "Cajado",
      slot: "weapon",
      rarity: "Comum",
      desc: "Peça individual Cajado. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_staff.png",
      sellValue: 10,
      attackBonus: 3,
      defenseBonus: 0,
      stackable: false,
      available: true,
      weaponSet: "staff-shield"
    },
    {
      id: "weapon_greatstaff",
      name: "Cajadão",
      slot: "weapon",
      rarity: "Comum",
      desc: "Peça individual Cajadão. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_greatstaff.png",
      sellValue: 10,
      attackBonus: 4,
      defenseBonus: 0,
      stackable: false,
      available: true,
      weaponSet: "greatstaff"
    },
    {
      id: "weapon_bow",
      name: "Arco",
      slot: "weapon",
      rarity: "Comum",
      desc: "Peça individual Arco. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_bow.png",
      sellValue: 10,
      attackBonus: 4,
      defenseBonus: 0,
      stackable: false,
      available: true,
      weaponSet: "bow"
    },
    {
      id: "weapon_glove",
      name: "Manopla de Garras",
      slot: "weapon",
      rarity: "Comum",
      desc: "Peça individual Manopla de Garras. Bônus provisório baseado nos equipamentos atuais em items.json.",
      icon: "/assets/icons/items/weapon_glove.png",
      sellValue: 10,
      attackBonus: 4,
      defenseBonus: 0,
      stackable: false,
      available: true,
      weaponSet: "dual-gloves"
    },
    {
      id: "cajado_rustico",
      name: "Cajado Rústico",
      slot: "weapon",
      rarity: "Comum",
      desc: "Ataque +4",
      icon: "/assets/icons/items/cajado_rustico.png",
      weaponSet: "staff-shield",
      attackBonus: 2,
      defenseBonus: 0,
      sellValue: 18,
      available: true
    },
    {
      id: "arco_curto",
      name: "Arco Curto",
      slot: "weapon",
      rarity: "Comum",
      desc: "Ataque +4",
      icon: "/assets/icons/items/arco_curto.png",
      weaponSet: "bow",
      attackBonus: 2,
      defenseBonus: 0,
      sellValue: 18,
      available: true
    },
    {
      id: "touca_couro",
      name: "Touca de Couro",
      slot: "head",
      rarity: "Comum",
      desc: "Defesa +2",
      icon: "/assets/icons/items/touca_couro.png",
      attackBonus: 0,
      defenseBonus: 1,
      sellValue: 12,
      available: true
    },
    {
      id: "tunica",
      name: "Túnica",
      slot: "armor",
      rarity: "Comum",
      desc: "Defesa +3",
      icon: "/assets/icons/items/tunica.png",
      attackBonus: 0,
      defenseBonus: 2,
      sellValue: 16,
      available: true
    },
    {
      id: "vela",
      name: "Vela",
      slot: "entry",
      rarity: "Comum",
      desc: "Entrada da Dungeon 2. Consome ao entrar.",
      icon: "/assets/icons/items/vela.png",
      sellValue: 25,
      stackable: true,
      available: true
    },
    {
      id: "pena_fenix",
      name: "Pena da Fênix",
      slot: "consumable",
      rarity: "Raro",
      desc: "Revive o personagem uma vez. Reutilizável após 10 minutos.",
      icon: "/assets/icons/items/pena_fenix.png",
      stackable: true,
      available: true,
      effect: {
        type: "revive",
        cooldownSec: 600
      },
      sellValue: 40
    }
  ];
  const EQUIP_RARITIES = ["Comum", "Incomum", "Épico", "Lendário"];
  function equipRarityIndex(rarity) {
    const idx = EQUIP_RARITIES.indexOf(rarity);
    return idx >= 0 ? idx : 0;
  }
  function gearPowerTier(gearSet, rarity) {
    const r = equipRarityIndex(rarity);
    return (gearSet - 1) * 2 + r;
  }
  function weaponPrimaryAttack(powerTier) {
    return 4 + powerTier * 2;
  }
  function armorPrimaryDefense(powerTier) {
    return 3 + powerTier * 2;
  }
  const RARITY_SLUG = {
    Comum: "comum",
    Incomum: "incomum",
    Épico: "epico",
    Lendário: "lendario"
  };
  const WEAPON_VISUAL = {
    1: "sword-shield",
    2: "greatsword",
    3: "dual-gloves"
  };
  const ARMOR_ICON = {
    1: "/assets/icons/items/tunica.png",
    2: "/assets/icons/items/armor_chest_tk_gold.png",
    3: "/assets/icons/items/armor_chest_tk_adamant.png"
  };
  const WEAPON_ICON = {
    1: "/assets/icons/items/weapon_sword.png",
    2: "/assets/icons/items/weapon_greatsword.png",
    3: "/assets/icons/items/weapon_glove.png"
  };
  function secondaryForWeapon(rarity) {
    if (rarity === "Épico") return { speedBonus: 2 };
    if (rarity === "Lendário") return { critBonus: 3, speedBonus: 2 };
    return {};
  }
  function secondaryForArmor(rarity) {
    if (rarity === "Incomum") return { secondaryDefense: 1 };
    if (rarity === "Épico") return { secondaryDefense: 2 };
    if (rarity === "Lendário") return { secondaryDefense: 3 };
    return {};
  }
  function buildItems() {
    const out = [];
    for (const gearSet of [1, 2, 3]) {
      for (const rarity of EQUIP_RARITIES) {
        const tier = gearPowerTier(gearSet, rarity);
        const slug = RARITY_SLUG[rarity];
        const atk = weaponPrimaryAttack(tier);
        const def = armorPrimaryDefense(tier);
        out.push({
          id: `weapon_gear${gearSet}_${slug}`,
          name: `Arma do Conjunto ${gearSet} (${rarity})`,
          slot: "weapon",
          rarity,
          desc: `Conjunto de arma ${gearSet}. Primário: ataque. Refino só aumenta ataque.`,
          icon: WEAPON_ICON[gearSet],
          sellValue: 8 + tier * 4,
          attackBonus: atk,
          defenseBonus: 0,
          stackable: false,
          weaponSet: WEAPON_VISUAL[gearSet],
          gearSet,
          primaryStat: "attack",
          available: true,
          ...secondaryForWeapon(rarity)
        });
        out.push({
          id: `armor_gear${gearSet}_${slug}`,
          name: `Armadura do Conjunto ${gearSet} (${rarity})`,
          slot: "armor",
          rarity,
          desc: `Conjunto de armadura ${gearSet}. Primário: defesa. Refino só aumenta defesa.`,
          icon: ARMOR_ICON[gearSet],
          sellValue: 6 + tier * 4,
          attackBonus: 0,
          defenseBonus: def,
          stackable: false,
          gearSet,
          primaryStat: "defense",
          available: true,
          ...secondaryForArmor(rarity)
        });
      }
    }
    return out;
  }
  const EQUIPMENT_SET_ITEMS = buildItems();
  const ITEM_CATALOG = {};
  for (const item of rawItems) {
    ITEM_CATALOG[item.id] = item;
  }
  for (const item of EQUIPMENT_SET_ITEMS) {
    ITEM_CATALOG[item.id] = item;
  }
  const ECONOMY_BALANCE = {
    goldCap: 2e9
  };
  function shopItemFromCatalog(id) {
    const def = ITEM_CATALOG[id];
    if (!def || !def.icon || def.available === false) {
      throw new Error(`SHOP_CATALOG: item sem ícone ou def: ${id}`);
    }
    return {
      id: def.id,
      name: def.name,
      slot: def.slot,
      rarity: def.rarity,
      desc: def.desc,
      icon: def.icon
    };
  }
  function shopItems() {
    const out = {};
    for (const [id, def] of Object.entries(ITEM_CATALOG)) {
      if (def && def.icon && def.available !== false) {
        out[id] = shopItemFromCatalog(id);
      }
    }
    return out;
  }
  ({
    items: shopItems()
  });
  const SAVE_VERSION = 4;
  const SLOT_COUNT = 4;
  const ACCOUNT_SAVE_VERSION = 3;
  const PROFILE_SECTIONS = [
    "meta",
    "character",
    "skills",
    "skillLoadout",
    "equipment",
    "inventory",
    "bags",
    "buffs",
    "progress",
    "options"
  ];
  function emptyAttrs() {
    const base = PROGRESSION_BALANCE.baseAttributes;
    return { FOR: base.FOR, DES: base.DES, CONS: base.CONS, INT: base.INT };
  }
  function emptyTreeMap() {
    return { controle: 0, magia: 0, fisica: 0 };
  }
  function treeCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  }
  function normalizeTreeMap(src) {
    const t = src && typeof src === "object" ? src : {};
    return {
      controle: treeCount(t.controle),
      magia: treeCount(t.magia),
      fisica: treeCount(t.fisica)
    };
  }
  function emptyProgress() {
    return { dungeonsUnlocked: [], dungeonClears: {}, quests: {} };
  }
  function emptyVault() {
    return { gold: 0, items: [] };
  }
  function emptyBags() {
    return { unlocked: [true, false, false, false] };
  }
  function emptySkillLoadout() {
    return { slots: [] };
  }
  function normalizeSlots(slots) {
    const raw = Array.isArray(slots) ? slots : [];
    const out = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const s = raw[i];
      if (!s || typeof s !== "object" || !s.classId || !s.name) {
        out.push(null);
        continue;
      }
      out.push({
        profileId: String(s.profileId || ""),
        classId: String(s.classId),
        name: String(s.name),
        level: Number(s.level) || 1,
        evolution: String(s.evolution || "Mortal"),
        gold: treeCount(s.gold),
        resets: treeCount(s.resets),
        attrs: {
          FOR: Math.max(emptyAttrs().FOR, treeCount(s.attrs?.FOR)),
          DES: Math.max(emptyAttrs().DES, treeCount(s.attrs?.DES)),
          CONS: Math.max(emptyAttrs().CONS, treeCount(s.attrs?.CONS)),
          INT: Math.max(emptyAttrs().INT, treeCount(s.attrs?.INT))
        },
        trees: normalizeTreeMap(s.trees),
        spec: normalizeTreeMap(s.spec),
        saveVersion: treeCount(s.saveVersion)
      });
    }
    return out;
  }
  function normalizeVault(raw) {
    const data = raw || {};
    const items = [];
    const seen = /* @__PURE__ */ new Set();
    if (Array.isArray(data.items)) {
      for (const it of data.items) {
        if (!it || typeof it !== "object" || typeof it.uid !== "string") continue;
        let uid = String(it.uid);
        if (seen.has(uid)) {
          uid = nextItemUid();
        }
        seen.add(uid);
        items.push({ ...it, uid });
      }
    }
    return {
      gold: Math.min(
        ECONOMY_BALANCE.goldCap,
        Math.max(0, Math.floor(Number(data.gold) || 0))
      ),
      items
    };
  }
  function profileIdFor(userId, slotIndex) {
    return `${userId}:slot:${slotIndex}`;
  }
  function parseProfileId(profileId) {
    const m = /^(.+):slot:(\d+)$/.exec(profileId);
    if (!m) return null;
    return { userId: m[1], slotIndex: Number(m[2]) };
  }
  function summaryFromPayload(payload) {
    const spec = normalizeTreeMap(payload.skills.specialization);
    const trees = emptyTreeMap();
    const learned = payload.skills.learned || [];
    for (const skillId of learned) {
      if (skillId.includes("_ctrl") || skillId.includes("controle")) trees.controle += 1;
      else if (skillId.includes("_mag") || skillId.includes("magia")) trees.magia += 1;
      else if (skillId.includes("_fis") || skillId.includes("fisica")) trees.fisica += 1;
    }
    return {
      profileId: payload.meta.profileId,
      classId: payload.character.classId || payload.skills.classId,
      name: payload.character.name,
      level: payload.character.level,
      evolution: payload.character.evolution,
      gold: payload.inventory.gold,
      resets: payload.character.resetsInEvolution,
      attrs: { ...payload.character.attributes },
      trees,
      spec,
      saveVersion: SAVE_VERSION
    };
  }
  const DB_NAME = "uaidzin";
  const LEGACY_STORE = "save";
  const SECTIONS_STORE = "sections";
  const DB_VERSION = 3;
  const OPEN_BLOCKED_TIMEOUT_MS = 5e3;
  function lsProfileKey(profileId) {
    return `uaidzin.save.${profileId}`;
  }
  function lsProfilePrevKey(profileId) {
    return `uaidzin.save.${profileId}:prev`;
  }
  function idbProfileKey(profileId) {
    return `profile:${profileId}`;
  }
  function idbProfilePrevKey(profileId) {
    return `profile:${profileId}:prev`;
  }
  function sectionKey(profileId, section) {
    return `profile:${profileId}:${section}`;
  }
  function mirrorKey(profileId) {
    return `uaidzin.mirror.${profileId}`;
  }
  function vaultMirrorKey(userId) {
    return `uaidzin.mirror.vault.${userId}`;
  }
  function accountKey(userId, part) {
    return `account:${userId}:${part}`;
  }
  function putAccount(store, account) {
    if (!account) return;
    if (account.slots !== void 0) store.put(account.slots, accountKey(account.userId, "slots"));
    if (account.vault !== void 0) store.put(account.vault, accountKey(account.userId, "vault"));
  }
  let dbPromise = null;
  function openDb() {
    if (typeof indexedDB === "undefined") return Promise.reject(new Error("idb_unavailable"));
    dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      let blockedTimer = null;
      let timedOut = false;
      req.onblocked = () => {
        blockedTimer ??= setTimeout(() => {
          timedOut = true;
          reject(new Error("idb_open_blocked"));
        }, OPEN_BLOCKED_TIMEOUT_MS);
      };
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LEGACY_STORE)) db.createObjectStore(LEGACY_STORE);
        if (!db.objectStoreNames.contains(SECTIONS_STORE)) db.createObjectStore(SECTIONS_STORE);
      };
      req.onsuccess = () => {
        if (blockedTimer) clearTimeout(blockedTimer);
        const db = req.result;
        if (timedOut) {
          db.close();
          return;
        }
        if (!db.objectStoreNames.contains(SECTIONS_STORE) || !db.objectStoreNames.contains(LEGACY_STORE)) {
          db.close();
          reject(new Error("idb_store_missing"));
          return;
        }
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onclose = () => {
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        if (blockedTimer) clearTimeout(blockedTimer);
        reject(new Error("idb_open_failed"));
      };
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
    return dbPromise;
  }
  function runTx(stores, mode, body, failure) {
    return openDb().then(
      (db) => new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(stores, mode);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error(failure));
          tx.onabort = () => reject(new Error(failure));
          body(tx);
        } catch {
          reject(new Error(failure));
        }
      })
    );
  }
  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
  class SaveStore {
    async readAll(profileId) {
      if (typeof indexedDB === "undefined") return {};
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const out = {};
        try {
          const tx = db.transaction(SECTIONS_STORE, "readonly");
          const store = tx.objectStore(SECTIONS_STORE);
          for (const section of PROFILE_SECTIONS) {
            const req = store.get(sectionKey(profileId, section));
            req.onsuccess = () => {
              if (typeof req.result === "string") out[section] = req.result;
            };
            req.onerror = () => reject(new Error("idb_read_failed"));
          }
          tx.oncomplete = () => resolve(out);
          tx.onerror = () => reject(new Error("idb_read_failed"));
          tx.onabort = () => reject(new Error("idb_read_failed"));
        } catch {
          reject(new Error("idb_read_failed"));
        }
      });
    }
    async readAccount(userId) {
      if (typeof indexedDB === "undefined") return {};
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const out = {};
        try {
          const tx = db.transaction(SECTIONS_STORE, "readonly");
          const store = tx.objectStore(SECTIONS_STORE);
          for (const part of ["slots", "vault"]) {
            const req = store.get(accountKey(userId, part));
            req.onsuccess = () => {
              if (typeof req.result === "string") out[part] = req.result;
            };
            req.onerror = () => reject(new Error("idb_read_failed"));
          }
          tx.oncomplete = () => resolve(out);
          tx.onerror = () => reject(new Error("idb_read_failed"));
          tx.onabort = () => reject(new Error("idb_read_failed"));
        } catch {
          reject(new Error("idb_read_failed"));
        }
      });
    }
    writeMany(profileId, blobs, account = null) {
      return runTx(
        [SECTIONS_STORE],
        "readwrite",
        (tx) => {
          const store = tx.objectStore(SECTIONS_STORE);
          if (profileId) {
            for (const section of PROFILE_SECTIONS) {
              const blob = blobs[section];
              if (blob !== void 0) store.put(blob, sectionKey(profileId, section));
            }
          }
          putAccount(store, account);
        },
        "idb_write_failed"
      );
    }
    async clearLegacyProfile(profileId) {
      lsRemove(lsProfileKey(profileId));
      lsRemove(lsProfilePrevKey(profileId));
      await runTx(
        [LEGACY_STORE],
        "readwrite",
        (tx) => {
          const store = tx.objectStore(LEGACY_STORE);
          store.delete(idbProfileKey(profileId));
          store.delete(idbProfilePrevKey(profileId));
        },
        "idb_delete_failed"
      );
    }
    async clearProfile(profileId, account = null) {
      lsRemove(lsProfileKey(profileId));
      lsRemove(lsProfilePrevKey(profileId));
      lsRemove(mirrorKey(profileId));
      lsRemove(`uaidzin.save`);
      if (typeof indexedDB === "undefined" && !account) return;
      await runTx(
        [SECTIONS_STORE, LEGACY_STORE],
        "readwrite",
        (tx) => {
          const sections = tx.objectStore(SECTIONS_STORE);
          for (const section of PROFILE_SECTIONS) sections.delete(sectionKey(profileId, section));
          const legacy = tx.objectStore(LEGACY_STORE);
          legacy.delete(idbProfileKey(profileId));
          legacy.delete(idbProfilePrevKey(profileId));
          legacy.delete("profile");
          putAccount(sections, account);
        },
        "idb_delete_failed"
      );
    }
    readMirror(profileId) {
      const raw = lsGet(mirrorKey(profileId));
      if (!raw) return null;
      try {
        const data = JSON.parse(raw);
        return data?.sections && typeof data.sections === "object" ? data.sections : null;
      } catch {
        return null;
      }
    }
    writeMirror(profileId, blobs) {
      return lsSet(mirrorKey(profileId), JSON.stringify({ sections: blobs }));
    }
    readVaultMirror(userId) {
      return lsGet(vaultMirrorKey(userId));
    }
    writeVaultMirror(userId, envelope) {
      return lsSet(vaultMirrorKey(userId), envelope);
    }
    clearVaultMirror(userId) {
      lsRemove(vaultMirrorKey(userId));
    }
    async clearAccount(userId) {
      lsRemove(vaultMirrorKey(userId));
      if (typeof indexedDB === "undefined") return;
      await runTx(
        [SECTIONS_STORE],
        "readwrite",
        (tx) => {
          const store = tx.objectStore(SECTIONS_STORE);
          store.delete(accountKey(userId, "slots"));
          store.delete(accountKey(userId, "vault"));
        },
        "idb_delete_failed"
      );
    }
    async wipeAllUaidzinStorage(includeSettings = false) {
      const keys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.startsWith("uaidzin")) {
            if (!includeSettings && key === "uaidzin_settings") continue;
            keys.push(key);
          }
        }
      } catch {
      }
      for (const key of keys) lsRemove(key);
      try {
        sessionStorage.removeItem("uaidzin_session_v1");
        sessionStorage.removeItem("uaidzin_active_char");
      } catch {
      }
      if (typeof indexedDB === "undefined") return;
      await runTx(
        [SECTIONS_STORE, LEGACY_STORE],
        "readwrite",
        (tx) => {
          tx.objectStore(SECTIONS_STORE).clear();
          tx.objectStore(LEGACY_STORE).clear();
        },
        "idb_clear_failed"
      );
    }
  }
  const ACCOUNTS_KEY = "uaidzin_accounts_v1";
  const SESSION_KEY = "uaidzin_session_v1";
  const REMEMBER_KEY = "uaidzin_login";
  const ACCOUNTS_LOCK = "uaidzin:accounts";
  function readAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function writeAccounts(acc) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
  }
  function withAccounts(task) {
    const run = () => task(readAccounts());
    const locks = typeof navigator !== "undefined" ? navigator.locks : void 0;
    return locks ? locks.request(ACCOUNTS_LOCK, run) : Promise.resolve().then(run);
  }
  async function newRecord(userId, password) {
    const saltBytes = randomBytes(16);
    return {
      id: userId,
      salt: b64(saltBytes),
      hash: await hashPassword(password, saltBytes),
      createdAt: Date.now(),
      mode: hasSubtleCrypto() ? "aes" : "fallback"
    };
  }
  async function verifyPassword(rec, password) {
    const salt = unb64(rec.salt);
    if (rec.mode === "aes" || rec.mode !== "fallback" && hasSubtleCrypto()) {
      const hash = await hashPassword(password, salt);
      if (hash === rec.hash) return true;
    }
    const legacy = b64(fallbackKey(password, rec.salt, 2e3));
    return legacy === rec.hash;
  }
  class AccountAuth {
    async ensureAccount(userId, password) {
      const existing = readAccounts()[userId];
      if (existing) return existing;
      const rec = await newRecord(userId, password);
      return withAccounts((acc) => {
        if (acc[userId]) return acc[userId];
        acc[userId] = rec;
        writeAccounts(acc);
        return rec;
      });
    }
    async register(userId, password) {
      const id = String(userId || "").trim();
      if (!id || !password) return { ok: false, error: "Preencha login e senha." };
      const taken = { ok: false, error: "Este login já está em uso." };
      if (readAccounts()[id]) return taken;
      const rec = await newRecord(id, password);
      return withAccounts((acc) => {
        if (acc[id]) return taken;
        acc[id] = rec;
        writeAccounts(acc);
        return { ok: true, account: rec };
      });
    }
    async bootstrap() {
      const existing = readAccounts().admin;
      if (existing?.salt && existing?.hash) return existing;
      return this.ensureAccount("admin", "admin");
    }
    async login(userId, password) {
      try {
        await this.bootstrap();
        const rec = readAccounts()[userId];
        if (!rec) return { ok: false, error: "Conta não encontrada." };
        const ok = await verifyPassword(rec, password);
        if (!ok) return { ok: false, error: "Login ou senha inválidos." };
        const useAes = hasSubtleCrypto();
        let keyB64;
        let upgrade = null;
        if (useAes) {
          keyB64 = b64(await deriveBits(password, unb64(rec.salt), PBKDF2_ITERATIONS));
          if (rec.mode !== "aes" || rec.hash === b64(fallbackKey(password, rec.salt, 2e3))) {
            upgrade = { hash: await hashPassword(password, unb64(rec.salt)), mode: "aes" };
          }
        } else {
          keyB64 = b64(fallbackKey(password, rec.salt, FALLBACK_ITERATIONS));
          if (rec.mode !== "fallback") upgrade = { hash: rec.hash, mode: "fallback" };
        }
        if (upgrade) {
          const next = upgrade;
          await withAccounts((acc) => {
            if (acc[userId]?.salt !== rec.salt) return;
            acc[userId] = { ...acc[userId], ...next };
            writeAccounts(acc);
          });
        }
        const session = {
          user: userId,
          at: Date.now(),
          key: keyB64,
          salt: rec.salt,
          mode: useAes ? "aes" : "fallback"
        };
        this.writeSession(session);
        return { ok: true, session };
      } catch {
        return { ok: false, error: "Falha ao entrar." };
      }
    }
    writeSession(session) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {
      }
    }
    getSession() {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data?.user || !data?.key) return null;
        return data;
      } catch {
        return null;
      }
    }
    requireSession() {
      return this.getSession();
    }
    logout() {
      try {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem("uaidzin_active_char");
      } catch {
      }
    }
    rememberUserId(userId) {
      try {
        if (!userId) {
          localStorage.removeItem(REMEMBER_KEY);
          return;
        }
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user: userId }));
      } catch {
      }
    }
    readRememberedUserId() {
      try {
        const raw = localStorage.getItem(REMEMBER_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data.pass != null) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user: data.user || "" }));
        }
        return data.user || null;
      } catch {
        return null;
      }
    }
    deleteAccountRecord(userId) {
      return withAccounts((acc) => {
        delete acc[userId];
        writeAccounts(acc);
      });
    }
    listAccountIds() {
      return Object.keys(readAccounts());
    }
  }
  const legacyToStable = /* @__PURE__ */ new Map();
  function registerLegacyTree(prefix, skills) {
    skills.forEach((skill, index) => {
      legacyToStable.set(`${prefix}_${index + 1}`, skill.id);
    });
  }
  function remapSkillId(id) {
    return legacyToStable.get(id) ?? id;
  }
  const SKILL_BALANCE = {
    tierMp: [6, 8, 8, 10, 10, 12, 12, 18],
    tierCd: [2.4, 3.2, 4, 4.6, 5.2, 6, 7, 12],
    tierMult: [1.15, 1.3, 1.45, 1.6, 1.8, 2, 2.2, 2.8],
    rangeMelee: 2.8,
    rangeRanged: 8,
    aoeRadius: 3.4
  };
  function defineSkill(input) {
    const i = Math.min(7, Math.max(0, input.index));
    const kind = input.kind;
    const shape = input.shape ?? (kind === "damage" ? "single" : "self");
    const auto = input.auto ?? (kind === "heal" ? "heal" : kind === "summon" ? "summon" : kind === "buff" || kind === "transform" ? "buff" : "damage");
    const magical = input.element != null && input.element !== "physical";
    const ranged = shape === "single" && magical;
    return {
      id: input.id,
      name: input.name,
      kind,
      shape,
      auto,
      element: input.element,
      power: input.power ?? (magical ? "magic" : "weapon"),
      damageMultiplier: input.damageMultiplier ?? (kind === "damage" ? SKILL_BALANCE.tierMult[i] : 0),
      range: input.range ?? (shape === "aoe" ? SKILL_BALANCE.aoeRadius : ranged ? SKILL_BALANCE.rangeRanged : SKILL_BALANCE.rangeMelee),
      cooldown: input.cooldown ?? (kind === "passive" ? 0 : SKILL_BALANCE.tierCd[i]),
      mp: input.mp ?? (kind === "passive" ? 0 : SKILL_BALANCE.tierMp[i]),
      radius: input.radius,
      maxTargets: input.maxTargets,
      hits: input.hits,
      pierce: input.pierce,
      lifesteal: input.lifesteal,
      healRatio: input.healRatio,
      cleanse: input.cleanse,
      executeBelow: input.executeBelow,
      executeBonus: input.executeBonus,
      buff: input.buff,
      extraBuff: input.extraBuff,
      enemy: input.enemy,
      passive: input.passive,
      summon: input.summon,
      pack: input.pack,
      transform: input.transform,
      weaponAny: input.weaponAny,
      desc: input.desc
    };
  }
  const condor = { id: "condor", role: "ranged", attackMul: 0.48, hpMul: 0.75, range: 7, interval: 1.15 };
  const lobo = { id: "lobo", role: "melee", attackMul: 0.58, hpMul: 0.95, range: 1.8, interval: 0.9 };
  const urso = { id: "urso", role: "tank", attackMul: 0.42, hpMul: 1.8, range: 1.8, interval: 1.25 };
  const tigre = { id: "tigre", role: "melee", attackMul: 0.78, hpMul: 0.85, range: 1.8, interval: 0.7 };
  const dragao = { id: "dragao", role: "elite", attackMul: 0.72, hpMul: 1.55, range: 4.6, interval: 1.35, splash: 2.2 };
  const BM_FISICA = [
    defineSkill({
      id: "bm_fis_lobo_guerreiro",
      name: "Lobisomem",
      desc: "Assume a forma de lobo por 18 s: ataque +18 %, defesa −8 % e velocidade de ataque +28 %.",
      index: 0,
      kind: "transform",
      transform: { id: "lobo", sec: 18, attack: 1.18, defense: 0.92, hp: 1, scale: 1.08, attackSpeed: 0.28 }
    }),
    defineSkill({
      id: "bm_fis_couro_fera",
      name: "Couro de Fera",
      desc: "Reforça a pele por 14 s: defesa +22 % e vida máxima +18 %.",
      index: 1,
      kind: "buff",
      buff: { id: "bm_hide_def", sec: 14, stat: "defense", magnitude: 0.22 },
      extraBuff: { id: "bm_hide_hp", sec: 14, stat: "maxHp", magnitude: 0.18 }
    }),
    defineSkill({
      id: "bm_fis_furia_selvagem",
      name: "Fúria Selvagem",
      desc: "Desperta a fúria por 12 s: ataque +22 % e velocidade de ataque +24 %.",
      index: 2,
      kind: "buff",
      buff: { id: "bm_wild_atk", sec: 12, stat: "attack", magnitude: 0.22 },
      extraBuff: { id: "bm_wild_spd", sec: 12, stat: "attackSpeed", magnitude: 0.24 }
    }),
    defineSkill({
      id: "bm_fis_investida",
      name: "Investida Bestial",
      desc: "Atinge um inimigo a até 4,5 m com dano físico e o empurra 1,8 m para longe do personagem.",
      index: 3,
      kind: "damage",
      shape: "single",
      element: "physical",
      range: 4.5,
      enemy: { knock: 1.8 }
    }),
    defineSkill({
      id: "bm_fis_garra_brutal",
      name: "Garra Brutal",
      desc: "Rasga um inimigo a até 2,6 m com dano físico de 1,7 vezes o ataque da arma.",
      index: 4,
      kind: "damage",
      shape: "single",
      element: "physical",
      range: 2.6,
      damageMultiplier: 1.7
    }),
    defineSkill({
      id: "bm_fis_ursao",
      name: "Forma de Urso",
      desc: "Assume a forma de urso por 18 s: ataque +12 %, defesa +42 % e vida máxima +35 %.",
      index: 5,
      kind: "transform",
      transform: { id: "urso", sec: 18, attack: 1.12, defense: 1.42, hp: 1.35, scale: 1.24 }
    }),
    defineSkill({
      id: "bm_fis_presas_aco",
      name: "Presas de Aço",
      desc: "Passiva. Enquanto transformado, chance de crítico +18 % em ataques básicos e skills. Não entra na barra.",
      index: 6,
      kind: "passive",
      passive: { id: "transformedCrit", magnitude: 0.18 }
    }),
    defineSkill({
      id: "bm_fis_tita",
      name: "Titã",
      desc: "Assume a forma de titã por 14 s: ataque +42 %, defesa +35 %, vida máxima +40 % e velocidade de ataque +12 %. Só uma 8ª árvore por personagem.",
      index: 7,
      kind: "transform",
      transform: { id: "tita", sec: 14, attack: 1.42, defense: 1.35, hp: 1.4, scale: 1.42, attackSpeed: 0.12 }
    })
  ];
  const BM_MAGIA = [
    defineSkill({
      id: "bm_mag_dardo_igneo",
      name: "Dardo Ígneo",
      desc: "Lança fogo contra um inimigo a até 8 m, causando dano mágico de fogo.",
      index: 0,
      kind: "damage",
      shape: "single",
      element: "fire",
      range: 8
    }),
    defineSkill({
      id: "bm_mag_fenda_glacial",
      name: "Fenda Glacial",
      desc: "Atinge um inimigo a até 8 m com dano mágico de gelo e reduz sua velocidade de movimento em 50 % por 3,2 s.",
      index: 1,
      kind: "damage",
      shape: "single",
      element: "ice",
      range: 8,
      enemy: { slow: 0.5, slowSec: 3.2 }
    }),
    defineSkill({
      id: "bm_mag_escarpa",
      name: "Escarpa Sísmica",
      desc: "Abala todos os inimigos num raio de 3,5 m ao redor do personagem com dano mágico de terra.",
      index: 2,
      kind: "damage",
      shape: "aoe",
      element: "earth",
      radius: 3.5,
      range: 3.5
    }),
    defineSkill({
      id: "bm_mag_voz_trovao",
      name: "Voz do Trovão",
      desc: "Atinge um inimigo a até 8 m com dano mágico de raio. Tem 35 % de chance de atordoar por 1,2 s.",
      index: 3,
      kind: "damage",
      shape: "single",
      element: "lightning",
      range: 8,
      damageMultiplier: 1.7,
      enemy: { stunSec: 1.2, stunChance: 0.35 }
    }),
    defineSkill({
      id: "bm_mag_manto",
      name: "Manto Elemental",
      desc: "Fortalece o poder elemental por 12 s: poder mágico +22 % e resistência mágica +20 %.",
      index: 4,
      kind: "buff",
      buff: { id: "bm_mantle_power", sec: 12, stat: "magicPower", magnitude: 0.22 },
      extraBuff: { id: "bm_mantle_res", sec: 12, stat: "magicResist", magnitude: 0.2 }
    }),
    defineSkill({
      id: "bm_mag_corrente_agua",
      name: "Corrente de Água",
      desc: "Atinge todos os inimigos num raio de 3,8 m com dano mágico de água e reduz sua velocidade de movimento em 45 % por 3 s.",
      index: 5,
      kind: "damage",
      shape: "aoe",
      element: "water",
      radius: 3.8,
      range: 3.8,
      enemy: { slow: 0.55, slowSec: 3 }
    }),
    defineSkill({
      id: "bm_mag_muralha",
      name: "Muralha de Rocha",
      desc: "Ergue uma proteção por 12 s: defesa +28 % e reflexão de 22 % do dano recebido.",
      index: 6,
      kind: "buff",
      buff: { id: "bm_rock_def", sec: 12, stat: "defense", magnitude: 0.28 },
      extraBuff: { id: "bm_rock_reflect", sec: 12, stat: "reflect", magnitude: 0.22 }
    }),
    defineSkill({
      id: "bm_mag_furia_quatro",
      name: "Transformação Eden",
      desc: "Assume a forma celestial de Eden por 16 s: ataque +35 %, defesa +25 %, vida máxima +30 % e velocidade de ataque +25 %. Só uma 8ª árvore por personagem.",
      index: 7,
      kind: "transform",
      transform: { id: "eden", sec: 16, attack: 1.35, defense: 1.25, hp: 1.3, scale: 1.15, attackSpeed: 0.25 }
    })
  ];
  const BM_CONTROLE = [
    defineSkill({
      id: "bm_ctrl_condor",
      name: "Invocar Condor",
      desc: "Invoca um condor que acompanha o personagem e ataca à distância, com alcance de 7 m e intervalo de 1,15 s.",
      index: 0,
      kind: "summon",
      summon: condor
    }),
    defineSkill({
      id: "bm_ctrl_lobo",
      name: "Invocar Lobo",
      desc: "Invoca um lobo que acompanha o personagem, persegue inimigos e ataca a até 1,8 m a cada 0,9 s.",
      index: 1,
      kind: "summon",
      summon: lobo
    }),
    defineSkill({
      id: "bm_ctrl_chamado_boss",
      name: "Chamado do Boss",
      desc: "Fortalece as invocações por 14 s: ataque +35 % e vida máxima +17,5 %.",
      index: 2,
      kind: "buff",
      buff: { id: "bm_boss_call", sec: 14, stat: "summonPower", magnitude: 0.35 }
    }),
    defineSkill({
      id: "bm_ctrl_urso",
      name: "Invocar Urso",
      desc: "Invoca um urso resistente que acompanha o personagem, persegue inimigos e ataca a até 1,8 m a cada 1,25 s.",
      index: 3,
      kind: "summon",
      summon: urso
    }),
    defineSkill({
      id: "bm_ctrl_tigre",
      name: "Invocar Tigre",
      desc: "Invoca um tigre que acompanha o personagem, persegue inimigos e ataca a até 1,8 m a cada 0,7 s.",
      index: 4,
      kind: "summon",
      summon: tigre
    }),
    defineSkill({
      id: "bm_ctrl_dragao",
      name: "Invocar Dragão",
      desc: "Invoca um dragão que ataca a até 4,6 m a cada 1,35 s. O golpe também causa dano em inimigos num raio de 2,2 m do alvo.",
      index: 5,
      kind: "summon",
      summon: dragao
    }),
    defineSkill({
      id: "bm_ctrl_vinculo",
      name: "Vínculo Vital",
      desc: "Passiva. O personagem recebe 50 % do dano dirigido às suas invocações. Não entra na barra.",
      index: 6,
      kind: "passive",
      passive: { id: "summonLink", magnitude: 0.5 }
    }),
    defineSkill({
      id: "bm_ctrl_exercito",
      name: "Exército Primordial",
      desc: "Invoca condor, lobo e tigre juntos. Uma criatura viva de cada tipo; repetir a invocação restaura sua vida. Só uma 8ª árvore por personagem.",
      index: 7,
      kind: "summon",
      pack: [condor, lobo, tigre]
    })
  ];
  registerLegacyTree("bm_fis", BM_FISICA);
  registerLegacyTree("bm_ctrl", BM_CONTROLE);
  registerLegacyTree("bm_mag", BM_MAGIA);
  const R$2 = 8;
  const FM_FISICA = [
    defineSkill({
      id: "fm_fis_impacto_longinquo",
      name: "Impacto Longínquo",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,45× o ataque da arma. Dano físico.",
      index: 0,
      kind: "damage",
      shape: "single",
      element: "physical",
      power: "weapon",
      range: R$2,
      damageMultiplier: 1.45
    }),
    defineSkill({
      id: "fm_fis_olho_falcao",
      name: "Olho de Falcão",
      desc: "Por 12 s, esquiva +14% e velocidade de movimento +22%.",
      index: 1,
      kind: "buff",
      buff: { id: "fm_hawk_evasion", sec: 12, stat: "evasion", magnitude: 0.14 },
      extraBuff: { id: "fm_hawk_move", sec: 12, stat: "moveSpeed", magnitude: 0.22 }
    }),
    defineSkill({
      id: "fm_fis_furia_combate",
      name: "Fúria de Combate",
      desc: "Por 12 s, ataque +26%. Afeta golpes e skills.",
      index: 2,
      kind: "buff",
      buff: { id: "fm_battle_fury", sec: 12, stat: "attack", magnitude: 0.26 }
    }),
    defineSkill({
      id: "fm_fis_guarda_solida",
      name: "Guarda Sólida",
      desc: "Por 12 s, defesa +30%.",
      index: 3,
      kind: "buff",
      buff: { id: "fm_solid_guard", sec: 12, stat: "defense", magnitude: 0.3 }
    }),
    defineSkill({
      id: "fm_fis_conversao_vital",
      name: "Conversão Vital",
      desc: "Por 14 s, cada skill recupera HP equivalente a 55% da mana gasta.",
      index: 4,
      kind: "buff",
      buff: { id: "fm_vital_convert", sec: 14, stat: "mpToHp", magnitude: 0.55 }
    }),
    defineSkill({
      id: "fm_fis_mestre_arco",
      name: "Mestre do Arco",
      desc: "Passiva. Com arco equipado, ataque +28%. Não entra na barra.",
      index: 5,
      kind: "passive",
      passive: { id: "bow", magnitude: 0.28 },
      weaponAny: ["bow"]
    }),
    defineSkill({
      id: "fm_fis_ponto_critico",
      name: "Ponto Crítico",
      desc: "Por 12 s, chance de crítico +16% em golpes e skills.",
      index: 6,
      kind: "buff",
      buff: { id: "fm_crit", sec: 12, stat: "crit", magnitude: 0.16 }
    }),
    defineSkill({
      id: "fm_fis_negacao_vida",
      name: "Negação de Vida",
      desc: "Atinge inimigos num raio de 4,2 m com 1,8× o ataque da arma e bloqueia a cura deles por 6 s. Só uma 8ª skill por personagem.",
      index: 7,
      kind: "damage",
      shape: "aoe",
      element: "shadow",
      power: "weapon",
      radius: 4.2,
      range: 4.2,
      damageMultiplier: 1.8,
      enemy: { antiHealSec: 6 }
    })
  ];
  const FM_CONTROLE = [
    defineSkill({
      id: "fm_ctrl_cura",
      name: "Cura",
      desc: "Recupera 22% do HP máximo. A cura aumenta com poder de cura e especialização White Mage.",
      index: 0,
      kind: "heal",
      healRatio: 0.22
    }),
    defineSkill({
      id: "fm_ctrl_julgamento",
      name: "Julgamento Sagrado",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,3× o ataque mágico. Dano sagrado.",
      index: 1,
      kind: "damage",
      shape: "single",
      element: "holy",
      range: R$2
    }),
    defineSkill({
      id: "fm_ctrl_bencao",
      name: "Bênção",
      desc: "Por 14 s, defesa +20% e resistência mágica +15%.",
      index: 2,
      kind: "buff",
      buff: { id: "fm_bless", sec: 14, stat: "defense", magnitude: 0.2 },
      extraBuff: { id: "fm_bless_res", sec: 14, stat: "magicResist", magnitude: 0.15 }
    }),
    defineSkill({
      id: "fm_ctrl_purificacao",
      name: "Purificação",
      desc: "Recupera 16% do HP máximo e remove efeitos negativos. A cura aumenta com poder de cura e especialização White Mage.",
      index: 3,
      kind: "heal",
      healRatio: 0.16,
      cleanse: true
    }),
    defineSkill({
      id: "fm_ctrl_lanca_luz",
      name: "Lança de Luz",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,9× o ataque mágico. Dano sagrado.",
      index: 4,
      kind: "damage",
      shape: "single",
      element: "holy",
      range: R$2,
      damageMultiplier: 1.9
    }),
    defineSkill({
      id: "fm_ctrl_vontade_divina",
      name: "Vontade Divina",
      desc: "Por 12 s, poder mágico +24% e poder de cura +25%.",
      index: 5,
      kind: "buff",
      buff: { id: "fm_divine_will", sec: 12, stat: "magicPower", magnitude: 0.24 },
      extraBuff: { id: "fm_divine_heal", sec: 12, stat: "healPower", magnitude: 0.25 }
    }),
    defineSkill({
      id: "fm_ctrl_castigo",
      name: "Castigo Celestial",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,7× o ataque mágico. Dano sagrado +65% se o alvo tiver até 40% de HP.",
      index: 6,
      kind: "damage",
      shape: "single",
      element: "holy",
      range: R$2,
      damageMultiplier: 1.7,
      executeBelow: 0.4,
      executeBonus: 0.65
    }),
    defineSkill({
      id: "fm_ctrl_graca_ceu",
      name: "Graça do Céu",
      desc: "Atinge inimigos num raio de 4,2 m com 1,6× o ataque mágico sagrado e recupera 20% do HP máximo. Só uma 8ª skill por personagem.",
      index: 7,
      kind: "damage",
      shape: "aoe",
      element: "holy",
      radius: 4.2,
      range: 4.2,
      damageMultiplier: 1.6,
      healRatio: 0.2
    })
  ];
  const FM_MAGIA = [
    defineSkill({
      id: "fm_mag_esfera_ignea",
      name: "Esfera Ígnea",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,15× o ataque mágico. Dano de fogo.",
      index: 0,
      kind: "damage",
      shape: "single",
      element: "fire",
      range: R$2
    }),
    defineSkill({
      id: "fm_mag_lanca_glacial",
      name: "Lança Glacial",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,3× o ataque mágico de gelo e reduz o movimento dele em 50% por 3,2 s.",
      index: 1,
      kind: "damage",
      shape: "single",
      element: "ice",
      range: R$2,
      enemy: { slow: 0.5, slowSec: 3.2 }
    }),
    defineSkill({
      id: "fm_mag_choque_vital",
      name: "Choque Vital",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,55× o ataque mágico. Dano de raio.",
      index: 2,
      kind: "damage",
      shape: "single",
      element: "lightning",
      range: R$2,
      damageMultiplier: 1.55
    }),
    defineSkill({
      id: "fm_mag_picada",
      name: "Picada Peçonhenta",
      desc: "Atinge o inimigo mais próximo a até 8 m com 1,6× o ataque mágico de veneno. Por 5 s, causa por segundo mais 40% do dano inicial.",
      index: 3,
      kind: "damage",
      shape: "single",
      element: "poison",
      range: R$2,
      enemy: { dotRatio: 0.4, dotSec: 5 }
    }),
    defineSkill({
      id: "fm_mag_tempestade_brasa",
      name: "Tempestade de Brasa",
      desc: "Atinge todos os inimigos num raio de 3,6 m com 1,8× o ataque mágico. Dano de fogo.",
      index: 4,
      kind: "damage",
      shape: "aoe",
      element: "fire",
      radius: 3.6,
      range: 3.6
    }),
    defineSkill({
      id: "fm_mag_sombra_corrosiva",
      name: "Sombra Corrosiva",
      desc: "Atinge o inimigo mais próximo a até 8 m com 2× o ataque mágico de sombra, ignorando 30% da defesa.",
      index: 5,
      kind: "damage",
      shape: "single",
      element: "shadow",
      range: R$2,
      pierce: 0.3
    }),
    defineSkill({
      id: "fm_mag_nevasca",
      name: "Nevasca",
      desc: "Atinge inimigos num raio de 3,8 m com 2,2× o ataque mágico de gelo e reduz o movimento deles em 55% por 3,5 s.",
      index: 6,
      kind: "damage",
      shape: "aoe",
      element: "ice",
      radius: 3.8,
      range: 3.8,
      enemy: { slow: 0.45, slowSec: 3.5 }
    }),
    defineSkill({
      id: "fm_mag_colapso",
      name: "Colapso Elemental",
      desc: "Atinge todos os inimigos num raio de 4,4 m com 2,7× o ataque mágico. Dano elemental misto. Só uma 8ª skill por personagem.",
      index: 7,
      kind: "damage",
      shape: "aoe",
      element: "mixed",
      radius: 4.4,
      range: 4.4,
      damageMultiplier: 2.7
    })
  ];
  registerLegacyTree("fm_fis", FM_FISICA);
  registerLegacyTree("fm_ctrl", FM_CONTROLE);
  registerLegacyTree("fm_mag", FM_MAGIA);
  const R$1 = 8;
  const HT_FISICA = [
    defineSkill({
      id: "ht_fis_tiro_certeiro",
      name: "Tiro Certeiro",
      desc: "Tiro físico da arma contra um inimigo a até 8 m. Causa 120 % do ataque.",
      index: 0,
      kind: "damage",
      shape: "single",
      element: "physical",
      power: "weapon",
      range: R$1,
      damageMultiplier: 1.2
    }),
    defineSkill({
      id: "ht_fis_pes_ligeiros",
      name: "Pés Ligeiros",
      desc: "Velocidade de movimento +28 % por 12 s.",
      index: 1,
      kind: "buff",
      buff: { id: "ht_fleet", sec: 12, stat: "moveSpeed", magnitude: 0.28 }
    }),
    defineSkill({
      id: "ht_fis_mira_aguia",
      name: "Mira de Águia",
      desc: "Ataque +24 % por 12 s.",
      index: 2,
      kind: "buff",
      buff: { id: "ht_eagle", sec: 12, stat: "attack", magnitude: 0.24 }
    }),
    defineSkill({
      id: "ht_fis_tiro_congelante",
      name: "Tiro Congelante",
      desc: "Tiro de gelo com dano da arma contra um inimigo a até 8 m. Causa 160 % do ataque e reduz o movimento do alvo em 50 % por 3,2 s.",
      index: 3,
      kind: "damage",
      shape: "single",
      element: "ice",
      power: "weapon",
      range: R$1,
      enemy: { slow: 0.5, slowSec: 3.2 }
    }),
    defineSkill({
      id: "ht_fis_sentinela",
      name: "Sentinela",
      desc: "Chance de esquiva +20 % por 10 s.",
      index: 4,
      kind: "buff",
      buff: { id: "ht_sentinel", sec: 10, stat: "evasion", magnitude: 0.2 }
    }),
    defineSkill({
      id: "ht_fis_flecha_rasante",
      name: "Flecha Rasante",
      desc: "Flecha física contra um inimigo a até 8 m. Causa 165 % do ataque e ignora 40 % da defesa.",
      index: 5,
      kind: "damage",
      shape: "single",
      element: "physical",
      power: "weapon",
      range: R$1,
      pierce: 0.4,
      damageMultiplier: 1.65
    }),
    defineSkill({
      id: "ht_fis_instinto",
      name: "Instinto de Caça",
      desc: "Passiva. Dano de skills +28 % contra um alvo sem outro inimigo vivo a até 3,5 m dele ou com até 40 % de vida. Não entra na barra.",
      index: 6,
      kind: "passive",
      passive: { id: "isolated", magnitude: 0.28 }
    }),
    defineSkill({
      id: "ht_fis_rapid_hit",
      name: "Rapid Hit",
      desc: "Sete tiros físicos contra um inimigo a até 8 m. Cada acerto causa 55 % do ataque. Só uma 8ª skill por personagem.",
      index: 7,
      kind: "damage",
      shape: "single",
      element: "physical",
      power: "weapon",
      range: R$1,
      hits: 7,
      damageMultiplier: 0.55
    })
  ];
  const HT_CONTROLE = [
    defineSkill({
      id: "ht_ctrl_garra",
      name: "Garra Cortante",
      desc: "Golpe físico da arma contra um inimigo a até 2,5 m. Causa 125 % do ataque.",
      index: 0,
      kind: "damage",
      shape: "single",
      element: "physical",
      range: 2.5,
      damageMultiplier: 1.25
    }),
    defineSkill({
      id: "ht_ctrl_mais_um_golpe",
      name: "Mais Um Golpe",
      desc: "Velocidade de ataque +30 % por 10 s.",
      index: 1,
      kind: "buff",
      buff: { id: "ht_extra_swing", sec: 10, stat: "attackSpeed", magnitude: 0.3 }
    }),
    defineSkill({
      id: "ht_ctrl_presa_ferida",
      name: "Presa Ferida",
      desc: "Golpe físico contra um inimigo a até 2,6 m. Causa 145 % do ataque e sangramento por 5 s, com dano por segundo igual a 40 % do dano do golpe.",
      index: 2,
      kind: "damage",
      shape: "single",
      element: "physical",
      range: 2.6,
      enemy: { dotRatio: 0.4, dotSec: 5 }
    }),
    defineSkill({
      id: "ht_ctrl_dodge",
      name: "Dodge",
      desc: "Passiva. Chance de esquiva +10 %. Não entra na barra.",
      index: 3,
      kind: "passive",
      passive: { id: "evasion", magnitude: 0.1 }
    }),
    defineSkill({
      id: "ht_ctrl_rugido",
      name: "Rugido Selvagem",
      desc: "Ataque +20 % e velocidade de ataque +18 % por 12 s.",
      index: 4,
      kind: "buff",
      buff: { id: "ht_roar_atk", sec: 12, stat: "attack", magnitude: 0.2 },
      extraBuff: { id: "ht_roar_spd", sec: 12, stat: "attackSpeed", magnitude: 0.18 }
    }),
    defineSkill({
      id: "ht_ctrl_roubo_vital",
      name: "Roubo Vital",
      desc: "Golpe físico contra um inimigo a até 2,6 m. Causa 200 % do ataque e recupera vida igual a 45 % do dano causado.",
      index: 5,
      kind: "damage",
      shape: "single",
      element: "physical",
      range: 2.6,
      lifesteal: 0.45
    }),
    defineSkill({
      id: "ht_ctrl_duas_maos",
      name: "Poder das Duas Mãos",
      desc: "Passiva. Ataque +24 % com espada de duas mãos ou bastão de duas mãos. Não entra na barra.",
      index: 6,
      kind: "passive",
      passive: { id: "twoHand", magnitude: 0.24 },
      weaponAny: ["greatsword", "greatstaff"]
    }),
    defineSkill({
      id: "ht_ctrl_invisibilidade",
      name: "Invisibilidade",
      desc: "Oculta sua presença dos inimigos por 5 s. O próximo golpe que acerta encerra o efeito e causa 70 % de dano adicional. Só uma 8ª skill por personagem.",
      index: 7,
      kind: "buff",
      buff: { id: "ht_stealth", sec: 5, stat: "stealth", magnitude: 1, nextHitMul: 1.7 }
    })
  ];
  const HT_MAGIA = [
    defineSkill({
      id: "ht_mag_flecha_arcana",
      name: "Flecha Arcana",
      desc: "Flecha mágica contra um inimigo a até 8 m. Causa 115 % do ataque mágico.",
      index: 0,
      kind: "damage",
      shape: "single",
      power: "magic",
      range: R$1
    }),
    defineSkill({
      id: "ht_mag_flecha_ignea",
      name: "Flecha Ígnea",
      desc: "Flecha de fogo contra um inimigo a até 8 m. Causa 130 % do ataque mágico e sofre a resistência a fogo do alvo.",
      index: 1,
      kind: "damage",
      shape: "single",
      element: "fire",
      range: R$1
    }),
    defineSkill({
      id: "ht_mag_flecha_glacial",
      name: "Flecha Glacial",
      desc: "Flecha de gelo contra um inimigo a até 8 m. Causa 145 % do ataque mágico e reduz o movimento do alvo em 50 % por 3 s.",
      index: 2,
      kind: "damage",
      shape: "single",
      element: "ice",
      range: R$1,
      enemy: { slow: 0.5, slowSec: 3 }
    }),
    defineSkill({
      id: "ht_mag_flecha_trovao",
      name: "Flecha de Trovão",
      desc: "Flecha elétrica contra um inimigo a até 8 m. Causa 160 % do ataque mágico e tem 30 % de chance de atordoar por 1 s.",
      index: 3,
      kind: "damage",
      shape: "single",
      element: "lightning",
      range: R$1,
      enemy: { stunSec: 1, stunChance: 0.3 }
    }),
    defineSkill({
      id: "ht_mag_chuva_mistica",
      name: "Chuva Mística",
      desc: "Chuva mágica ao redor do personagem. Causa 180 % do ataque mágico a todos os inimigos num raio de 3,8 m.",
      index: 4,
      kind: "damage",
      shape: "aoe",
      power: "magic",
      radius: 3.8,
      range: 3.8
    }),
    defineSkill({
      id: "ht_mag_flecha_espectral",
      name: "Flecha Espectral",
      desc: "Flecha de sombra contra um inimigo a até 8 m. Causa 185 % do ataque mágico e ignora 35 % da defesa.",
      index: 5,
      kind: "damage",
      shape: "single",
      element: "shadow",
      range: R$1,
      pierce: 0.35,
      damageMultiplier: 1.85
    }),
    defineSkill({
      id: "ht_mag_vagalume",
      name: "Vagalume de Fogo",
      desc: "Explosão de fogo ao redor do personagem. Causa 220 % do ataque mágico a todos os inimigos num raio de 3,6 m.",
      index: 6,
      kind: "damage",
      shape: "aoe",
      element: "fire",
      radius: 3.6,
      range: 3.6
    }),
    defineSkill({
      id: "ht_mag_tempestade",
      name: "Tempestade do Caçador",
      desc: "Tempestade elemental ao redor do personagem. Causa 260 % do ataque mágico a todos os inimigos num raio de 4,6 m. Só uma 8ª skill por personagem.",
      index: 7,
      kind: "damage",
      shape: "aoe",
      element: "mixed",
      radius: 4.6,
      range: 4.6,
      damageMultiplier: 2.6
    })
  ];
  registerLegacyTree("ht_fis", HT_FISICA);
  registerLegacyTree("ht_ctrl", HT_CONTROLE);
  registerLegacyTree("ht_mag", HT_MAGIA);
  const R = 8;
  const TK_FISICA = [
    defineSkill({
      id: "tk_fis_force_wave",
      name: "Force Wave",
      desc: "Onda branca de força que percorre até 3 m do personagem e atinge um inimigo. Dano físico da arma.",
      index: 0,
      kind: "damage",
      shape: "single",
      element: "physical",
      range: 3,
      cooldown: 2,
      damageMultiplier: 1.25
    }),
    defineSkill({
      id: "tk_fis_atk_descuidado",
      name: "Atk Descuidado",
      desc: "Abre a guarda por 40 s: ataque +28 % e defesa −18 %. Recarga 10 s.",
      index: 1,
      kind: "buff",
      cooldown: 10,
      buff: { id: "tk_reckless_atk", sec: 40, stat: "attack", magnitude: 0.28 },
      extraBuff: { id: "tk_reckless_def", sec: 40, stat: "defense", magnitude: -0.18 }
    }),
    defineSkill({
      id: "tk_fis_mestre_dual",
      name: "Mestre Dual",
      desc: "Passiva. Com duas armas (machados ou espadas duplos) o ataque sobe 22 %. Não entra na barra.",
      index: 2,
      kind: "passive",
      passive: { id: "dual", magnitude: 0.22 },
      weaponAny: ["dual-axe", "dual-sword"]
    }),
    defineSkill({
      id: "tk_fis_death_stab",
      name: "Death Stab",
      desc: "Estocada de vento azul contra um único inimigo a até 6 m, ignorando parte da defesa.",
      index: 3,
      kind: "damage",
      shape: "single",
      element: "physical",
      range: 6,
      cooldown: 2,
      pierce: 0.25,
      damageMultiplier: 1.55
    }),
    defineSkill({
      id: "tk_fis_fury",
      name: "Fury",
      desc: "Fúria de combate por 40 s: velocidade de ataque +32 %. Recarga 10 s.",
      index: 4,
      kind: "buff",
      cooldown: 10,
      buff: { id: "tk_fury", sec: 40, stat: "attackSpeed", magnitude: 0.32 }
    }),
    defineSkill({
      id: "tk_fis_increase_critical",
      name: "Increase Critical",
      desc: "Passiva. Chance de crítico +12 % em golpes e skills. Não entra na barra.",
      index: 5,
      kind: "passive",
      passive: { id: "crit", magnitude: 0.12 }
    }),
    defineSkill({
      id: "tk_fis_earthquake",
      name: "Earthquake",
      desc: "Terremoto: uma onda parte do personagem e causa dano de terra em todos os inimigos num raio de 6 m.",
      index: 6,
      kind: "damage",
      shape: "aoe",
      element: "earth",
      power: "weapon",
      radius: 6,
      range: 6,
      cooldown: 2,
      damageMultiplier: 1.7
    }),
    defineSkill({
      id: "tk_fis_fire_burst",
      name: "Fire Burst",
      desc: "Correntes de fogo giram até um único inimigo a até 4,4 m e explodem no impacto. Só uma 8ª skill por personagem: comprar esta bloqueia as 8ª de Defensivo e Mágico.",
      index: 7,
      kind: "damage",
      shape: "single",
      element: "fire",
      power: "weapon",
      range: 4.4,
      cooldown: 2,
      damageMultiplier: 2.6
    })
  ];
  const TK_CONTROLE = [
    defineSkill({
      id: "tk_ctrl_shield",
      name: "Shield",
      index: 0,
      kind: "buff",
      cooldown: 10,
      buff: { id: "tk_shield", sec: 40, stat: "defense", magnitude: 0.32 }
    }),
    defineSkill({
      id: "tk_ctrl_resistance",
      name: "Resistance",
      index: 1,
      kind: "buff",
      cooldown: 10,
      buff: { id: "tk_resistance", sec: 40, stat: "maxHp", magnitude: 0.25 },
      healRatio: 0.12
    }),
    defineSkill({
      id: "tk_ctrl_taunt",
      name: "Taunt",
      index: 2,
      kind: "damage",
      shape: "aoe",
      element: "physical",
      radius: 5,
      range: 5,
      cooldown: 2,
      damageMultiplier: 0.35,
      enemy: { tauntSec: 5 },
      auto: "damage"
    }),
    defineSkill({
      id: "tk_ctrl_imunity",
      name: "Imunity",
      index: 3,
      kind: "buff",
      cooldown: 10,
      buff: { id: "tk_imunity", sec: 40, stat: "magicResist", magnitude: 0.35 }
    }),
    defineSkill({
      id: "tk_ctrl_parry",
      name: "Parry",
      index: 4,
      kind: "buff",
      cooldown: 10,
      buff: { id: "tk_parry", sec: 40, stat: "evasion", magnitude: 0.18 }
    }),
    defineSkill({
      id: "tk_ctrl_sustain",
      name: "Sustain",
      index: 5,
      kind: "heal",
      healRatio: 0.1,
      cooldown: 2,
      auto: "heal"
    }),
    defineSkill({
      id: "tk_ctrl_fear",
      name: "Fear",
      index: 6,
      kind: "damage",
      shape: "aoe",
      element: "shadow",
      power: "weapon",
      radius: 3.8,
      range: 3.8,
      cooldown: 2,
      damageMultiplier: 0.7,
      enemy: { stunSec: 1.6 }
    }),
    defineSkill({
      id: "tk_ctrl_divine_armor",
      name: "Divine Armor",
      index: 7,
      kind: "passive",
      passive: { id: "damageReduction", magnitude: 0.12 }
    })
  ];
  const TK_MAGIA = [
    defineSkill({
      id: "tk_mag_lamina_energia",
      name: "Lâmina de Energia",
      index: 0,
      kind: "damage",
      shape: "single",
      element: "holy",
      range: R,
      cooldown: 2
    }),
    defineSkill({
      id: "tk_mag_campo_gelo",
      name: "Campo de Gelo",
      index: 1,
      kind: "damage",
      shape: "aoe",
      element: "ice",
      radius: 3.4,
      range: 3.4,
      cooldown: 2,
      enemy: { slow: 0.55, slowSec: 3.5 }
    }),
    defineSkill({
      id: "tk_mag_mana_burn",
      name: "Mana Burn",
      index: 2,
      kind: "buff",
      cooldown: 10,
      buff: { id: "tk_mana_burn", sec: 40, stat: "magicPower", magnitude: 0.28 },
      extraBuff: { id: "tk_mana_burn_cost", sec: 40, stat: "mpCost", magnitude: 0.4 }
    }),
    defineSkill({
      id: "tk_mag_moon_ray",
      name: "Moon Ray",
      index: 3,
      kind: "damage",
      shape: "single",
      element: "holy",
      range: R,
      cooldown: 2,
      damageMultiplier: 1.85
    }),
    defineSkill({
      id: "tk_mag_poison_stab",
      name: "Poison Stab",
      index: 4,
      kind: "damage",
      shape: "single",
      element: "poison",
      power: "magic",
      range: 3.2,
      cooldown: 2,
      enemy: { dotRatio: 0.35, dotSec: 4 }
    }),
    defineSkill({
      id: "tk_mag_fire_slash",
      name: "Fire Slash",
      index: 5,
      kind: "damage",
      shape: "aoe",
      element: "fire",
      radius: 3.5,
      range: 3.5,
      cooldown: 2
    }),
    defineSkill({
      id: "tk_mag_death_stab",
      name: "Death Stab",
      index: 6,
      kind: "damage",
      shape: "single",
      element: "holy",
      range: 3.4,
      cooldown: 2,
      pierce: 0.2,
      damageMultiplier: 2.15
    }),
    defineSkill({
      id: "tk_mag_circulo_morte",
      name: "Circulo da Morte",
      index: 7,
      kind: "damage",
      shape: "aoe",
      element: "holy",
      radius: 4.2,
      range: 4.2,
      cooldown: 2,
      damageMultiplier: 2.7
    })
  ];
  registerLegacyTree("tk_fis", TK_FISICA);
  registerLegacyTree("tk_ctrl", TK_CONTROLE);
  registerLegacyTree("tk_mag", TK_MAGIA);
  const BOOK_SKILLS = [
    defineSkill({
      id: "book_hp",
      name: "Vida",
      desc: "Passiva da linhagem Livros. Efeito em definição.",
      index: 0,
      kind: "passive",
      passive: { id: "bookStub", magnitude: 0 },
      damageMultiplier: 0,
      range: 0,
      cooldown: 0,
      mp: 0
    }),
    defineSkill({
      id: "book_gold",
      name: "Ouro",
      desc: "Passiva da linhagem Livros. Efeito em definição.",
      index: 1,
      kind: "passive",
      passive: { id: "bookStub", magnitude: 0 },
      damageMultiplier: 0,
      range: 0,
      cooldown: 0,
      mp: 0
    }),
    defineSkill({
      id: "book_xp",
      name: "Experiência",
      desc: "Passiva da linhagem Livros. Efeito em definição.",
      index: 2,
      kind: "passive",
      passive: { id: "bookStub", magnitude: 0 },
      damageMultiplier: 0,
      range: 0,
      cooldown: 0,
      mp: 0
    }),
    defineSkill({
      id: "book_cd",
      name: "Cooldown",
      desc: "Passiva da linhagem Livros. Efeito em definição.",
      index: 3,
      kind: "passive",
      passive: { id: "bookStub", magnitude: 0 },
      damageMultiplier: 0,
      range: 0,
      cooldown: 0,
      mp: 0
    })
  ];
  const CLASSES = {
    TK: {
      id: "TK",
      name: "Thegn Knight",
      primary: "FOR",
      treeOrder: ["fisica", "controle", "magia", "livro"],
      treeLabels: {
        fisica: "Físico ofensivo",
        controle: "Defensivo",
        magia: "Mágico",
        livro: "Livros"
      },
      trees: {
        controle: TK_CONTROLE,
        magia: TK_MAGIA,
        fisica: TK_FISICA,
        livro: BOOK_SKILLS
      }
    },
    FM: {
      id: "FM",
      name: "Frost Maiden",
      primary: "INT",
      treeOrder: ["fisica", "controle", "magia", "livro"],
      treeLabels: {
        fisica: "Física",
        controle: "White Mage",
        magia: "Maga negra",
        livro: "Livros"
      },
      trees: {
        controle: FM_CONTROLE,
        magia: FM_MAGIA,
        fisica: FM_FISICA,
        livro: BOOK_SKILLS
      }
    },
    BM: {
      id: "BM",
      name: "Beast Master",
      primary: "INT",
      treeOrder: ["fisica", "magia", "controle", "livro"],
      treeLabels: {
        fisica: "Nature",
        magia: "Element",
        controle: "Summon",
        livro: "Livros"
      },
      trees: {
        controle: BM_CONTROLE,
        magia: BM_MAGIA,
        fisica: BM_FISICA,
        livro: BOOK_SKILLS
      }
    },
    HT: {
      id: "HT",
      name: "Huntress",
      primary: "DES",
      treeOrder: ["fisica", "controle", "magia", "livro"],
      treeLabels: {
        fisica: "Survival",
        controle: "Capture",
        magia: "Arcane Archer",
        livro: "Livros"
      },
      trees: {
        controle: HT_CONTROLE,
        magia: HT_MAGIA,
        fisica: HT_FISICA,
        livro: BOOK_SKILLS
      }
    }
  };
  function asItem(raw) {
    if (!raw || typeof raw.uid !== "string" || typeof raw.defId !== "string") return null;
    return {
      uid: String(raw.uid),
      defId: String(raw.defId),
      name: String(raw.name || raw.defId),
      rarity: raw.rarity || "Comum",
      slot: raw.slot || "misc",
      refine: Number(raw.refine) || 0,
      life: Number(raw.life) || 0,
      lifeAccessoryBase: raw.lifeAccessoryBase && typeof raw.lifeAccessoryBase === "object" ? {
        hp: Number(raw.lifeAccessoryBase.hp) || 0,
        crit: Number(raw.lifeAccessoryBase.crit) || 0,
        damage: Number(raw.lifeAccessoryBase.damage) || 0,
        speed: Number(raw.lifeAccessoryBase.speed) || 0
      } : void 0,
      attackBonus: Number(raw.attackBonus) || 0,
      defenseBonus: Number(raw.defenseBonus) || 0,
      stack: Number(raw.stack) || 1,
      sellValue: Number(raw.sellValue) || 0,
      attackRange: Number(raw.attackRange) || void 0,
      attackInterval: Number(raw.attackInterval) || void 0,
      weaponSet: typeof raw.weaponSet === "string" ? raw.weaponSet : void 0,
      gearSet: raw.gearSet === 1 || raw.gearSet === 2 || raw.gearSet === 3 ? raw.gearSet : void 0,
      hpBonus: Number.isFinite(Number(raw.hpBonus)) ? Number(raw.hpBonus) : void 0,
      critBonus: Number.isFinite(Number(raw.critBonus)) ? Number(raw.critBonus) : void 0,
      speedBonus: Number.isFinite(Number(raw.speedBonus)) ? Number(raw.speedBonus) : void 0,
      secondaryAttack: Number.isFinite(Number(raw.secondaryAttack)) ? Number(raw.secondaryAttack) : void 0,
      secondaryDefense: Number.isFinite(Number(raw.secondaryDefense)) ? Number(raw.secondaryDefense) : void 0
    };
  }
  function asLoadoutSlots(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const row of raw) {
      const s = row;
      if (!s?.skillId) continue;
      out.push({
        skillId: String(s.skillId),
        tree: String(s.tree || "fisica"),
        auto: s.auto !== false,
        ...typeof s.index === "number" && Number.isFinite(s.index) ? { index: Math.floor(s.index) } : {}
      });
    }
    return out;
  }
  function asBuffs(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const row of raw) {
      const b = row;
      if (!b?.id) continue;
      out.push({
        id: String(b.id),
        remainingSec: Math.max(0, Number(b.remainingSec) || 0),
        stacks: Math.max(1, Math.floor(Number(b.stacks) || 1)),
        magnitude: b.magnitude,
        stat: b.stat,
        harmful: b.harmful,
        nextHitMul: b.nextHitMul
      });
    }
    return out;
  }
  function asBags(raw) {
    const unlocked = [true, false, false, false];
    const src = raw?.unlocked;
    if (Array.isArray(src)) {
      for (let i = 0; i < 4; i++) unlocked[i] = i === 0 ? true : !!src[i];
    }
    return { unlocked };
  }
  function normalizeBase(data, profileIdHint) {
    const classId = data.character?.classId || data.skills?.classId || "TK";
    const parsed = parseProfileId(data.meta?.profileId || profileIdHint);
    const seenUids = /* @__PURE__ */ new Set();
    const equipped = {};
    const src = data.equipment?.equipped || {};
    for (const key of Object.keys(src)) {
      const item = asItem(src[key]);
      if (item) {
        if (seenUids.has(item.uid)) {
          item.uid = nextItemUid();
        }
        seenUids.add(item.uid);
        equipped[key] = item;
      }
    }
    const items = [];
    for (const raw of data.inventory?.items || []) {
      const item = asItem(raw);
      if (item) {
        if (seenUids.has(item.uid)) {
          item.uid = nextItemUid();
        }
        seenUids.add(item.uid);
        items.push(item);
      }
    }
    const rawVault = data.vault;
    if (Array.isArray(rawVault?.items)) {
      for (const raw of rawVault.items) {
        const it = asItem(raw);
        if (it) {
          if (seenUids.has(it.uid)) {
            it.uid = nextItemUid();
          }
          seenUids.add(it.uid);
        }
      }
    }
    return {
      saveVersion: data.saveVersion || 2,
      meta: {
        profileId: data.meta?.profileId || profileIdHint,
        userId: data.meta?.userId || parsed?.userId || "unknown",
        slotIndex: data.meta?.slotIndex ?? parsed?.slotIndex ?? 0,
        updatedAt: Number.isFinite(data.meta?.updatedAt) ? Number(data.meta?.updatedAt) : Date.now()
      },
      character: {
        name: data.character?.name || "Herói",
        classId,
        level: Number(data.character?.level) || 1,
        evolution: data.character?.evolution || "Mortal",
        xp: Number(data.character?.xp) || 0,
        unspentAttributePoints: Number(data.character?.unspentAttributePoints) || 0,
        resetsInEvolution: Number(data.character?.resetsInEvolution) || 0,
        bonusAttributePoints: Number(data.character?.bonusAttributePoints) || 0,
        attributes: {
          FOR: Number(data.character?.attributes?.FOR) || emptyAttrs().FOR,
          DES: Number(data.character?.attributes?.DES) || emptyAttrs().DES,
          CONS: Number(data.character?.attributes?.CONS) || emptyAttrs().CONS,
          INT: Number(data.character?.attributes?.INT) || emptyAttrs().INT
        },
        hp: Number(data.character?.hp) || 100,
        mp: data.character?.mp
      },
      skills: {
        classId,
        learned: Array.isArray(data.skills?.learned) ? data.skills.learned.map(String) : Object.keys(data.skills?.levels || {}),
        eighthTree: data.skills?.eighthTree ?? null,
        specialization: normalizeTreeMap(data.skills?.specialization),
        skillPoints: Number(data.skills?.skillPoints) || 0,
        specPoints: Number(data.skills?.specPoints) || 0
      },
      skillLoadout: {
        slots: asLoadoutSlots(data.skillLoadout?.slots)
      },
      equipment: { equipped },
      inventory: {
        gold: Number(data.inventory?.gold) || 0,
        items
      },
      bags: asBags(data.bags),
      buffs: asBuffs(data.buffs),
      progress: {
        dungeonsUnlocked: Array.isArray(data.progress?.dungeonsUnlocked) ? data.progress.dungeonsUnlocked.map(String) : [],
        dungeonClears: { ...data.progress?.dungeonClears || {} },
        quests: { ...data.progress?.quests || {} }
      },
      options: { ...data.options || {} }
    };
  }
  function nonNegInt(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.floor(n));
  }
  function attrOrBase(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(fallback, Math.floor(n));
  }
  function classIdOrTk(value) {
    return typeof value === "string" && value in CLASSES ? value : "TK";
  }
  const EVOLUTIONS = /* @__PURE__ */ new Set(["Mortal", "Arch", "Cele"]);
  function normalizeSavePayload(raw, profileIdHint = "default") {
    const data = raw && typeof raw === "object" ? raw : {};
    const base = normalizeBase(data, profileIdHint);
    const classId = classIdOrTk(base.character.classId || base.skills.classId);
    const attrs = emptyAttrs();
    const payload = {
      ...base,
      saveVersion: SAVE_VERSION,
      character: {
        ...base.character,
        classId,
        evolution: EVOLUTIONS.has(base.character.evolution) ? base.character.evolution : "Mortal",
        level: Math.max(1, nonNegInt(base.character.level, 1)),
        xp: nonNegInt(base.character.xp),
        unspentAttributePoints: nonNegInt(base.character.unspentAttributePoints),
        resetsInEvolution: nonNegInt(base.character.resetsInEvolution),
        bonusAttributePoints: nonNegInt(base.character.bonusAttributePoints),
        attributes: {
          FOR: attrOrBase(base.character.attributes?.FOR, attrs.FOR),
          DES: attrOrBase(base.character.attributes?.DES, attrs.DES),
          CONS: attrOrBase(base.character.attributes?.CONS, attrs.CONS),
          INT: attrOrBase(base.character.attributes?.INT, attrs.INT)
        },
        hp: nonNegInt(base.character.hp, 100),
        mp: base.character.mp === void 0 ? void 0 : nonNegInt(base.character.mp)
      },
      skills: {
        ...base.skills,
        classId,
        specialization: normalizeTreeMap(base.skills.specialization),
        skillPoints: nonNegInt(base.skills.skillPoints),
        specPoints: nonNegInt(base.skills.specPoints)
      },
      skillLoadout: {
        slots: asLoadoutSlots(base.skillLoadout?.slots)
      },
      bags: asBags(base.bags),
      inventory: {
        gold: nonNegInt(base.inventory.gold),
        items: base.inventory.items
      }
    };
    remapLearnedSkills(payload);
    return payload;
  }
  function migrateSave(raw, profileIdHint = "default") {
    if (!raw || typeof raw !== "object") return null;
    const version = raw.saveVersion;
    if (typeof version !== "number" || !(version >= SAVE_VERSION)) return null;
    return normalizeSavePayload(raw, profileIdHint);
  }
  function migrateAccount(raw) {
    if (!raw || typeof raw !== "object") return null;
    const version = raw.version;
    if (typeof version !== "number" || !(version >= ACCOUNT_SAVE_VERSION)) return null;
    return raw;
  }
  function remapLearnedSkills(payload) {
    const seen = /* @__PURE__ */ new Set();
    for (const id of payload.skills.learned || []) {
      seen.add(remapSkillId(id));
    }
    payload.skills.learned = Array.from(seen);
    payload.skillLoadout.slots = (payload.skillLoadout.slots || []).map((slot) => ({
      ...slot,
      skillId: remapSkillId(slot.skillId)
    }));
  }
  const RETRY_DELAYS_MS = [1e3, 3e3, 1e4];
  function profileOf(write) {
    return write.payload?.meta.profileId ?? null;
  }
  function canMerge(older, newer) {
    const olderId = profileOf(older);
    const newerId = profileOf(newer);
    if (!olderId || !newerId) return true;
    return olderId === newerId;
  }
  function mergeWrites(older, newer) {
    return {
      payload: newer.payload ?? older.payload,
      sections: /* @__PURE__ */ new Set([...older.sections, ...newer.sections]),
      vault: newer.vault ?? older.vault,
      critical: older.critical || newer.critical,
      attempts: Math.max(older.attempts, newer.attempts)
    };
  }
  function sectionValue(payload, section) {
    if (section === "meta") return { saveVersion: payload.saveVersion, ...payload.meta };
    return payload[section];
  }
  function emptyAccount(user) {
    return {
      version: ACCOUNT_SAVE_VERSION,
      user,
      slots: Array.from({ length: SLOT_COUNT }, () => null),
      vault: emptyVault(),
      updatedAt: Date.now()
    };
  }
  function sameSummary(a, b) {
    return JSON.stringify(normalizeSlots([a])[0]) === JSON.stringify(normalizeSlots([b])[0]);
  }
  class SaveVault {
    constructor(store = new SaveStore()) {
      this.store = store;
    }
    auth = new AccountAuth();
    profileId = "default";
    status = "idle";
    lastError = null;
    queue = [];
    cacheEpoch = 0;
    flushChain = Promise.resolve();
    retryTimer = null;
    savedUiTimer = null;
    listeners = /* @__PURE__ */ new Set();
    cancelHooks = /* @__PURE__ */ new Set();
    writeCount = 0;
    lastStamp = 0;
    codec = null;
    vaultEnvelope = null;
    accountCache = null;
    encrypted = null;
    legacyCleared = /* @__PURE__ */ new Set();
    onStatus(cb) {
      this.listeners.add(cb);
      return () => this.listeners.delete(cb);
    }
    onCancel(cb) {
      this.cancelHooks.add(cb);
      return () => this.cancelHooks.delete(cb);
    }
    getStatus() {
      return this.status;
    }
    getLastError() {
      return this.lastError;
    }
    getWriteCount() {
      return this.writeCount;
    }
    hasPendingCritical() {
      return this.queue.some((write) => write.critical);
    }
    setProfileId(id) {
      this.profileId = id || "default";
    }
    getProfileId() {
      return this.profileId;
    }
    setStatus(status, error = null) {
      this.status = status;
      this.lastError = error;
      for (const cb of this.listeners) cb(status, error);
    }
    async bootstrap() {
      await this.auth.bootstrap();
    }
    login(userId, password) {
      return this.auth.login(userId, password);
    }
    async logout() {
      this.cancelPending();
      this.auth.logout();
      await this.flushChain;
      this.codec = null;
      this.vaultEnvelope = null;
      this.cacheEpoch += 1;
      this.accountCache = null;
      this.encrypted = null;
    }
    getSession() {
      return this.auth.getSession();
    }
    requireSession() {
      return this.auth.requireSession();
    }
    requireSessionOrThrow() {
      const session = this.getSession();
      if (!session) throw new Error("no_session");
      return session;
    }
    enqueue(task) {
      const next = this.flushChain.then(task, task);
      this.flushChain = next.then(
        () => void 0,
        () => void 0
      );
      return next;
    }
    cancelPending(reason = "full") {
      if (reason === "slot") this.keepVaultFor(this.profileId);
      else this.queue = [];
      if (!this.queue.length) {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
        if (this.status !== "idle") this.setStatus("idle");
      }
      for (const cb of this.cancelHooks) cb(reason);
    }
    keepVaultFor(profileId) {
      this.queue = this.queue.flatMap((write) => {
        const id = profileOf(write);
        if (id && id !== profileId) return [write];
        if (!write.vault) return [];
        return [{ ...write, payload: null, sections: /* @__PURE__ */ new Set() }];
      });
    }
    enqueueWrite(next) {
      const last = this.queue[this.queue.length - 1];
      if (last && canMerge(last, next)) this.queue[this.queue.length - 1] = mergeWrites(last, next);
      else this.queue.push(next);
    }
    codecFor(session) {
      const cached = this.codec;
      if (cached && cached.key === session.key && cached.mode === session.mode) return cached.codec;
      const codec = importCodecKey(session).catch((err) => {
        if (this.codec?.codec === codec) this.codec = null;
        throw err;
      });
      this.codec = { key: session.key, mode: session.mode, codec };
      return codec;
    }
    async listSlots() {
      const session = this.requireSessionOrThrow();
      const account = await this.loadAccount(session);
      return account.slots;
    }
    async loadAccount(session, fresh = false) {
      const cached = this.accountCache;
      if (!fresh && cached?.user === session.user) return structuredClone(cached.account);
      const epoch = this.cacheEpoch;
      const account = await this.readAccount(session);
      if (epoch !== this.cacheEpoch) {
        if (this.accountCache?.user === session.user) return structuredClone(this.accountCache.account);
        return structuredClone(account);
      }
      this.lastStamp = Math.max(this.lastStamp, account.updatedAt);
      this.accountCache = { user: session.user, account };
      return structuredClone(account);
    }
    async readAccount(session) {
      const blobs = await this.store.readAccount(session.user);
      const mirror = this.store.readVaultMirror(session.user);
      if (!blobs.slots && !blobs.vault && !mirror) return emptyAccount(session.user);
      const codec = await this.codecFor(session);
      const slots = blobs.slots ? migrateAccount(await decryptJson(codec, blobs.slots)) : null;
      let vault = blobs.vault ? migrateAccount(await decryptJson(codec, blobs.vault)) : null;
      if (mirror) {
        try {
          const fromMirror = migrateAccount(await decryptJson(codec, mirror));
          if (fromMirror && (!vault || Number(fromMirror.updatedAt) > Number(vault.updatedAt))) vault = fromMirror;
        } catch {
        }
      }
      return {
        version: ACCOUNT_SAVE_VERSION,
        user: session.user,
        slots: normalizeSlots(slots?.slots),
        vault: normalizeVault(vault?.vault),
        updatedAt: Math.max(Number(slots?.updatedAt) || 0, Number(vault?.updatedAt) || 0)
      };
    }
    encryptAccountPart(codec, session, part) {
      return encryptJson(codec, { version: ACCOUNT_SAVE_VERSION, user: session.user, ...part, updatedAt: this.nextStamp() });
    }
    nextStamp() {
      this.lastStamp = Math.max(Date.now(), this.lastStamp + 1);
      return this.lastStamp;
    }
    remember(session, account) {
      this.cacheEpoch += 1;
      this.accountCache = { user: session.user, account: structuredClone(account) };
    }
    vaultPersisted(session, raw) {
      if (this.vaultEnvelope?.raw !== raw) return;
      this.vaultEnvelope = null;
      this.store.clearVaultMirror(session.user);
    }
    writeAccount(patch) {
      const session = this.requireSessionOrThrow();
      return this.enqueue(async () => {
        const codec = await this.codecFor(session);
        const blobs = {};
        if (patch.slots !== void 0) blobs.slots = await this.encryptAccountPart(codec, session, { slots: normalizeSlots(patch.slots) });
        if (patch.vault !== void 0) blobs.vault = await this.encryptAccountPart(codec, session, { vault: normalizeVault(patch.vault) });
        this.cacheEpoch += 1;
        this.accountCache = null;
        await this.store.writeMany(null, {}, { userId: session.user, ...blobs });
      });
    }
    async loadAccountVault() {
      const session = this.getSession();
      if (!session) return emptyVault();
      const account = await this.loadAccount(session, true);
      return account.vault;
    }
    newSummary(userId, input) {
      return {
        profileId: profileIdFor(userId, input.slotIndex),
        classId: input.classId,
        name: input.name,
        level: input.level ?? 1,
        evolution: input.evolution ?? "Mortal",
        gold: input.gold ?? 0,
        resets: input.resets ?? 0,
        attrs: input.attrs ? { ...input.attrs } : emptyAttrs(),
        trees: input.trees ? { ...input.trees } : { controle: 0, magia: 0, fisica: 0 },
        spec: input.spec ? { ...input.spec } : { controle: 0, magia: 0, fisica: 0 },
        saveVersion: SAVE_VERSION
      };
    }
    createSlot(input) {
      const session = this.requireSessionOrThrow();
      return this.enqueue(async () => {
        const account = await this.loadAccount(session);
        if (input.slotIndex < 0 || input.slotIndex >= SLOT_COUNT) throw new Error("bad_slot");
        if (account.slots[input.slotIndex]) throw new Error("slot_occupied");
        const summary = this.newSummary(session.user, input);
        const payload = this.seedPayload(summary, session.user, input.slotIndex);
        await this.writeNow(session, {
          payload,
          sections: new Set(PROFILE_SECTIONS),
          vault: null,
          critical: true,
          attempts: 0
        });
        return summaryFromPayload(payload);
      });
    }
    seedPayload(summary, userId, slotIndex) {
      return {
        saveVersion: SAVE_VERSION,
        meta: {
          profileId: summary.profileId,
          userId,
          slotIndex,
          updatedAt: Date.now()
        },
        character: {
          name: summary.name,
          classId: summary.classId,
          level: summary.level,
          evolution: summary.evolution,
          xp: 0,
          unspentAttributePoints: 0,
          resetsInEvolution: summary.resets,
          bonusAttributePoints: 0,
          attributes: { ...summary.attrs },
          hp: 100
        },
        skills: {
          classId: summary.classId,
          learned: [],
          eighthTree: null,
          specialization: {
            controle: summary.spec?.controle || 0,
            magia: summary.spec?.magia || 0,
            fisica: summary.spec?.fisica || 0
          },
          skillPoints: Math.max(0, summary.level - 1),
          specPoints: 0
        },
        skillLoadout: emptySkillLoadout(),
        equipment: { equipped: {} },
        inventory: { gold: summary.gold, items: [] },
        bags: emptyBags(),
        buffs: [],
        progress: emptyProgress(),
        options: {}
      };
    }
    reserveSlot(slotIndex, classId, name) {
      const session = this.requireSessionOrThrow();
      return this.enqueue(async () => {
        const account = await this.loadAccount(session);
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) throw new Error("bad_slot");
        if (account.slots[slotIndex]) throw new Error("slot_occupied");
        const summary = this.newSummary(session.user, { slotIndex, classId, name });
        account.slots[slotIndex] = summary;
        await this.writeSlots(session, account, summary.profileId);
        return summary;
      });
    }
    deleteSlot(slotIndex) {
      const session = this.requireSessionOrThrow();
      const current = parseProfileId(this.profileId);
      if (current && current.userId === session.user && current.slotIndex === slotIndex) this.cancelPending("slot");
      return this.enqueue(async () => {
        const account = await this.loadAccount(session);
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) throw new Error("bad_slot");
        const profileId = account.slots[slotIndex]?.profileId || profileIdFor(session.user, slotIndex);
        account.slots[slotIndex] = null;
        await this.writeSlots(session, account, profileId);
      });
    }
    async writeSlots(session, account, clearProfileId) {
      const slots = await this.encryptAccountPart(await this.codecFor(session), session, { slots: account.slots });
      await this.clearProfileNow(clearProfileId, { userId: session.user, slots });
      this.remember(session, account);
    }
    commit(write) {
      if (write.sections.length || write.vault) {
        const next = {
          payload: write.payload,
          sections: new Set(write.sections),
          vault: write.vault,
          critical: write.critical,
          attempts: 0
        };
        this.enqueueWrite(next);
      }
      return this.flush();
    }
    idle() {
      return this.flushChain;
    }
    flush() {
      const session = this.getSession();
      return this.enqueue(() => this.runPending(session));
    }
    async runPending(session) {
      const write = this.queue[0];
      if (!write || !session) return;
      this.queue.shift();
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.setStatus("saving");
      try {
        await this.writeNow(session, write);
      } catch (err) {
        this.failWrite(write, err);
        return;
      }
      this.writeCount += 1;
      if (this.queue.length) {
        await this.runPending(session);
        return;
      }
      this.setStatus("saved");
      if (this.savedUiTimer) clearTimeout(this.savedUiTimer);
      this.savedUiTimer = setTimeout(() => {
        if (this.status === "saved") this.setStatus("idle");
      }, 1500);
    }
    failWrite(write, err) {
      const failed = { ...write, attempts: write.attempts + 1 };
      const giveUp = !failed.critical && failed.attempts >= RETRY_DELAYS_MS.length;
      if (!giveUp) {
        const head = this.queue[0];
        if (head && canMerge(failed, head)) this.queue[0] = mergeWrites(failed, head);
        else this.queue.unshift(failed);
        const delay = RETRY_DELAYS_MS[failed.attempts - 1];
        if (delay !== void 0) {
          this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            void this.flush();
          }, delay);
        }
      } else if (this.queue.length) {
        void this.flush();
      }
      this.setStatus("error", err instanceof Error ? err.message : "save_failed");
    }
    stamp(payload) {
      return {
        ...payload,
        saveVersion: SAVE_VERSION,
        meta: { ...payload.meta, updatedAt: this.nextStamp() }
      };
    }
    async writeNow(session, write) {
      const codec = await this.codecFor(session);
      const payload = write.payload && write.sections.size ? this.stamp(write.payload) : null;
      const blobs = {};
      if (payload) {
        for (const section of PROFILE_SECTIONS) {
          if (section !== "meta" && !write.sections.has(section)) continue;
          blobs[section] = await encryptJson(codec, sectionValue(payload, section));
        }
      }
      const { blobs: account, next } = await this.accountBlobs(session, codec, write.vault, payload);
      if (account.vault) this.vaultEnvelope = { user: session.user, raw: account.vault };
      const profileId = payload ? payload.meta.profileId : null;
      if (profileId) this.cacheEncrypted(profileId, blobs);
      const touchesAccount = account.slots !== void 0 || account.vault !== void 0;
      if (!profileId && !touchesAccount) return;
      await this.store.writeMany(profileId, blobs, touchesAccount ? { userId: session.user, ...account } : null);
      if (next && touchesAccount) this.remember(session, next);
      if (account.vault) this.vaultPersisted(session, account.vault);
      if (!profileId || this.legacyCleared.has(profileId)) return;
      try {
        await this.store.clearLegacyProfile(profileId);
        this.legacyCleared.add(profileId);
      } catch {
      }
    }
    async accountBlobs(session, codec, vault, payload) {
      if (!vault && !payload) return { blobs: {}, next: null };
      const account = await this.loadAccount(session);
      const out = {};
      if (vault) {
        account.vault = normalizeVault(vault);
        out.vault = await this.encryptAccountPart(codec, session, { vault: account.vault });
      }
      if (payload && this.syncSlotSummary(session, account, payload)) {
        out.slots = await this.encryptAccountPart(codec, session, { slots: account.slots });
      }
      return { blobs: out, next: account };
    }
    syncSlotSummary(session, account, payload) {
      const parsed = parseProfileId(payload.meta.profileId);
      if (!parsed || parsed.userId !== session.user || parsed.slotIndex < 0 || parsed.slotIndex >= SLOT_COUNT) return false;
      const summary = summaryFromPayload(payload);
      if (sameSummary(account.slots[parsed.slotIndex], summary)) return false;
      account.slots[parsed.slotIndex] = summary;
      return true;
    }
    cacheEncrypted(profileId, blobs) {
      const base = this.encrypted?.profileId === profileId ? this.encrypted.sections : {};
      this.encrypted = { profileId, sections: { ...base, ...blobs } };
    }
    writeMirror() {
      if (!this.getSession()) return;
      const cached = this.encrypted;
      if (cached && PROFILE_SECTIONS.every((s) => !!cached.sections[s])) {
        this.store.writeMirror(cached.profileId, cached.sections);
      }
      const vault = this.vaultEnvelope;
      if (vault) this.store.writeVaultMirror(vault.user, vault.raw);
    }
    async decodeSections(codec, blobs, profileId) {
      if (!blobs.meta) throw new Error("meta_missing");
      const { saveVersion, ...meta } = await decryptJson(codec, blobs.meta);
      if (typeof saveVersion !== "number" || saveVersion < SAVE_VERSION) return null;
      const raw = { saveVersion, meta };
      for (const section of PROFILE_SECTIONS) {
        if (section === "meta") continue;
        const blob = blobs[section];
        if (!blob) throw new Error("section_missing");
        raw[section] = await decryptJson(codec, blob);
      }
      return migrateSave(raw, profileId);
    }
    async loadCharacter(profileId) {
      const id = profileId || this.profileId;
      this.profileId = id;
      let blobs;
      try {
        blobs = await this.store.readAll(id);
      } catch {
        return { status: "unreadable" };
      }
      const mirror = this.store.readMirror(id);
      const hasIdb = Object.keys(blobs).length > 0;
      if (!hasIdb && !mirror) return { status: "missing" };
      const session = this.getSession();
      if (!session) return { status: "unreadable" };
      let codec;
      try {
        codec = await this.codecFor(session);
      } catch {
        return { status: "unreadable" };
      }
      let fromIdb = null;
      if (hasIdb) {
        try {
          fromIdb = await this.decodeSections(codec, blobs, id);
        } catch {
          return { status: "unreadable" };
        }
      }
      let fromMirror = null;
      if (mirror) {
        try {
          fromMirror = await this.decodeSections(codec, mirror, id);
        } catch {
          fromMirror = null;
        }
      }
      const useMirror = !!fromMirror && (!fromIdb || fromMirror.meta.updatedAt > fromIdb.meta.updatedAt);
      const best = useMirror ? fromMirror : fromIdb;
      if (!best) return { status: "missing" };
      this.encrypted = { profileId: id, sections: { ...useMirror && mirror ? mirror : blobs } };
      this.lastStamp = Math.max(this.lastStamp, Number(best.meta?.updatedAt) || 0);
      return { status: "ok", payload: best, fromMirror: useMirror };
    }
    async clearProfileNow(profileId, account = null) {
      await this.store.clearProfile(profileId, account);
      if (this.encrypted?.profileId === profileId) this.encrypted = null;
    }
    wipeProfile(profileId) {
      if (profileId === this.profileId) this.cancelPending();
      const session = this.getSession();
      return this.enqueue(async () => {
        const parsed = parseProfileId(profileId);
        if (!session || !parsed || parsed.userId !== session.user) {
          await this.clearProfileNow(profileId);
          return;
        }
        const account = await this.loadAccount(session);
        if (account.slots[parsed.slotIndex]?.profileId !== profileId) {
          await this.clearProfileNow(profileId);
          return;
        }
        account.slots[parsed.slotIndex] = null;
        await this.writeSlots(session, account, profileId);
      });
    }
    async wipeAccount(userId) {
      if (parseProfileId(this.profileId)?.userId === userId || this.getSession()?.user === userId) this.cancelPending();
      await this.enqueue(async () => {
        for (let i = 0; i < SLOT_COUNT; i++) await this.clearProfileNow(profileIdFor(userId, i));
        await this.store.clearAccount(userId);
        if (this.vaultEnvelope?.user === userId) this.vaultEnvelope = null;
        if (this.accountCache?.user === userId) {
          this.cacheEpoch += 1;
          this.accountCache = null;
        }
      });
      if (this.getSession()?.user === userId) await this.logout();
      try {
        sessionStorage.removeItem("uaidzin_active_char");
      } catch {
      }
      if (userId === "admin") {
        await this.auth.deleteAccountRecord("admin");
        await this.auth.bootstrap();
      }
    }
    async wipeAll(includeSettings = false) {
      await this.logout();
      try {
        sessionStorage.removeItem("uaidzin_active_char");
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
      }
      await this.enqueue(() => this.store.wipeAllUaidzinStorage(includeSettings));
      await this.auth.bootstrap();
    }
    async exportProfile(profileId) {
      const loaded = await this.loadCharacter(profileId);
      if (loaded.status !== "ok") return null;
      return JSON.stringify(loaded.payload, null, 2);
    }
    async importProfile(json, profileId) {
      const session = this.requireSessionOrThrow();
      const id = profileId || this.profileId;
      const parsed = migrateSave(JSON.parse(json), id);
      if (!parsed) return null;
      parsed.meta.profileId = id;
      const parts = parseProfileId(id);
      if (parts) {
        parsed.meta.userId = parts.userId;
        parsed.meta.slotIndex = parts.slotIndex;
      }
      await this.enqueue(
        () => this.writeNow(session, {
          payload: parsed,
          sections: new Set(PROFILE_SECTIONS),
          vault: null,
          critical: true,
          attempts: 0
        })
      );
      return parsed;
    }
    slotExists(slots, profileId) {
      return slots.some((s) => s?.profileId === profileId);
    }
  }
  const saveVault = new SaveVault();
  const GOOGLE_LOCAL_KEY = "uaidzin_google_local_v1";
  const ACTIVE_KEY = "uaidzin_active_char";
  function randomHex(byteCount) {
    return Array.from(randomBytes(byteCount), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  function googleIdentity() {
    try {
      const data2 = JSON.parse(localStorage.getItem(GOOGLE_LOCAL_KEY) || "null");
      if (typeof data2?.id === "string" && data2.id.startsWith("google:") && typeof data2.secret === "string" && data2.secret) {
        return { id: data2.id, secret: data2.secret };
      }
    } catch {
    }
    const data = { id: "google:" + randomHex(8), secret: b64(randomBytes(24)) };
    localStorage.setItem(GOOGLE_LOCAL_KEY, JSON.stringify(data));
    return data;
  }
  async function loginGoogleSimulated() {
    try {
      await saveVault.bootstrap();
      const identity = googleIdentity();
      const isNew = !saveVault.auth.listAccountIds().includes(identity.id);
      if (isNew) {
        const reg = await saveVault.auth.register(identity.id, identity.secret);
        if (!reg.ok) return { ok: false, error: reg.error || "Não foi possível criar a conta Google." };
      }
      const res = await saveVault.login(identity.id, identity.secret);
      if (!res.ok) return { ok: false, error: res.error || "Falha ao entrar com Google." };
      return { ok: true, session: res.session, userId: identity.id, created: isNew };
    } catch {
      return { ok: false, error: "Falha ao entrar com Google." };
    }
  }
  async function resetAdminAccount() {
    await saveVault.wipeAccount("admin");
    await saveVault.logout();
    return saveVault.auth.bootstrap();
  }
  function requireSession() {
    const session = saveVault.getSession();
    if (session) return session;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "uaidzin-boot-need-login" }, window.location.origin);
      return null;
    }
    window.location.href = "01-login.html";
    return null;
  }
  async function loadSave(session) {
    try {
      return await saveVault.loadAccount(session, true);
    } catch {
      return { corrupted: true };
    }
  }
  async function saveData(_session, data) {
    await saveVault.writeAccount({ slots: data?.slots, vault: data?.vault });
    return true;
  }
  function clearActiveIf(profileId, slotIndex) {
    try {
      const active = JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || "null");
      if (active && (active.id === profileId || active.slotIndex === slotIndex)) sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
    }
  }
  async function deleteSlot(session, slotIndex) {
    const before = (await saveVault.loadAccount(session)).slots[slotIndex];
    await saveVault.deleteSlot(slotIndex);
    clearActiveIf(before?.profileId, slotIndex);
    return (await saveVault.loadAccount(session)).slots;
  }
  function createSlot(_session, slotIndex, input) {
    return saveVault.reserveSlot(slotIndex, input.classId, input.name);
  }
  window.UaidzinSave = {
    bootstrap: () => saveVault.bootstrap(),
    resetAdminAccount,
    ensureAccount: (userId, password) => saveVault.auth.ensureAccount(userId, password),
    registerAccount: (userId, password) => saveVault.auth.register(userId, password),
    loginGoogleSimulated,
    login: (userId, password) => saveVault.login(userId, password),
    logout: () => saveVault.logout(),
    getSession: () => saveVault.getSession(),
    requireSession,
    loadSave,
    loadEquippedArmor: async (profileId) => {
      const loaded = await saveVault.loadCharacter(profileId);
      return loaded.status === "ok" ? loaded.payload.equipment?.equipped?.armor || null : null;
    },
    saveData,
    createSlot,
    deleteSlot,
    clearProfileStorage: (profileId) => saveVault.wipeProfile(profileId),
    defaultAttrs: emptyAttrs,
    dbVersion: DB_VERSION,
    rememberUser: (userId) => saveVault.auth.rememberUserId(userId),
    readRememberedUser: () => saveVault.auth.readRememberedUserId(),
    _debug: { hasSubtle: hasSubtleCrypto() }
  };
})();
