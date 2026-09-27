import type { WireDungeonEntry } from "../WireApi";
import type { WireContext } from "./types";

export function portalDurationLabel(def: WireDungeonEntry): string {
  const sec = def.durationSeconds || 600;
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `<span class="lab">Tempo</span> <span class="val">${m}:${s}</span>`;
}

export interface PortalPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
  requestEnter(dungeonId: string): void;
}

export function createPortalPanel(container: HTMLElement, ctx: WireContext): PortalPanel {
  let levelFilterActive = false;

  function renderHtml(): string {
    return `
<section class="win is-closed" id="p-portal">
  <div class="win-h">Portal Dimensional <span class="x" data-close="portal">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b">
      <div class="portal-evo" id="portalEvo" style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span class="lab" style="font-size:12px;color:var(--ink-dim)">Masmorras Disponíveis</span>
        <button type="button" class="portal-lvl-filter" id="portalLvlFilter" aria-pressed="false" style="border:1px solid #5a4a38;background:#1a140e;color:var(--ink);border-radius:2px;padding:2px 8px;font-size:11px;cursor:pointer">No meu nível</button>
      </div>
      <div class="portal-scroll" id="portalList" style="display:flex;flex-direction:column;gap:6px;max-height:480px;overflow:auto"></div>
    </div>
  </div>
</section>
`;
  }

  function readPortalSkip(): boolean {
    try {
      const raw = localStorage.getItem("uaidzin_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.optSkipDungeonConfirm != null) return Boolean(parsed.optSkipDungeonConfirm);
      }
      return localStorage.getItem("uaidzin_portal_skip_confirm") === "1";
    } catch {
      return false;
    }
  }

  function writePortalSkip(skip: boolean): void {
    try {
      localStorage.setItem("uaidzin_portal_skip_confirm", skip ? "1" : "0");
      const raw = localStorage.getItem("uaidzin_settings");
      const data = raw ? JSON.parse(raw) : {};
      data.optSkipDungeonConfirm = skip;
      localStorage.setItem("uaidzin_settings", JSON.stringify(data));
    } catch {
      
    }
  }

  function requestEnter(dungeonId: string): void {
    const pCtx = ctx.api.getPortalContext();
    const list = pCtx.dungeons;
    const d = list.find((item: WireDungeonEntry) => item.id === dungeonId);
    if (!d) return;

    if (readPortalSkip()) {
      ctx.api.enterDungeonById(dungeonId);
      ctx.closeAll();
      return;
    }

    ctx.openPortalConfirm({
      title: "Entrar na Masmorra",
      msg: `Deseja entrar em <b>${d.name}</b> (Nv. ${d.minLevel}-${d.maxLevel})?`,
      onYes: (dontAskAgain) => {
        if (dontAskAgain) {
          writePortalSkip(true);
        }
        ctx.api.enterDungeonById(dungeonId);
        ctx.closeAll();
      },
    });
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-portal");
    if (!win) return;

    win.querySelector("[data-close='portal']")?.addEventListener("click", () => {
      ctx.closePanel("portal");
    });

    const filterBtn = win.querySelector<HTMLButtonElement>("#portalLvlFilter");
    filterBtn?.addEventListener("click", () => {
      levelFilterActive = !levelFilterActive;
      filterBtn.setAttribute("aria-pressed", String(levelFilterActive));
      filterBtn.classList.toggle("on", levelFilterActive);
      sync();
    });
  }

  function sync(): void {
    const win = container.querySelector<HTMLElement>("#p-portal");
    if (!win) return;

    const listEl = win.querySelector<HTMLElement>("#portalList");
    if (!listEl) return;

    const pCtx = ctx.api.getPortalContext();
    const dungeons = pCtx.dungeons;
    const playerLevel = pCtx.level || 1;

    let filtered = dungeons;
    if (levelFilterActive) {
      filtered = dungeons.filter((d: WireDungeonEntry) => playerLevel >= d.minLevel && playerLevel <= d.maxLevel);
    }

    if (!filtered.length) {
      listEl.innerHTML = `<div style="color:var(--ink-mute);font-size:12px;padding:8px">Nenhuma masmorra encontrada.</div>`;
      return;
    }

    let html = "";
    for (const d of filtered) {
      const inLevel = playerLevel >= d.minLevel && playerLevel <= d.maxLevel;
      const hasReqItem = !d.entryItemId || (pCtx.entryCounts[d.entryItemId] || 0) > 0;
      const canEnter = inLevel && hasReqItem;
      const sealIcon = { icon: "seal", path: "/assets/icons/items/seal.svg" };

      html += `
        <div class="portal-card" data-portal-id="${d.id}">
          <div class="top">
            <h3 class="ttl">${d.name}</h3>
            <div class="entry-ico ${d.entryItemId ? "" : "is-free"}">
              ${d.entryItemId ? `<img src="${sealIcon.path}" alt="Entrada">` : `<span class="is-free">Livre</span>`}
            </div>
          </div>
          <div class="rows">
            <div class="row">
              <span class="lab">Nível</span>
              <span class="val">${d.minLevel} - ${d.maxLevel}</span>
            </div>
            <div class="row">
              ${portalDurationLabel(d)}
            </div>
            <div class="row" style="margin-top:6px;justify-content:flex-end">
              <button type="button" class="inv-tool sort btn-portal-enter" data-dungeon="${d.id}" ${canEnter ? "" : "disabled"} style="padding:4px 12px">Entrar</button>
            </div>
          </div>
        </div>
      `;
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll<HTMLButtonElement>(".btn-portal-enter").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.dungeon;
        if (id) requestEnter(id);
      });
    });

    listEl.querySelectorAll<HTMLElement>(".portal-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.portalId;
        if (id) requestEnter(id);
      });
    });
  }

  return {
    renderHtml,
    bindEvents,
    sync,
    requestEnter,
  };
}
