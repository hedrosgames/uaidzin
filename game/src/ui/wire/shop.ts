import type { WireApi } from "../WireApi";
import type { WireContext } from "./types";

export function shopIconSrc(api: WireApi, defId: string, slot?: string, name?: string): string | null {
  const ico = api.resolveItemIcon(defId, slot, name);
  if (!ico) return null;
  return ico.startsWith("/") ? ico : `/assets/icons/${ico}`;
}

export interface ShopPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
  setShopId(shopId: string, title?: string): void;
  getShopId(): string;
}

export function createShopPanel(container: HTMLElement, ctx: WireContext): ShopPanel {
  let activeShopId = "merchant";
  let selectedSlotIndex: number | null = null;

  function renderHtml(): string {
    return `
<section class="win is-closed" id="p-shop">
  <div class="win-h"><span id="shopTitle">Mercador</span> <span class="x" data-close="shop">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b">
      <div class="shop-body">
        <div class="shop-grid" id="shopGrid"></div>
        <div class="shop-detail" id="shopDetail">
          <div class="shop-detail-empty">Selecione um item da loja.</div>
        </div>
      </div>
    </div>
  </div>
</section>
`;
  }

  function setShopId(shopId: string, title?: string): void {
    activeShopId = shopId === "blacksmith" ? "blacksmith" : "merchant";
    selectedSlotIndex = null;
    const titleEl = container.querySelector<HTMLElement>("#shopTitle");
    if (titleEl) {
      titleEl.textContent = title || (activeShopId === "blacksmith" ? "Ferreiro" : "Mercador");
    }
  }

  function getShopId(): string {
    return activeShopId;
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-shop");
    if (!win) return;

    win.querySelector("[data-close='shop']")?.addEventListener("click", () => {
      ctx.closePanel("shop");
    });
  }

  function renderDetail(): void {
    const detailEl = container.querySelector<HTMLElement>("#shopDetail");
    if (!detailEl) return;

    const catalog = ctx.api.getShopCatalog();
    const shop = catalog.shops[activeShopId] || catalog.shops["merchant"];
    if (!shop || selectedSlotIndex === null || !shop.slots[selectedSlotIndex]) {
      detailEl.innerHTML = `<div class="shop-detail-empty">Selecione um item da loja.</div>`;
      return;
    }

    const slot = shop.slots[selectedSlotIndex];
    const it = catalog.items[slot.itemId];
    if (!it) {
      detailEl.innerHTML = `<div class="shop-detail-empty">Item indisponível.</div>`;
      return;
    }

    const inv = ctx.api.snapshotInventory();
    const canAfford = inv.gold >= slot.price;

    detailEl.innerHTML = `
      <div class="ttl">${it.name}</div>
      <div class="sub">${it.rarity || "Comum"} · ${it.slot || "Item"}</div>
      <div class="desc">${it.desc || ""}</div>
      <div class="price-row">
        <span class="lab">Preço</span>
        <span class="val ${canAfford ? "" : "is-bad"}">${slot.price.toLocaleString("pt-BR")} o</span>
      </div>
      <button type="button" class="inv-tool sort" id="btnBuyShop" ${canAfford ? "" : "disabled"} style="width:100%;margin-top:6px">Comprar</button>
    `;

    detailEl.querySelector<HTMLButtonElement>("#btnBuyShop")?.addEventListener("click", () => {
      const res = ctx.api.buyShop(activeShopId, slot.itemId);
      if (res.ok) {
        ctx.syncFromGame();
      }
    });
  }

  function sync(): void {
    const win = container.querySelector<HTMLElement>("#p-shop");
    if (!win) return;

    const catalog = ctx.api.getShopCatalog();
    const shop = catalog.shops[activeShopId] || catalog.shops["merchant"];
    const gridEl = win.querySelector<HTMLElement>("#shopGrid");
    if (!gridEl || !shop) return;

    let html = "";
    shop.slots.forEach((slot: { itemId: string; price: number }, idx: number) => {
      const it = catalog.items[slot.itemId];
      if (!it) return;
      const ico = shopIconSrc(ctx.api, it.id, it.slot, it.name);
      if (!ico) return;

      const isSel = selectedSlotIndex === idx ? " is-on" : "";
      html += `
        <div class="shop-card r-${it.rarity || "Comum"}${isSel}" data-slot-index="${idx}">
          <div class="nm">${it.name}</div>
          <img class="ico" src="${ico}" alt="${it.name}">
          <div class="qty">${slot.price.toLocaleString("pt-BR")} o</div>
        </div>
      `;
    });

    gridEl.innerHTML = html;

    gridEl.querySelectorAll<HTMLElement>(".shop-card[data-slot-index]").forEach((card) => {
      const idx = Number(card.dataset.slotIndex);
      card.addEventListener("click", () => {
        selectedSlotIndex = idx;
        gridEl.querySelectorAll(".shop-card").forEach((c) => c.classList.remove("is-on"));
        card.classList.add("is-on");
        renderDetail();
      });
    });

    renderDetail();
  }

  return {
    renderHtml,
    bindEvents,
    sync,
    setShopId,
    getShopId,
  };
}
