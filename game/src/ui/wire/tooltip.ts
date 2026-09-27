import type { WireItem } from "../WireApi";

export interface TooltipManager {
  renderHtml(): string;
  showSkillTip(
    nearEl: HTMLElement,
    title: string,
    sub: string,
    meta: Record<string, string>,
    desc: string,
    iconSrc?: string,
  ): void;
  hideSkillTip(): void;
  showItemTip(nearEl: HTMLElement, item: WireItem, actsHtml?: string): void;
  hideItemTip(): void;
}

export function effectiveStats(it: WireItem): Record<string, number> {
  const stats: Record<string, number> = {};
  if (it.attackBonus) stats.atk = it.attackBonus;
  if (it.defenseBonus) stats.def = it.defenseBonus;
  const refine = Number(it.refine) || 0;
  if (refine > 0) {
    const slot = String(it.slot || "").toLowerCase();
    if (slot === "weapon") {
      stats.atk = (stats.atk || it.attackBonus || 0) + refine * 2;
    } else if (
      slot === "armor" ||
      slot === "head" ||
      slot === "ring" ||
      slot === "neck" ||
      slot === "ear" ||
      slot === "ring1" ||
      slot === "ring2"
    ) {
      stats.def = (stats.def || it.defenseBonus || 0) + refine * 1;
    }
  }
  return stats;
}

function statsHtml(st: Record<string, number>): string {
  const rows: string[] = [];
  if (st.atk) rows.push(`<div><span>Ataque</span><b>+${st.atk}</b></div>`);
  if (st.def) rows.push(`<div><span>Defesa</span><b>+${st.def}</b></div>`);
  if (st.str) rows.push(`<div><span>Força</span><b>+${st.str}</b></div>`);
  if (st.dex) rows.push(`<div><span>Destreza</span><b>+${st.dex}</b></div>`);
  if (st.con) rows.push(`<div><span>Constituição</span><b>+${st.con}</b></div>`);
  if (st.int) rows.push(`<div><span>Inteligência</span><b>+${st.int}</b></div>`);
  if (st.hp) rows.push(`<div><span>Vida Máxima</span><b>+${st.hp}</b></div>`);
  if (st.mp) rows.push(`<div><span>Mana Máxima</span><b>+${st.mp}</b></div>`);
  return rows.length ? `<div class="stats">${rows.join("")}</div>` : "";
}

function placeElement(tip: HTMLElement, nearEl: HTMLElement, width: number, height: number): void {
  const r = nearEl.getBoundingClientRect();
  const tw = tip.offsetWidth || width;
  const th = tip.offsetHeight || height;
  let x = r.right + 10;
  let y = r.top;
  if (x + tw > window.innerWidth - 12) {
    x = r.left - tw - 10;
  }
  if (y + th > window.innerHeight - 12) {
    y = window.innerHeight - th - 12;
  }
  if (x < 12) x = 12;
  if (y < 12) y = 12;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

export function createTooltipManager(container: HTMLElement): TooltipManager {
  function renderHtml(): string {
    return `
<div class="skill-tip" id="skillTip" role="tooltip"></div>
<div class="item-tip" id="itemTip" role="tooltip"></div>
`;
  }

  function showSkillTip(
    nearEl: HTMLElement,
    title: string,
    sub: string,
    meta: Record<string, string>,
    desc: string,
    iconSrc?: string,
  ): void {
    const tip = container.querySelector<HTMLElement>("#skillTip");
    if (!tip) return;
    const metaHtml = Object.entries(meta)
      .map(([k, v]) => `<div><span class="lab">${k}</span> <b>${v}</b></div>`)
      .join("");
    tip.innerHTML = `
      <div class="th">
        ${iconSrc ? `<img src="${iconSrc}" alt="">` : ""}
        <div>
          <div class="nm">${title}</div>
          <div class="tr">${sub}</div>
        </div>
      </div>
      <div class="meta">${metaHtml}</div>
      <p class="desc">${desc || ""}</p>
    `;
    tip.classList.add("is-on");
    placeElement(tip, nearEl, 280, 160);
  }

  function hideSkillTip(): void {
    const tip = container.querySelector<HTMLElement>("#skillTip");
    if (tip) {
      tip.classList.remove("is-on");
      tip.innerHTML = "";
    }
  }

  function showItemTip(nearEl: HTMLElement, item: WireItem, actsHtml?: string): void {
    const tip = container.querySelector<HTMLElement>("#itemTip");
    if (!tip) return;
    const refine = item.refine > 0 ? ` +${item.refine}` : "";
    const stats = effectiveStats(item);
    const sHtml = statsHtml(stats);
    tip.innerHTML = `
      <div class="th">
        ${item.icon ? `<img src="${item.icon}" alt="">` : ""}
        <div>
          <div class="nm r-${item.rarity}">${item.name}${refine}</div>
          <div class="subline">${item.rarity} · ${item.slot}</div>
        </div>
      </div>
      ${sHtml}
      ${item.desc ? `<p class="desc">${item.desc}</p>` : ""}
      ${actsHtml || ""}
    `;
    tip.classList.add("is-on");
    placeElement(tip, nearEl, 290, 180);
  }

  function hideItemTip(): void {
    const tip = container.querySelector<HTMLElement>("#itemTip");
    if (tip) {
      tip.classList.remove("is-on");
      tip.innerHTML = "";
    }
  }

  return {
    renderHtml,
    showSkillTip,
    hideSkillTip,
    showItemTip,
    hideItemTip,
  };
}
