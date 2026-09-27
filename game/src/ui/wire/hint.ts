import type { WireContext } from "./types";

export interface HintBar {
  renderHtml(): string;
  bindEvents(): void;
}

export function createHintBar(container: HTMLElement, ctx: WireContext): HintBar {
  function renderHtml(): string {
    return `
<div class="hint">
  <button type="button" data-hint="person"><kbd>C</kbd>Personagem</button><span class="sep">·</span>
  <button type="button" data-hint="skills"><kbd>K</kbd>Habilidades</button><span class="sep">·</span>
  <button type="button" data-hint="inv"><kbd>I</kbd>Inventário</button><span class="sep">·</span>
  <button type="button" data-hint="esc"><kbd>Esc</kbd>Fecha</button>
</div>
`;
  }

  function bindEvents(): void {
    const hintEl = container.querySelector<HTMLElement>(".hint");
    if (!hintEl) return;
    hintEl.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-hint]");
      if (!btn) return;
      const hint = btn.dataset.hint;
      if (hint === "person") ctx.togglePanel("person");
      else if (hint === "skills") ctx.togglePanel("skills");
      else if (hint === "inv") ctx.togglePanel("inv");
      else if (hint === "esc") ctx.closeAll();
    });
  }

  return {
    renderHtml,
    bindEvents,
  };
}
