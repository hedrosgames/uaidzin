import type { WireSkillRow } from "../WireApi";
import type { WireContext } from "./types";

export interface SkillMasterPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

export function createSkillMasterPanel(container: HTMLElement, ctx: WireContext): SkillMasterPanel {
  let selectedSkillId: string | null = null;

  function renderHtml(): string {
    return `
<section class="win is-closed" id="p-skillmaster">
  <div class="win-h">Mestre de Habilidades <span class="x" data-close="skillmaster">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b">
      <div class="sm-body">
        <div class="sm-trees" id="smTrees"></div>
        <div class="sm-detail" id="smDetail">
          <div class="sm-detail-empty">Selecione uma habilidade para treinar.</div>
        </div>
      </div>
    </div>
  </div>
</section>
`;
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-skillmaster");
    if (!win) return;

    win.querySelector("[data-close='skillmaster']")?.addEventListener("click", () => {
      ctx.closePanel("skillmaster");
    });
  }

  function renderDetail(sk: WireSkillRow | null): void {
    const detailEl = container.querySelector<HTMLElement>("#smDetail");
    if (!detailEl) return;
    if (!sk) {
      detailEl.innerHTML = `<div class="sm-detail-empty">Selecione uma habilidade para treinar.</div>`;
      return;
    }

    const catalog = ctx.api.pullSkillCatalog();
    const goldCost = ctx.api.skillGoldCost(sk.idx);
    const gold = ctx.api.snapshotInventory().gold;
    const pointsCost = ctx.api.skillPointsCost();
    const hasPoints = (catalog.skillPoints ?? 0) >= pointsCost;
    const canAffordGold = gold >= goldCost;
    const eighthLocked = sk.idx === 7 && Boolean(catalog.eighthTree && catalog.eighthTree !== sk.tree);
    const prereqLearned = sk.idx === 0 || Boolean(catalog.skills[`${sk.tree}-${sk.idx}`]?.learned);
    const isLivro = sk.tree === "livro";
    const canBuy = !isLivro && !sk.learned && hasPoints && canAffordGold && prereqLearned && !eighthLocked;

    let btnHtml = "";
    if (sk.learned) {
      btnHtml = `<button type="button" class="inv-tool" disabled style="width:100%;margin-top:6px">Aprendida</button>`;
    } else if (isLivro) {
      btnHtml = `<button type="button" class="inv-tool" disabled style="width:100%;margin-top:6px">Use o livro no inventário</button>`;
    } else {
      btnHtml = `<button type="button" class="inv-tool sort" id="btnBuySkill" ${canBuy ? "" : "disabled"} style="width:100%;margin-top:6px">Comprar</button>`;
    }

    let metaHtml = "";
    if (sk.passive) {
      metaHtml = `<div class="sub gold" style="color:var(--gold-bright)">Passiva · não vai para a barra</div>`;
    } else {
      const parts: string[] = [];
      if (sk.cd) parts.push(`Recarga: ${sk.cd}s`);
      if (sk.mp) parts.push(`MP: ${sk.mp}`);
      if (parts.length) metaHtml = `<div class="sub">${parts.join(" · ")}</div>`;
    }

    const treeLabel = catalog.treeLabels?.[sk.tree] || sk.tree;

    detailEl.innerHTML = `
      <div class="sm-detail-info">
        <div class="ttl">${sk.name}</div>
        <div class="sub">${treeLabel} · Slot ${sk.idx + 1}</div>
        ${metaHtml}
        <div class="desc">${sk.desc || ""}</div>
      </div>
      <div class="sm-detail-bottom">
        <div class="cost-rows">
          <div class="cost-row ${!hasPoints && !sk.learned ? "is-bad" : ""}">
            <span class="lab">Pontos de Skill</span>
            <span class="val">${pointsCost}</span>
          </div>
          <div class="cost-row ${!canAffordGold && !sk.learned ? "is-bad" : ""}">
            <span class="lab">Custo em Ouro</span>
            <span class="val">${goldCost.toLocaleString("pt-BR")}</span>
          </div>
        </div>
        ${btnHtml}
      </div>
    `;

    detailEl.querySelector<HTMLButtonElement>("#btnBuySkill")?.addEventListener("click", () => {
      const ok = ctx.api.learnSkill(sk.tree, sk.idx);
      if (ok) {
        ctx.syncFromGame();
      }
    });
  }

  function sync(): void {
    const win = container.querySelector<HTMLElement>("#p-skillmaster");
    if (!win) return;

    const catalog = ctx.api.pullSkillCatalog();
    const treesContainer = win.querySelector<HTMLElement>("#smTrees");
    if (!treesContainer) return;

    const treeNames: Record<string, string> = {
      fisica: catalog.treeLabels?.fisica || "Física",
      controle: catalog.treeLabels?.controle || "Controle",
      magia: catalog.treeLabels?.magia || "Magia",
      livro: catalog.treeLabels?.livro || "Livros",
    };

    let html = "";
    for (const treeId of catalog.trees ?? (["fisica", "controle", "magia"] as const)) {
      html += `<div class="tree-block" data-tree="${treeId}">`;
      html += `<div class="tree-h"><span>${treeNames[treeId]}</span></div>`;
      html += `<div class="sm-slots">`;

      for (let i = 0; i < 12; i++) {
        const id = `${treeId}-${i + 1}`;
        const sk = catalog.skills[id];
        if (!sk) {
          html += `<div class="sm-slot locked"></div>`;
          continue;
        }

        const prereqLearned = i === 0 || Boolean(catalog.skills[`${treeId}-${i}`]?.learned);
        let stateCls = "locked";
        if (sk.learned) stateCls = "owned";
        else if (prereqLearned) stateCls = "can";

        const isSel = selectedSkillId === id ? " is-on" : "";
        const isCap = i === 11 ? " capstone" : "";

        html += `
          <div class="sm-slot ${stateCls}${isSel}${isCap}" data-skill-id="${sk.id}" title="${sk.name}">
            <img class="ico" src="${sk.icon}" alt="${sk.name}">
          </div>
        `;
      }
      html += `</div></div>`;
    }

    treesContainer.innerHTML = html;

    treesContainer.querySelectorAll<HTMLElement>(".sm-slot[data-skill-id]").forEach((slotEl) => {
      const id = slotEl.dataset.skillId!;
      slotEl.addEventListener("click", () => {
        selectedSkillId = id;
        treesContainer.querySelectorAll(".sm-slot").forEach((s) => s.classList.remove("is-on"));
        slotEl.classList.add("is-on");
        renderDetail(catalog.skills[id] || null);
      });
    });

    if (selectedSkillId && catalog.skills[selectedSkillId]) {
      renderDetail(catalog.skills[selectedSkillId]);
    }
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
