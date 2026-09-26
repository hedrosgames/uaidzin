(function (global) {
  const ACCOUNTS_KEY = "uaidzin_accounts_v1";
  const SESSION_KEY = "uaidzin_session_v1";
  const SAVE_PREFIX = "uaidzin_save_v1_";
  const REMEMBER_KEY = "uaidzin_login";
  const GOOGLE_LOCAL_KEY = "uaidzin_google_local_v1";
  const DB_NAME = "uaidzin";
  const DB_VERSION = 3;
  const LEGACY_STORE = "save";
  const SECTIONS_STORE = "sections";
  const PROFILE_SECTIONS = ["meta", "character", "skills", "skillLoadout", "equipment", "inventory", "bags", "buffs", "progress", "options"];
  const ITERATIONS = 100000;
  const FALLBACK_ITERATIONS = 5000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const hasSubtle = !!(global.crypto && global.crypto.subtle);

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
    if (global.crypto && global.crypto.getRandomValues) {
      return crypto.getRandomValues(new Uint8Array(n));
    }
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = (Math.random() * 256) | 0;
    return out;
  }

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function fallbackKey(password, saltB64, iterations) {
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

  function fallbackHash(password, saltB64) {
    return b64(fallbackKey(password, saltB64, 2000));
  }

  function xorCrypt(key, data) {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
    return out;
  }

  async function subtleDeriveBits(password, salt, iterations) {
    const keyMaterial = await crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      keyMaterial,
      256
    );
    return new Uint8Array(bits);
  }

  async function hashPassword(password, salt) {
    if (!hasSubtle) return fallbackHash(password, b64(salt));
    return b64(await subtleDeriveBits(password, salt, ITERATIONS));
  }

  function readAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }
  function writeAccounts(acc) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
  }

  async function verifyPassword(rec, password) {
    const salt = unb64(rec.salt);
    if (hasSubtle) {
      const hash = await hashPassword(password, salt);
      if (hash === rec.hash) return true;
    }
    return fallbackHash(password, rec.salt) === rec.hash;
  }

  async function ensureAccount(userId, password) {
    const acc = readAccounts();
    if (acc[userId]) return acc[userId];
    const salt = b64(randomBytes(16));
    const hash = await hashPassword(password, unb64(salt));
    acc[userId] = { id: userId, salt, hash, createdAt: Date.now(), mode: hasSubtle ? "aes" : "fallback" };
    writeAccounts(acc);
    return acc[userId];
  }

  function normalizeVault(vault) {
    const v = vault && typeof vault === "object" ? vault : {};
    return {
      gold: Math.max(0, Number(v.gold) || 0),
      items: Array.isArray(v.items) ? v.items : [],
    };
  }

  async function registerAccount(userId, password) {
    const id = String(userId || "").trim();
    if (!id || !password) {
      return { ok: false, error: "Preencha login e senha." };
    }
    const acc = readAccounts();
    if (acc[id]) {
      return { ok: false, error: "Este login já está em uso." };
    }
    const salt = b64(randomBytes(16));
    const hash = await hashPassword(password, unb64(salt));
    acc[id] = { id, salt, hash, createdAt: Date.now(), mode: hasSubtle ? "aes" : "fallback" };
    writeAccounts(acc);
    return { ok: true, account: acc[id] };
  }

  function randomHex(byteCount) {
    const bytes = randomBytes(byteCount);
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, "0");
    }
    return out;
  }

  function getOrCreateGoogleIdentity() {
    try {
      const raw = localStorage.getItem(GOOGLE_LOCAL_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data.id === "string" && data.id.indexOf("google:") === 0 && data.secret) {
          return data;
        }
      }
    } catch (_) {}
    const data = {
      id: "google:" + randomHex(8),
      secret: b64(randomBytes(24)),
    };
    localStorage.setItem(GOOGLE_LOCAL_KEY, JSON.stringify(data));
    return data;
  }

  async function ensureEmptySave(session) {
    const existing = await loadSave(session);
    if (existing && !existing.corrupted) return existing;
    await saveData(session, {
      slots: [null, null, null, null],
      vault: { gold: 0, items: [] },
    });
    return loadSave(session);
  }

  async function loginGoogleSimulated() {
    try {
      await bootstrap();
      const identity = getOrCreateGoogleIdentity();
      const acc = readAccounts();
      const isNew = !acc[identity.id];
      if (isNew) {
        const reg = await registerAccount(identity.id, identity.secret);
        if (!reg || !reg.ok) {
          return { ok: false, error: (reg && reg.error) || "Não foi possível criar a conta Google." };
        }
      }
      const res = await login(identity.id, identity.secret);
      if (!res || !res.ok) {
        return { ok: false, error: (res && res.error) || "Falha ao entrar com Google." };
      }
      if (isNew) {
        await saveData(res.session, {
          slots: [null, null, null, null],
          vault: { gold: 0, items: [] },
        });
      } else {
        await ensureEmptySave(res.session);
      }
      return {
        ok: true,
        session: res.session,
        userId: identity.id,
        created: isNew,
      };
    } catch (err) {
      console.error("loginGoogleSimulated", err);
      return { ok: false, error: "Falha ao entrar com Google." };
    }
  }

  async function bootstrap() {
    const existing = readAccounts()["admin"];
    if (existing && existing.salt && existing.hash) return existing;
    try {
      return await ensureAccount("admin", "admin");
    } catch (err) {
      console.error("bootstrap failed", err);
      const salt = b64(randomBytes(16));
      const hash = fallbackHash("admin", salt);
      const acc = readAccounts();
      acc["admin"] = { id: "admin", salt, hash, createdAt: Date.now(), mode: "fallback" };
      writeAccounts(acc);
      return acc["admin"];
    }
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        reject(new Error("Não foi possível abrir o armazenamento do jogo."));
        return;
      }
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(LEGACY_STORE)) db.createObjectStore(LEGACY_STORE);
        if (!db.objectStoreNames.contains(SECTIONS_STORE)) db.createObjectStore(SECTIONS_STORE);
      };
      let blocked = false;
      req.onblocked = function () {
        blocked = true;
        reject(new Error("Armazenamento do jogo bloqueado por outra aba. Feche as outras abas e tente de novo."));
      };
      req.onerror = function () {
        reject(new Error("Não foi possível abrir o armazenamento do jogo."));
      };
      req.onsuccess = function () {
        const db = req.result;
        if (blocked) {
          db.close();
          return;
        }
        db.onversionchange = function () { db.close(); };
        resolve(db);
      };
    });
  }

  async function clearProfileStorage(profileId) {
    try {
      localStorage.removeItem("uaidzin.save." + profileId);
      localStorage.removeItem("uaidzin.save." + profileId + ":prev");
      localStorage.removeItem("uaidzin.mirror." + profileId);
    } catch (_) {}
    const db = await openDb();
    try {
      await new Promise(function (resolve, reject) {
        const tx = db.transaction([SECTIONS_STORE, LEGACY_STORE], "readwrite");
        const sections = tx.objectStore(SECTIONS_STORE);
        PROFILE_SECTIONS.forEach(function (section) {
          sections.delete("profile:" + profileId + ":" + section);
        });
        tx.objectStore(LEGACY_STORE).delete("profile:" + profileId);
        tx.objectStore(LEGACY_STORE).delete("profile:" + profileId + ":prev");
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(new Error("Falha ao apagar o personagem do armazenamento.")); };
        tx.onabort = function () { reject(new Error("Falha ao apagar o personagem do armazenamento.")); };
      });
    } finally {
      db.close();
    }
  }

  async function resetAdminAccount() {
    const acc = readAccounts();
    delete acc["admin"];
    writeAccounts(acc);
    localStorage.removeItem(SAVE_PREFIX + "admin");
    await Promise.all(["0", "1", "2", "3"].map(function (i) {
      return clearProfileStorage("admin:slot:" + i);
    }));
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("uaidzin_active_char");
    return bootstrap();
  }

  async function login(userId, password) {
    try {
      await bootstrap();
      const acc = readAccounts();
      const rec = acc[userId];
      if (!rec) return { ok: false, error: "Conta não encontrada." };
      const ok = await verifyPassword(rec, password);
      if (!ok) return { ok: false, error: "Login ou senha inválidos." };

      let keyB64;
      if (hasSubtle) {
        keyB64 = b64(await subtleDeriveBits(password, unb64(rec.salt), ITERATIONS));
        if (rec.mode !== "aes") {
          rec.hash = await hashPassword(password, unb64(rec.salt));
          rec.mode = "aes";
          acc[userId] = rec;
          writeAccounts(acc);
        }
      } else {
        keyB64 = b64(fallbackKey(password, rec.salt, FALLBACK_ITERATIONS));
      }

      const session = {
        user: userId,
        at: Date.now(),
        key: keyB64,
        salt: rec.salt,
        mode: hasSubtle ? "aes" : "fallback",
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true, session };
    } catch (err) {
      console.error("login error", err);
      return { ok: false, error: "Falha ao entrar." };
    }
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
      if (window.parent && window.parent !== window) {
        try {
          const fromParent = window.parent.sessionStorage.getItem(SESSION_KEY);
          if (fromParent) {
            sessionStorage.setItem(SESSION_KEY, fromParent);
            return JSON.parse(fromParent);
          }
        } catch (_) {}
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("uaidzin_active_char");
    try {
      if (window.parent && window.parent !== window) {
        window.parent.sessionStorage.removeItem(SESSION_KEY);
        window.parent.sessionStorage.removeItem("uaidzin_active_char");
      }
    } catch (_) {}
  }

  function requireSession() {
    const s = getSession();
    if (!s || !s.user || !s.key) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "uaidzin-boot-need-login" }, "*");
        return null;
      }
      window.location.href = "01-login.html";
      return null;
    }
    return s;
  }

  function saveKeyFor(user) {
    return SAVE_PREFIX + user;
  }

  async function encryptJson(session, obj) {
    const data = enc.encode(JSON.stringify(obj));
    const iv = randomBytes(12);
    if (session.mode === "aes" && hasSubtle) {
      const key = await crypto.subtle.importKey(
        "raw", unb64(session.key), "AES-GCM", false, ["encrypt"]
      );
      const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
      return JSON.stringify({ v: 1, mode: "aes", iv: b64(iv), data: b64(cipher), at: Date.now() });
    }
    const key = unb64(session.key);
    const mixed = new Uint8Array(iv.length + data.length);
    mixed.set(iv, 0);
    mixed.set(data, iv.length);
    const out = xorCrypt(key, mixed);
    return JSON.stringify({ v: 1, mode: "xor", data: b64(out), at: Date.now() });
  }

  async function decryptJson(session, payload) {
    if (payload.mode === "xor" || session.mode === "fallback" || !hasSubtle) {
      const raw = unb64(payload.data);
      const key = unb64(session.key);
      const plain = xorCrypt(key, raw);
      const body = payload.mode === "aes" ? plain : plain.subarray(12);
      return JSON.parse(dec.decode(body));
    }
    const iv = unb64(payload.iv);
    const data = unb64(payload.data);
    const key = await crypto.subtle.importKey(
      "raw", unb64(session.key), "AES-GCM", false, ["decrypt"]
    );
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(dec.decode(plain));
  }

  function numOr(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeTreeMap(src) {
    const t = src && typeof src === "object" ? src : {};
    return {
      controle: Math.max(0, numOr(t.controle, 0)),
      magia: Math.max(0, numOr(t.magia, 0)),
      fisica: Math.max(0, numOr(t.fisica, 0)),
    };
  }

  function normalizeSlots(slots) {
    const raw = Array.isArray(slots) ? slots : [];
    const out = [];
    for (let i = 0; i < 4; i++) {
      const s = raw[i];
      if (!s || !s.classId || !s.name) {
        out.push(null);
        continue;
      }
      const attrs = s.attrs && typeof s.attrs === "object" ? s.attrs : {};
      out.push({
        profileId: s.profileId || "",
        classId: s.classId,
        name: s.name,
        level: Math.max(1, numOr(s.level, 1)),
        evolution: s.evolution || "Mortal",
        gold: Math.max(0, numOr(s.gold, 0)),
        resets: Math.max(0, numOr(s.resets, 0)),
        attrs: {
          FOR: Math.max(0, numOr(attrs.FOR, 5)),
          DES: Math.max(0, numOr(attrs.DES, 5)),
          CONS: Math.max(0, numOr(attrs.CONS, 5)),
          INT: Math.max(0, numOr(attrs.INT, 5)),
        },
        trees: normalizeTreeMap(s.trees),
        spec: normalizeTreeMap(s.spec),
        saveVersion: Math.max(0, numOr(s.saveVersion, 0)),
      });
    }
    return out;
  }

  async function loadSave(session) {
    const raw = localStorage.getItem(saveKeyFor(session.user));
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw);
      const data = await decryptJson(session, payload);
      data.slots = normalizeSlots(data.slots);
      data.vault = normalizeVault(data.vault);
      return data;
    } catch (err) {
      console.warn("save corrompido", err);
      return { corrupted: true };
    }
  }

  async function saveData(session, data) {
    let vault = normalizeVault(null);
    if (data && Object.prototype.hasOwnProperty.call(data, "vault")) {
      vault = normalizeVault(data.vault);
    } else {
      const existing = await loadSave(session);
      if (existing && !existing.corrupted && existing.vault) {
        vault = normalizeVault(existing.vault);
      }
    }
    const blob = await encryptJson(session, {
      version: 1,
      user: session.user,
      slots: normalizeSlots(data.slots),
      vault,
      updatedAt: Date.now(),
    });
    localStorage.setItem(saveKeyFor(session.user), blob);
    return true;
  }

  async function deleteSlot(session, slotIndex) {
    const data = (await loadSave(session)) || { slots: [null, null, null, null] };
    const slots = normalizeSlots(data.slots);
    const slot = slots[slotIndex];
    if (slot && slot.profileId) await clearProfileStorage(slot.profileId);
    else await clearProfileStorage(session.user + ":slot:" + slotIndex);
    slots[slotIndex] = null;
    await saveData(session, { slots });
    try {
      const active = JSON.parse(sessionStorage.getItem("uaidzin_active_char") || "null");
      if (active && (active.id === (slot && slot.profileId) || active.slotIndex === slotIndex)) {
        sessionStorage.removeItem("uaidzin_active_char");
      }
    } catch (_) {}
    return slots;
  }

  function rememberUser(userId) {
    if (!userId) {
      localStorage.removeItem(REMEMBER_KEY);
      return;
    }
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user: userId }));
  }

  function readRememberedUser() {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.pass != null) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user: data.user || "" }));
      }
      return data.user || null;
    } catch (_) {
      return null;
    }
  }

  global.UaidzinSave = {
    bootstrap,
    resetAdminAccount,
    ensureAccount,
    registerAccount,
    loginGoogleSimulated,
    login,
    logout,
    getSession,
    requireSession,
    loadSave,
    saveData,
    deleteSlot,
    clearProfileStorage,
    rememberUser,
    readRememberedUser,
    _debug: { hasSubtle },
  };
})(window);
