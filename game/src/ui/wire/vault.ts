import type { WireContext } from "./types";

export interface VaultPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

export function createVaultPanel(container: HTMLElement, ctx: WireContext): VaultPanel {
  function renderHtml(): string {
    return `
<section class="win is-closed" id="p-vault">
  <div class="win-h">Cofre <span class="x" data-close="vault">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b">
      <div class="vault-money">
        <div class="box"><span class="lab">Ouro da Bolsa</span><span class="val" id="vaultPlayerGold">0</span></div>
        <div class="box"><span class="lab">Ouro no Cofre</span><span class="val" id="vaultBankGold">0</span></div>
      </div>
      <div class="vault-gold-ops">
        <input type="number" id="vaultGoldAmt" min="1" max="2000000000" step="1" value="1000" inputmode="numeric">
        <button type="button" class="dep" id="vaultDeposit">Depositar</button>
        <button type="button" class="wd" id="vaultWithdraw">Sacar</button>
      </div>

      <div class="bag-tabs" style="margin-bottom:6px">
        <button type="button" class="bag-tab on" data-vault-page="0">1</button>
        <span class="val" id="vaultCount">0 / 120</span>
      </div>

      <div class="bag-wrap" id="vaultWrap">
        <div class="vault-bag" id="vaultBag"></div>
      </div>

      <div class="vault-foot">
        <span class="count" id="vaultFootCount">0 / 120</span>
        <div class="goldline"><span class="lab">Cofre: </span><strong id="vaultFootGold" class="gold">0</strong></div>
      </div>
    </div>
  </div>
</section>
`;
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-vault");
    if (!win) return;

    win.querySelector("[data-close='vault']")?.addEventListener("click", () => {
      ctx.closePanel("vault");
    });

    win.querySelector<HTMLButtonElement>("#vaultDeposit")?.addEventListener("click", () => {
      const input = win.querySelector<HTMLInputElement>("#vaultGoldAmt");
      const amt = Math.floor(Number(input?.value) || 0);
      if (amt > 0) {
        ctx.api.depositGold(amt);
        ctx.syncFromGame();
      }
    });

    win.querySelector<HTMLButtonElement>("#vaultWithdraw")?.addEventListener("click", () => {
      const input = win.querySelector<HTMLInputElement>("#vaultGoldAmt");
      const amt = Math.floor(Number(input?.value) || 0);
      if (amt > 0) {
        ctx.api.withdrawGold(amt);
        ctx.syncFromGame();
      }
    });

    win.addEventListener("mouseleave", () => {
      ctx.hideItemTip();
    });
  }

  function renderVault(): void {
    const win = container.querySelector<HTMLElement>("#p-vault");
    if (!win) return;

    const vault = ctx.api.snapshotVault();
    const bagEl = win.querySelector<HTMLElement>("#vaultBag");
    const countEl = win.querySelector<HTMLElement>("#vaultCount");
    const footCountEl = win.querySelector<HTMLElement>("#vaultFootCount");
    if (!bagEl) return;

    const capacity = Math.max(1, vault.capacity || 120);
    const countText = `${vault.items.length} / ${capacity}`;
    if (countEl) countEl.textContent = countText;
    if (footCountEl) footCountEl.textContent = countText;

    let html = "";
    for (let i = 0; i < capacity; i++) {
      const it = vault.items[i];
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
      const it = vault.items.find((i) => i.uid === uid);
      if (!it) return;

      cell.addEventListener("mouseenter", () => {
        ctx.showItemTip(cell, it);
      });

      cell.addEventListener("mouseleave", () => {
        ctx.hideItemTip();
      });

      cell.addEventListener("click", () => {
        ctx.api.moveFromVault(it.uid);
        ctx.syncFromGame();
      });
    });
  }

  function sync(): void {
    const win = container.querySelector<HTMLElement>("#p-vault");
    if (!win) return;

    const inv = ctx.api.snapshotInventory();
    const vault = ctx.api.snapshotVault();

    const playerGoldEl = win.querySelector<HTMLElement>("#vaultPlayerGold");
    if (playerGoldEl) playerGoldEl.textContent = (inv.gold || 0).toLocaleString("pt-BR");

    const bankGoldEl = win.querySelector<HTMLElement>("#vaultBankGold");
    if (bankGoldEl) bankGoldEl.textContent = (vault.gold || 0).toLocaleString("pt-BR");

    const footGoldEl = win.querySelector<HTMLElement>("#vaultFootGold");
    if (footGoldEl) footGoldEl.textContent = (vault.gold || 0).toLocaleString("pt-BR");

    renderVault();
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
