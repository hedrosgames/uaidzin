import type { CharacterViewModel } from "../../persistence/SaveTypes";
import type { AttributeName, TreeId } from "../WireApi";
import type { WireContext } from "./types";

const CLASS_FACE: Record<string, string> = {
  TK: "/assets/class/face-tk.png",
  FM: "/assets/class/face-fm.png",
  BM: "/assets/class/face-bm.png",
  HT: "/assets/class/face-ht.png",
};

export interface PersonPanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(view: CharacterViewModel | null): void;
}

export function createPersonPanel(container: HTMLElement, ctx: WireContext): PersonPanel {
  let activeHoldTimer: number | null = null;
  let activeHoldInterval: number | null = null;

  function renderHtml(): string {
    return `
<section class="win" id="p-person">
  <div class="win-h">Personagem <span class="x" data-close="person">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b">
      <div class="face-row">
        <div class="face"><img id="personFaceImg" src="/assets/class/face-tk.png" alt=""></div>
        <div style="flex:1">
          <div class="row"><span class="lab">Nome</span><span class="val" data-bind="name">—</span></div>
          <div class="row"><span class="lab">Classe</span><span class="val gold" data-bind="class">—</span></div>
          <div class="row"><span class="lab">Resets</span><span class="val" data-bind="resets">0</span></div>
          <div class="row"><span class="lab">Nível</span><span class="val gold" id="personLevelVal" data-bind="level">1</span></div>
          <div class="row"><span class="lab">Evolução</span><span class="val gold" data-bind="evolution">Mortal</span></div>
        </div>
      </div>

      <div class="bar hp" id="personHpBar"><i></i><span id="personHpText">100 / 100</span></div>
      <div class="bar mp" id="personMpBar"><i></i><span id="personMpText">50 / 50</span></div>
      <div class="bar" id="personXpBar"><i></i><span id="personXpText">0 / 100</span></div>

      <div style="display:flex;gap:6px;margin:6px 0">
        <button type="button" class="inv-tool sort" id="btn-person-reset" style="flex:1">Resetar</button>
        <button type="button" class="inv-tool sort" id="btn-person-evolve" style="flex:1">Evoluir</button>
      </div>

      <div class="sep"></div>
      <div class="sub">Atributos</div>
      <div class="attrs" id="attr-list">
        <div class="attr" data-attr="FOR"><span>FOR</span><b>10</b><button type="button" class="plus" data-plus="FOR">+</button></div>
        <div class="attr" data-attr="DES"><span>DES</span><b>10</b><button type="button" class="plus" data-plus="DES">+</button></div>
        <div class="attr" data-attr="CONS"><span>CON</span><b>10</b><button type="button" class="plus" data-plus="CONS">+</button></div>
        <div class="attr" data-attr="INT"><span>INT</span><b>10</b><button type="button" class="plus" data-plus="INT">+</button></div>
      </div>
      <div class="row" style="margin-top:4px"><span class="lab">Pontos de atributo</span><span class="val gold" id="attr-pts" data-bind="attrPts">0</span></div>

      <div class="sep"></div>
      <div class="sub">Especialização</div>
      <div class="spend-list" id="spec-spend">
        <div class="spend-row" data-tree="fisica"><span class="lab">Caça</span><span class="num">0</span><button type="button" class="plus" data-spec-plus="fisica">+</button></div>
        <div class="spend-row" data-tree="controle"><span class="lab">Armadilha</span><span class="num">0</span><button type="button" class="plus" data-spec-plus="controle">+</button></div>
        <div class="spend-row" data-tree="magia"><span class="lab">Marca</span><span class="num">0</span><button type="button" class="plus" data-spec-plus="magia">+</button></div>
        <div class="spend-row pts"><span class="lab">Pontos</span><span class="num" id="spec-pts" data-bind="specPts">0</span></div>
      </div>

      <div class="sep"></div>
      <div class="sub">Combate</div>
      <div class="combat">
        <div class="row"><span class="lab">Ataque</span><span class="val" data-bind="atk">10</span></div>
        <div class="row"><span class="lab">Defesa</span><span class="val" data-bind="def">0</span></div>
        <div class="row"><span class="lab">Crítico</span><span class="val" data-bind="crit">5%</span></div>
        <div class="row"><span class="lab">Velocidade</span><span class="val" data-bind="speed">1.0</span></div>
      </div>

      <div class="power-frame" id="power-frame" style="margin-top:8px;text-align:center;padding:4px;border:1px solid #4a3a28;background:rgba(0,0,0,.4)">
        <span class="lab" style="font-size:11px">Poder Estimado: </span>
        <span class="power-val gold" id="char-power" style="font-weight:700;font-size:14px">0</span>
      </div>
    </div>
  </div>
</section>
`;
  }

  function bindHoldPlus(btn: HTMLElement, onPulse: () => boolean): void {
    function stop(): void {
      if (activeHoldTimer !== null) {
        window.clearTimeout(activeHoldTimer);
        activeHoldTimer = null;
      }
      if (activeHoldInterval !== null) {
        window.clearInterval(activeHoldInterval);
        activeHoldInterval = null;
      }
    }

    btn.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (!onPulse()) return;
      stop();
      activeHoldTimer = window.setTimeout(() => {
        activeHoldInterval = window.setInterval(() => {
          if (!onPulse()) stop();
        }, 60);
      }, 350);
    });

    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("pointerleave", stop);
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-person");
    if (!win) return;

    win.querySelector("[data-close='person']")?.addEventListener("click", () => {
      ctx.closePanel("person");
    });

    const resetBtn = win.querySelector<HTMLButtonElement>("#btn-person-reset");
    resetBtn?.addEventListener("click", () => {
      if (!ctx.api.canReset()) return;
      ctx.openConfirm({
        title: "Reset",
        msg: "Deseja realizar o Reset? Seu personagem voltará ao nível 1 mantendo pontos bônus.",
        yesLabel: "Resetar",
        onYes: () => {
          const ok = ctx.api.tryReset();
          if (ok) {
            ctx.syncFromGame();
          }
        },
      });
    });

    const evolveBtn = win.querySelector<HTMLButtonElement>("#btn-person-evolve");
    evolveBtn?.addEventListener("click", () => {
      if (!ctx.api.canEvolve()) return;
      ctx.openConfirm({
        title: "Evolução",
        msg: "Deseja avançar para o próximo estágio de evolução?",
        yesLabel: "Evoluir",
        onYes: () => {
          const res = ctx.api.tryEvolve();
          if (res.ok) {
            ctx.syncFromGame();
          }
        },
      });
    });

    win.querySelectorAll<HTMLButtonElement>(".plus[data-plus]").forEach((btn) => {
      const attr = btn.dataset.plus as AttributeName;
      if (!attr) return;
      bindHoldPlus(btn, () => {
        const ok = ctx.api.spendAttribute(attr);
        if (ok) {
          ctx.syncFromGame();
        }
        return ok;
      });
    });

    win.querySelectorAll<HTMLButtonElement>(".plus[data-spec-plus]").forEach((btn) => {
      const tree = btn.dataset.specPlus as TreeId;
      if (!tree) return;
      bindHoldPlus(btn, () => {
        const ok = ctx.api.spendSpec(tree);
        if (ok) {
          ctx.syncFromGame();
        }
        return ok;
      });
    });
  }

  function calcPower(view: CharacterViewModel | null): number {
    const stats = view || ctx.api.getCharacterViewModel();
    if (!stats) return 0;
    let power = 0;
    power += (stats.level || 1) * 50;
    power += (stats.attack || 0) * 10;
    power += (stats.defense || 0) * 8;
    power += (stats.attrs?.FOR || 0) * 5;
    power += (stats.attrs?.DES || 0) * 5;
    power += (stats.attrs?.CONS || 0) * 5;
    power += (stats.attrs?.INT || 0) * 5;
    return Math.floor(power);
  }

  function sync(view: CharacterViewModel | null): void {
    const win = container.querySelector<HTMLElement>("#p-person");
    if (!win) return;

    const stats = view || ctx.api.getCharacterViewModel();

    const faceImg = win.querySelector<HTMLImageElement>("#personFaceImg");
    if (faceImg && stats.classId) {
      faceImg.src = CLASS_FACE[stats.classId] || "/assets/class/face-tk.png";
    }

    const nameEl = win.querySelector("[data-bind='name']");
    if (nameEl) nameEl.textContent = stats.name || "—";

    const classEl = win.querySelector("[data-bind='class']");
    if (classEl) classEl.textContent = stats.classId || "—";

    const resetsEl = win.querySelector("[data-bind='resets']");
    if (resetsEl) resetsEl.textContent = String(stats.resets || 0);

    const levelEl = win.querySelector<HTMLElement>("#personLevelVal");
    if (levelEl) {
      if (ctx.api.isMaxLevel()) {
        levelEl.textContent = "MAX";
      } else {
        levelEl.textContent = String(stats.level || 1);
      }
    }

    const evoEl = win.querySelector("[data-bind='evolution']");
    if (evoEl) evoEl.textContent = stats.evolution || "Mortal";

    const resetBtn = win.querySelector<HTMLButtonElement>("#btn-person-reset");
    if (resetBtn) {
      resetBtn.disabled = !ctx.api.canReset();
    }

    const evolveBtn = win.querySelector<HTMLButtonElement>("#btn-person-evolve");
    if (evolveBtn) {
      evolveBtn.disabled = !ctx.api.canEvolve();
    }

    const hpBar = win.querySelector<HTMLElement>("#personHpBar > i");
    const hpText = win.querySelector<HTMLElement>("#personHpText");
    if (hpBar && hpText) {
      const maxHp = stats.maxHp || 100;
      const curHp = stats.hp || maxHp;
      const pct = Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100)));
      hpBar.style.width = `${pct}%`;
      hpText.textContent = `${curHp} / ${maxHp}`;
    }

    const mpBar = win.querySelector<HTMLElement>("#personMpBar > i");
    const mpText = win.querySelector<HTMLElement>("#personMpText");
    if (mpBar && mpText) {
      const maxMp = stats.maxMp || 50;
      const curMp = stats.mp || maxMp;
      const pct = Math.max(0, Math.min(100, Math.round((curMp / maxMp) * 100)));
      mpBar.style.width = `${pct}%`;
      mpText.textContent = `${curMp} / ${maxMp}`;
    }

    const xpBar = win.querySelector<HTMLElement>("#personXpBar > i");
    const xpText = win.querySelector<HTMLElement>("#personXpText");
    if (xpBar && xpText) {
      const xpToNext = stats.xpToNext || 100;
      const curXp = stats.xp || 0;
      const pct = Math.max(0, Math.min(100, Math.round((curXp / xpToNext) * 100)));
      xpBar.style.width = `${pct}%`;
      xpText.textContent = `${curXp} / ${xpToNext}`;
    }

    const attrPts = stats.attrPts || 0;
    const attrPtsEl = win.querySelector<HTMLElement>("#attr-pts");
    if (attrPtsEl) attrPtsEl.textContent = String(attrPts);

    const attrs = stats.attrs || { FOR: 10, DES: 10, CONS: 10, INT: 10 };
    for (const attr of ["FOR", "DES", "CONS", "INT"] as const) {
      const row = win.querySelector<HTMLElement>(`.attr[data-attr="${attr}"]`);
      if (!row) continue;
      const b = row.querySelector("b");
      if (b) b.textContent = String(attrs[attr] || 0);
      const btn = row.querySelector<HTMLButtonElement>(".plus");
      if (btn) btn.classList.toggle("is-off", attrPts <= 0);
    }

    const specPts = stats.specPts || 0;
    const specPtsEl = win.querySelector<HTMLElement>("#spec-pts");
    if (specPtsEl) specPtsEl.textContent = String(specPts);

    const spec = stats.spec || { fisica: 0, controle: 0, magia: 0 };
    for (const tree of ["fisica", "controle", "magia"] as const) {
      const row = win.querySelector<HTMLElement>(`.spend-row[data-tree="${tree}"]`);
      if (!row) continue;
      const num = row.querySelector(".num");
      if (num) num.textContent = String(spec[tree] || 0);
      const btn = row.querySelector<HTMLButtonElement>(".plus");
      if (btn) btn.classList.toggle("is-off", specPts <= 0);
    }

    const atkEl = win.querySelector("[data-bind='atk']");
    if (atkEl) atkEl.textContent = String(stats.attack || 0);

    const defEl = win.querySelector("[data-bind='def']");
    if (defEl) defEl.textContent = String(stats.defense || 0);

    const powerEl = win.querySelector<HTMLElement>("#char-power");
    if (powerEl) {
      powerEl.textContent = String(calcPower(view));
    }
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
