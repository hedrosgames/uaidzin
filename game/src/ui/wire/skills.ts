import type { WireSkillRow } from "../WireApi";
import type { WireContext } from "./types";

export interface SkillsPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

export function createSkillsPanel(container: HTMLElement, ctx: WireContext): SkillsPanel {
  function renderHtml(): string {
    return `
<section class="win" id="p-skills">
  <div class="win-h">Habilidades <span class="x" data-close="skills">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <div class="row"><span class="lab">8ª árvore</span> <span class="val gold" id="eighthTreeVal">Caça</span></div>
        <div class="row"><span class="lab">Pontos de skill</span> <span class="val gold" id="skillPtsVal">0</span></div>
      </div>
      <div class="skills-trees" id="skillsTrees"></div>
    </div>
  </div>
</section>
`;
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-skills");
    if (!win) return;

    win.querySelector("[data-close='skills']")?.addEventListener("click", () => {
      ctx.closePanel("skills");
    });

    win.addEventListener("mouseleave", () => {
      ctx.hideSkillTip();
    });
  }

  function sync(): void {
    const win = container.querySelector<HTMLElement>("#p-skills");
    if (!win) return;

    const catalog = ctx.api.pullSkillCatalog();
    const treesContainer = win.querySelector<HTMLElement>("#skillsTrees");
    if (!treesContainer) return;

    const treeNames: Record<string, string> = {
      fisica: catalog.treeLabels?.fisica || "Física",
      controle: catalog.treeLabels?.controle || "Controle",
      magia: catalog.treeLabels?.magia || "Magia",
      livro: catalog.treeLabels?.livro || "Livros",
    };

    const eighthVal = win.querySelector<HTMLElement>("#eighthTreeVal");
    if (eighthVal) eighthVal.textContent = catalog.eighthTree ? treeNames[catalog.eighthTree] || catalog.eighthTree : treeNames.fisica;

    const ptsVal = win.querySelector<HTMLElement>("#skillPtsVal");
    if (ptsVal) ptsVal.textContent = String(catalog.skillPoints || 0);

    let html = "";
    for (const treeId of catalog.trees ?? (["fisica", "controle", "magia"] as const)) {
      const skillsInTree: WireSkillRow[] = [];
      for (let i = 0; i < 12; i++) {
        const id = `${treeId}-${i + 1}`;
        if (catalog.skills[id]) {
          skillsInTree.push(catalog.skills[id]!);
        }
      }

      html += `<div class="tree-block" data-tree="${treeId}">`;
      html += `<div class="tree-h"><span>${treeNames[treeId]}</span></div>`;
      html += `<div class="slots s12">`;
      for (let i = 0; i < 12; i++) {
        const sk = skillsInTree[i];
        if (!sk) {
          html += `<div class="slot empty"></div>`;
          continue;
        }
        const isCap = i === 11 ? " capstone" : "";
        const isOn = sk.learned ? " on" : " empty";
        html += `
          <div class="slot${isOn}${isCap}" data-skill-id="${sk.id}" data-tree="${sk.tree}" data-index="${sk.idx}">
            <img class="ico" src="${sk.icon}" alt="${sk.name}">
          </div>
        `;
      }
      html += `</div></div>`;
    }

    treesContainer.innerHTML = html;

    treesContainer.querySelectorAll<HTMLElement>(".slot[data-skill-id]").forEach((slotEl) => {
      const skillId = slotEl.dataset.skillId!;
      const sk = catalog.skills[skillId];
      if (!sk) return;

      slotEl.addEventListener("mouseenter", () => {
        const meta: Record<string, string> = {};
        if (sk.passive) {
          meta["Tipo"] = "Passiva · não vai para a barra";
        } else {
          if (sk.cd) meta["Recarga"] = `${sk.cd}s`;
          if (sk.mp) meta["Custo Mana"] = String(sk.mp);
        }
        if (sk.learned) meta["Estado"] = "Aprendida";
        else meta["Estado"] = "Não aprendida";
        const treeLabel = (treeNames as Record<string, string>)[sk.tree] || sk.tree;
        ctx.showSkillTip(slotEl, sk.name, treeLabel, meta, sk.desc || "", sk.icon);
      });

      slotEl.addEventListener("mouseleave", () => {
        ctx.hideSkillTip();
      });

      if (sk.learned && !sk.passive) {
        slotEl.setAttribute("draggable", "true");
        slotEl.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData(
            "text/plain",
            JSON.stringify({ kind: "skill", skillId: sk.skillId || sk.id }),
          );
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
        });
      }
    });
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
