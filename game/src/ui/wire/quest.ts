import type { WireQuestEntry } from "../WireApi";
import type { WireContext } from "./types";

export interface QuestPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

export function createQuestPanel(container: HTMLElement, ctx: WireContext): QuestPanel {
  let selectedQuestId: string | null = null;

  function renderHtml(): string {
    return `
<section class="win is-closed" id="p-quest">
  <div class="win-h">Missões <span class="x" data-close="quest">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b" style="display:flex;gap:10px">
      <div class="quest-list" id="questList" style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:4px"></div>
      <div class="quest-detail" id="questDetail" style="flex:1;border:1px solid #3a2e22;padding:8px">
        <div style="color:var(--ink-mute);font-size:12px">Selecione uma missão.</div>
      </div>
    </div>
  </div>
</section>
`;
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-quest");
    if (!win) return;

    win.querySelector("[data-close='quest']")?.addEventListener("click", () => {
      ctx.closePanel("quest");
    });
  }

  function renderDetail(q: WireQuestEntry | null): void {
    const detailEl = container.querySelector<HTMLElement>("#questDetail");
    if (!detailEl) return;
    if (!q) {
      detailEl.innerHTML = `<div style="color:var(--ink-mute);font-size:12px">Selecione uma missão.</div>`;
      return;
    }

    const isDone = q.status === "done";
    const statusLabel = isDone ? "Concluída" : q.status === "active" ? "Em andamento" : q.status === "available" ? "Disponível" : "Bloqueada";
    const statusColor = isDone ? "var(--r-incomum)" : q.status === "active" ? "var(--gold)" : "var(--ink-dim)";

    detailEl.innerHTML = `
      <div class="ttl" style="font-weight:700;color:var(--gold-hi);font-size:14px">${q.title}</div>
      <div style="font-size:11px;color:${statusColor};margin:4px 0">
        ${statusLabel}
      </div>
      <p style="font-size:12px;color:var(--ink);line-height:1.4">${q.objective || ""}</p>
      <div style="font-size:11px;color:var(--ink-dim);margin-top:8px">
        Progresso: ${q.step} / ${q.target}
      </div>
      <div style="font-size:11px;color:var(--gold);margin-top:4px">
        Recompensa: ${q.rewardGold} ouro, ${q.rewardXp} XP
      </div>
    `;
  }

  function sync(): void {
    const win = container.querySelector<HTMLElement>("#p-quest");
    if (!win) return;

    const listEl = win.querySelector<HTMLElement>("#questList");
    if (!listEl) return;

    const quests: WireQuestEntry[] = ctx.api.listQuests() || [];
    if (!quests.length) {
      listEl.innerHTML = `<div style="color:var(--ink-mute);font-size:12px;padding:8px">Nenhuma missão ativa.</div>`;
      renderDetail(null);
      return;
    }

    if (!selectedQuestId && quests.length > 0) {
      selectedQuestId = quests[0].id;
    }

    let html = "";
    for (const q of quests) {
      const isSel = q.id === selectedQuestId ? " is-on" : "";
      const isDone = q.status === "done";
      html += `
        <div class="shop-card${isSel}" data-quest-id="${q.id}" style="padding:6px;cursor:pointer;text-align:left">
          <div style="font-weight:700;font-size:12px;color:var(--ink)">${q.title}</div>
          <div style="font-size:11px;color:var(--ink-dim)">${isDone ? "Concluída" : q.status === "active" ? "Ativa" : "Disponível"}</div>
        </div>
      `;
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll<HTMLElement>(".shop-card[data-quest-id]").forEach((card) => {
      card.addEventListener("click", () => {
        selectedQuestId = card.dataset.questId || null;
        listEl.querySelectorAll(".shop-card").forEach((c) => c.classList.remove("is-on"));
        card.classList.add("is-on");
        const found = quests.find((q: WireQuestEntry) => q.id === selectedQuestId);
        renderDetail(found || null);
      });
    });

    if (selectedQuestId) {
      const found = quests.find((q: WireQuestEntry) => q.id === selectedQuestId);
      renderDetail(found || null);
    }
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
