import type { WireContext } from "./types";

export interface ComposerPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

export function createComposerPanel(container: HTMLElement, ctx: WireContext): ComposerPanel {
  let activeRecipeId = "compose_plus7_lac";

  function renderHtml(): string {
    return `
<section class="win is-closed" id="p-composer">
  <div class="win-h"><span id="composerTitle">Compositor</span> <span class="x" data-close="composer">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b compose-body" id="composeBody">
      <div class="compose-catalog" id="composeCatalog"></div>
      <div class="compose-work" id="composeWork" style="display:flex;flex-direction:column;gap:8px">
        <div class="compose-bench" id="composeBench"></div>
      </div>
    </div>
  </div>
</section>
`;
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-composer");
    if (!win) return;

    win.querySelector("[data-close='composer']")?.addEventListener("click", () => {
      ctx.closePanel("composer");
    });
  }

  function renderBench(): void {
    const benchEl = container.querySelector<HTMLElement>("#composeBench");
    if (!benchEl) return;

    const recipes = [
      {
        id: "plus7_lac",
        recipeId: "compose_plus7_lac",
        title: "Refino +7 (Lac)",
        desc: "Combina equipamento com Poeira de Lac para tentar alcançar refino +7.",
        costGold: 1000000,
        mat: "mat_lac",
      },
    ];

    const rec = recipes.find((r) => r.recipeId === activeRecipeId) || recipes[0];
    const inv = ctx.api.snapshotInventory();
    const canAfford = inv.gold >= rec.costGold;

    benchEl.innerHTML = `
      <div class="ttl" style="font-weight:700;color:var(--gold-hi)">${rec.title}</div>
      <div class="desc" style="font-size:12px;color:var(--ink-dim);margin:4px 0">${rec.desc}</div>
      <div class="cost-row" style="display:flex;justify-content:space-between;margin:6px 0">
        <span class="lab">Custo Ouro</span>
        <span class="val ${canAfford ? "" : "is-bad"}">${rec.costGold.toLocaleString("pt-BR")} o</span>
      </div>
      <button type="button" class="inv-tool sort" id="btnDoCompose" ${canAfford ? "" : "disabled"} style="width:100%;margin-top:6px">Compôr</button>
    `;

    benchEl.querySelector<HTMLButtonElement>("#btnDoCompose")?.addEventListener("click", () => {
      const eligible = ctx.api.listEligible(rec.recipeId);
      if (eligible.length > 0) {
        ctx.api.compose(rec.recipeId, eligible[0].uid);
        ctx.syncFromGame();
      }
    });
  }

  function sync(): void {
    const win = container.querySelector<HTMLElement>("#p-composer");
    if (!win) return;

    const catalogEl = win.querySelector<HTMLElement>("#composeCatalog");
    if (!catalogEl) return;

    const recipes = [
      {
        id: "plus7_lac",
        recipeId: "compose_plus7_lac",
        title: "Refino +7 (Lac)",
        desc: "Tentativa de elevação até +7 com Poeira de Lac.",
      },
    ];

    let html = "";
    for (const r of recipes) {
      const isSel = r.recipeId === activeRecipeId ? " is-on" : "";
      html += `
        <div class="compose-card${isSel}" data-recipe-id="${r.recipeId}" style="cursor:pointer;padding:8px">
          <div class="ttl" style="font-weight:700;color:var(--gold-hi)">+7</div>
          <div class="nm" style="font-weight:700">${r.title}</div>
          <div class="desc" style="font-size:11px;color:var(--ink-dim);margin-top:4px">${r.desc}</div>
        </div>
      `;
    }

    catalogEl.innerHTML = html;

    catalogEl.querySelectorAll<HTMLElement>(".compose-card[data-recipe-id]").forEach((card) => {
      card.addEventListener("click", () => {
        activeRecipeId = card.dataset.recipeId || "compose_plus7_lac";
        catalogEl.querySelectorAll(".compose-card").forEach((c) => c.classList.remove("is-on"));
        card.classList.add("is-on");
        renderBench();
      });
    });

    renderBench();
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
