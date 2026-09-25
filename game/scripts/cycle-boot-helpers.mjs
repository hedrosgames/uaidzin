export async function wipeSave(page, base) {
  await page.goto(`${base}/tools/save-wipe.html?auto=all`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
}

export async function loginAdmin(page) {
  const frame = page.frameLocator("iframe").first();
  await frame.locator("#user").waitFor({ timeout: 20000 });
  await frame.locator("#user").fill("admin");
  await frame.locator("#pass").fill("admin");
  await frame.locator("#btnLogin").click();
  await page.waitForFunction(
    () => {
      const f = document.querySelector("iframe");
      return !!f && /02-selecao/.test(f.contentWindow?.location?.href || "");
    },
    null,
    { timeout: 20000 },
  );
  return frame;
}

export async function createTkAndEnter(page, frame, name) {
  await frame.locator("#btnCreateFirst").click();
  await frame.locator("#newName").fill(name);
  await frame.locator("#btnCreateConfirm").click();
  await page.waitForTimeout(900);
  await frame.locator("#btnConnect").click();
  await page.waitForFunction(
    (n) => window.__UAIDZIN__?.session?.character?.name === n,
    name,
    { timeout: 30000 },
  );
  await page.waitForFunction(() => !!window.__UAIDZIN__?.getSnapshot?.().entered, null, { timeout: 30000 });
  await page.waitForTimeout(800);
}

export async function openNpcPanel(page, npcId) {
  return page.evaluate(async (id) => {
    const api = window.__UAIDZIN__;
    if (!api?.session) return { ok: false, reason: "no-session" };
    const s = api.session;
    if (typeof api.closePanels === "function") api.closePanels();
    document.querySelectorAll("#wire-ui .win").forEach((w) => w.classList.add("is-closed"));
    const world = s.worlds.getCurrent();
    const def = world?.interactables.find((i) => i.id === id);
    if (!def) return { ok: false, reason: "no-npc" };
    api.teleportPlayer(def.x, def.z);
    api.queueInteractById(id);
    for (let i = 0; i < 45; i++) s.update(1 / 30, 16 / 9, false);
    await new Promise((r) => setTimeout(r, 450));
    const wire = document.querySelector("#wire-ui");
    const open = (sel) => !!wire?.querySelector(sel + ":not(.is-closed)");
    if (id === "vault-chest") {
      return { ok: open("#p-inv") && open("#p-vault"), panels: { inv: open("#p-inv"), vault: open("#p-vault") } };
    }
    const map = {
      "npc-merchant": "#p-shop",
      "npc-blacksmith": "#p-shop",
      "npc-skill-master": "#p-skillmaster",
      "npc-sage": "#p-sage",
      "npc-composer": "#p-composer",
      "npc-portal-guard": "#p-portal",
      "npc-quest": "#p-quest",
    };
    const sel = map[id];
    const shopId = id === "npc-blacksmith" ? "blacksmith" : id === "npc-merchant" ? "merchant" : null;
    const shopEl = wire?.querySelector("#p-shop");
    const shopDataset = shopEl?.dataset?.shop || null;
    return {
      ok: sel ? open(sel) : false,
      shopId: shopDataset,
      expectedShop: shopId,
    };
  }, npcId);
}
