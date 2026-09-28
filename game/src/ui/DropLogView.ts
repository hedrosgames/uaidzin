import type { DropLogEntry, DropLogKind } from "./HudModel";

const TAG_LABELS: Record<DropLogKind, string> = {
  gold: "ouro",
  item: "item",
  lost: "perda",
  info: "info",
};

export class DropLogView {
  private readonly lineElements = new Map<number, HTMLElement>();
  private lastIdsKey = "";

  constructor(private readonly element: HTMLElement) {}

  update(drops: DropLogEntry[]): void {
    if (drops.length === 0) {
      if (!this.element.hidden) {
        this.element.hidden = true;
        this.element.replaceChildren();
        this.lineElements.clear();
        this.lastIdsKey = "";
      }
      return;
    }

    const key = drops.map((d) => d.id).join(",");
    if (key === this.lastIdsKey) {
      this.element.hidden = false;
      return;
    }
    this.lastIdsKey = key;
    this.element.hidden = false;

    const currentIds = new Set(drops.map((d) => d.id));
    for (const [id, el] of this.lineElements) {
      if (!currentIds.has(id)) {
        el.remove();
        this.lineElements.delete(id);
      }
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i]!;
      let lineEl = this.lineElements.get(drop.id);
      if (!lineEl) {
        lineEl = document.createElement("div");
        lineEl.className = `drop-log-line ${drop.kind}`;
        lineEl.dataset.dropId = String(drop.id);

        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = TAG_LABELS[drop.kind] || "info";
        lineEl.appendChild(tag);

        const text = document.createElement("span");
        text.textContent = drop.text;
        lineEl.appendChild(text);

        this.lineElements.set(drop.id, lineEl);
      }
      this.element.appendChild(lineEl);
    }
  }
}
