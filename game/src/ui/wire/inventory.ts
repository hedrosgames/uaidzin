import type { CharacterViewModel } from "../../persistence/SaveTypes";
import type { EquipSlot } from "../WireApi";
import type { WireContext } from "./types";

const CLASS_PORTRAIT: Record<string, string> = {
  TK: "/assets/class/char-tk.png",
  FM: "/assets/class/char-fm.png",
  BM: "/assets/class/char-bm.png",
  HT: "/assets/class/char-ht.png",
};

export interface InventoryPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(view: CharacterViewModel | null): void;
  setVaultOpen(open: boolean): void;
}

export function createInventoryPanel(container: HTMLElement, ctx: WireContext): InventoryPanel {
  let curBagPage = 0;
  let trashModeActive = false;

  function renderHtml(): string {
    return `
<section class="win" id="p-inv">
  <div class="win-h">Inventário <span class="x" data-close="inv">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b">
      <div class="doll-wrap">
        <div class="doll-top" id="dollTop">
          <div class="eq eq-head" data-slot="head"><img class="ico type" src="/assets/icons/eq/crown.svg" alt="Cabeça"></div>
        </div>
        <div class="doll" id="doll">
          <div class="eq eq-neck" data-slot="neck"><img class="ico type" src="/assets/icons/eq/neck.svg" alt="Colar"></div>
          <div class="sil"><img id="charPortraitImg" src="/assets/class/char-tk.png" alt="Personagem"></div>
          <div class="eq eq-ear" data-slot="ear"><img class="ico type" src="/assets/icons/eq/ear.svg" alt="Brinco"></div>
          <div class="eq eq-weapon" data-slot="weapon"><img class="ico type" src="/assets/icons/eq/weapon.svg" alt="Arma"></div>
          <div class="eq eq-armor" data-slot="armor"><img class="ico type" src="/assets/icons/eq/armor.svg" alt="Armadura"></div>
          <div class="eq eq-ring1" data-slot="ring1"><img class="ico type" src="/assets/icons/eq/ring.svg" alt="Anel 1"></div>
          <div class="eq eq-ring2" data-slot="ring2"><img class="ico type" src="/assets/icons/eq/ring.svg" alt="Anel 2"></div>
        </div>
      </div>

      <div class="sep"></div>
      <div class="bag-block">
        <div class="bag-tabs" id="bagTabs">
          <button type="button" class="bag-tab on" data-bag-page="0">1</button>
          <button type="button" class="bag-tab" data-bag-page="1">2</button>
          <button type="button" class="bag-tab" data-bag-page="2">3</button>
          <button type="button" class="bag-tab" data-bag-page="3">4</button>
          <button type="button" class="bag-tab" data-bag-page="4">5</button>
          <span class="val" id="bagCount">0 / 40</span>
        </div>

        <div class="bag-wrap" id="bagWrap">
          <div class="bag" id="bag"></div>
        </div>
      </div>

      <div class="tool-row" style="display:flex;gap:4px;margin-top:6px;align-items:center">
        <button type="button" class="inv-tool trash" id="btn-trash" aria-label="Lixeira" title="Lixeira / Descartar" style="width:28px;height:28px;padding:0">🗑</button>
        <button type="button" class="inv-tool sort" id="btn-sort-bag" style="flex:1">Organizar</button>
        <button type="button" class="inv-tool best" id="btn-equip-best" style="flex:1">Equipar</button>
        <div class="inv-tool-wrap is-vault-only" id="wrap-store-vault" hidden>
          <button type="button" class="inv-tool store" id="btn-store-vault">Guardar tudo</button>
        </div>
      </div>

      <div class="goldline" style="margin-top:6px">
        <span class="lab" style="font-size:12px;color:var(--ink-dim)">Ouro: </span>
        <strong id="playerGold" class="gold" style="font-family:var(--font-num);font-size:14px">0</strong>
      </div>
    </div>
  </div>
</section>
`;
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-inv");
    if (!win) return;

    win.querySelector("[data-close='inv']")?.addEventListener("click", () => {
      ctx.closePanel("inv");
    });

    win.querySelector<HTMLButtonElement>("#btn-sort-bag")?.addEventListener("click", () => {
      const inv = ctx.api.snapshotInventory();
      const uids = inv.items.map((i) => i.uid);
      uids.sort((a, b) => {
        const itemA = inv.items.find((i) => i.uid === a);
        const itemB = inv.items.find((i) => i.uid === b);
        if (!itemA || !itemB) return 0;
        return (itemB.refine || 0) - (itemA.refine || 0) || itemA.name.localeCompare(itemB.name);
      });
      ctx.api.reorderBag(uids);
      ctx.syncFromGame();
    });

    win.querySelector<HTMLButtonElement>("#btn-equip-best")?.addEventListener("click", () => {
      ctx.api.equipBest();
      ctx.syncFromGame();
    });

    win.querySelector<HTMLButtonElement>("#btn-store-vault")?.addEventListener("click", () => {
      ctx.api.moveAllToVault();
      ctx.syncFromGame();
    });

    const trashBtn = win.querySelector<HTMLButtonElement>("#btn-trash");
    trashBtn?.addEventListener("click", () => {
      trashModeActive = !trashModeActive;
      trashBtn.classList.toggle("is-on", trashModeActive);
    });

    win.querySelectorAll<HTMLButtonElement>(".bag-tab[data-bag-page]").forEach((tab) => {
      tab.addEventListener("click", () => {
        curBagPage = Number(tab.dataset.bagPage) || 0;
        win.querySelectorAll(".bag-tab").forEach((t) => t.classList.remove("on"));
        tab.classList.add("on");
        renderBag();
      });
    });

    win.addEventListener("mouseleave", () => {
      ctx.hideItemTip();
    });
  }

  function setVaultOpen(open: boolean): void {
    const wrap = container.querySelector<HTMLElement>("#wrap-store-vault");
    if (wrap) wrap.hidden = !open;
  }

  function renderDoll(): void {
    const win = container.querySelector<HTMLElement>("#p-inv");
    if (!win) return;

    const eq = ctx.api.equippedSnapshot();
    const slots: EquipSlot[] = ["head", "neck", "ear", "weapon", "armor", "ring1", "ring2"];

    for (const slot of slots) {
      const el = win.querySelector<HTMLElement>(`.eq[data-slot="${slot}"]`);
      if (!el) continue;

      const item = eq[slot];
      if (!item) {
        el.className = `eq eq-${slot}`;
        const typeImg = el.querySelector<HTMLImageElement>(".ico.type");
        if (typeImg) typeImg.style.display = "block";
        const oldItemImg = el.querySelector(".ico.item");
        if (oldItemImg) oldItemImg.remove();
        const oldP = el.querySelector(".p");
        if (oldP) oldP.remove();
        el.onclick = null;
        continue;
      }

      el.className = `eq eq-${slot} has r-${item.rarity}`;
      const typeImg = el.querySelector<HTMLImageElement>(".ico.type");
      if (typeImg) typeImg.style.display = "none";

      let itemImg = el.querySelector<HTMLImageElement>(".ico.item");
      if (!itemImg) {
        itemImg = document.createElement("img");
        itemImg.className = "ico item";
        el.appendChild(itemImg);
      }
      itemImg.src = item.icon || "/assets/icons/items/espada_curta.svg";
      itemImg.alt = item.name;

      let p = el.querySelector<HTMLElement>(".p");
      if (item.refine > 0) {
        if (!p) {
          p = document.createElement("span");
          p.className = "p";
          el.appendChild(p);
        }
        p.textContent = `+${item.refine}`;
      } else if (p) {
        p.remove();
      }

      el.onmouseenter = () => {
        ctx.showItemTip(el, item);
      };
      el.onmouseleave = () => {
        ctx.hideItemTip();
      };

      el.onclick = () => {
        if (trashModeActive) {
          ctx.openConfirm({
            title: "Descartar",
            msg: `Deseja descartar <b>${item.name}${item.refine > 0 ? " +" + item.refine : ""}</b>?`,
            yesLabel: "Descartar",
            onYes: () => {
              ctx.api.discardEquipped(slot);
              ctx.syncFromGame();
            },
          });
        } else {
          ctx.api.unequipSlot(slot);
          ctx.syncFromGame();
        }
      };
    }
  }

  function renderBag(): void {
    const win = container.querySelector<HTMLElement>("#p-inv");
    if (!win) return;

    const inv = ctx.api.snapshotInventory();
    const bagEl = win.querySelector<HTMLElement>("#bag");
    const countEl = win.querySelector<HTMLElement>("#bagCount");
    if (!bagEl) return;

    if (countEl) countEl.textContent = `${inv.usedSlots} / ${inv.capacity}`;

    const pageSize = 40;
    const startIndex = curBagPage * pageSize;
    const pageItems = inv.items.slice(startIndex, startIndex + pageSize);

    let html = "";
    for (let i = 0; i < pageSize; i++) {
      const it = pageItems[i];
      if (!it) {
        html += `<div class="cell empty" data-cell="${i}"></div>`;
        continue;
      }
      const refine = it.refine > 0 ? `<span class="p">+${it.refine}</span>` : "";
      const stack = it.stack > 1 ? `<span class="p">${it.stack}</span>` : "";
      html += `
        <div class="cell has r-${it.rarity}" data-uid="${it.uid}">
          <img class="ico" src="${it.icon || "/assets/icons/items/potion.svg"}" alt="${it.name}">
          ${refine || stack}
        </div>
      `;
    }

    bagEl.innerHTML = html;

    bagEl.querySelectorAll<HTMLElement>(".cell.has[data-uid]").forEach((cell) => {
      const uid = cell.dataset.uid!;
      const it = inv.items.find((i) => i.uid === uid);
      if (!it) return;

      cell.addEventListener("mouseenter", () => {
        const isShopOpen = !container.querySelector("#p-shop")?.classList.contains("is-closed");
        let actHtml = "";
        if (isShopOpen) {
          actHtml = `<button type="button" class="inv-tool sort" id="btn-tip-sell" style="margin-top:6px;width:100%">Vender (${(it.sellValue * it.stack).toLocaleString("pt-BR")} o)</button>`;
        }
        ctx.showItemTip(cell, it, actHtml);

        const sellBtn = container.querySelector<HTMLButtonElement>("#btn-tip-sell");
        sellBtn?.addEventListener("click", () => {
          ctx.hideItemTip();
          ctx.openConfirm({
            title: "Vender Item",
            msg: `Deseja vender <b>${it.name}</b> por ${(it.sellValue * it.stack).toLocaleString("pt-BR")} ouro?`,
            yesLabel: "Vender",
            onYes: () => {
              ctx.api.sellItem(it.uid, it.stack);
              ctx.syncFromGame();
            },
          });
        });
      });

      cell.addEventListener("mouseleave", () => {
        ctx.hideItemTip();
      });

      cell.addEventListener("click", () => {
        if (trashModeActive) {
          ctx.openConfirm({
            title: "Descartar",
            msg: `Deseja descartar <b>${it.name}${it.refine > 0 ? " +" + it.refine : ""}</b>?`,
            yesLabel: "Descartar",
            onYes: () => {
              ctx.api.discardItem(it.uid);
              ctx.syncFromGame();
            },
          });
          return;
        }

        const isVaultOpen = !container.querySelector("#p-vault")?.classList.contains("is-closed");
        if (isVaultOpen) {
          ctx.api.moveToVault(it.uid);
          ctx.syncFromGame();
          return;
        }

        if (it.slot === "material" || it.slot === "misc" || it.slot === "entry") {
          ctx.api.useConsumable(it.uid);
          ctx.syncFromGame();
        } else {
          ctx.api.equipUid(it.uid);
          ctx.syncFromGame();
        }
      });
    });
  }

  function sync(view: CharacterViewModel | null): void {
    const win = container.querySelector<HTMLElement>("#p-inv");
    if (!win) return;

    const charView = view || ctx.api.getCharacterViewModel();
    const portraitImg = win.querySelector<HTMLImageElement>("#charPortraitImg");
    if (portraitImg && charView.classId) {
      portraitImg.src = CLASS_PORTRAIT[charView.classId] || "/assets/class/char-tk.png";
    }

    const goldEl = win.querySelector<HTMLElement>("#playerGold");
    if (goldEl) {
      goldEl.textContent = (ctx.api.snapshotInventory().gold || 0).toLocaleString("pt-BR");
    }

    renderDoll();
    renderBag();
  }

  return {
    renderHtml,
    bindEvents,
    sync,
    setVaultOpen,
  };
}
