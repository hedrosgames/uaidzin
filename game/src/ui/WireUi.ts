import type { CharacterViewModel } from "../persistence/SaveTypes";
import { bindWirePanels } from "./CharacterUiBinder";
import { resolveItemIcon, shopCatalogForUi, SKILL_TRAINING } from "../data/balance/economy";

export type WirePanelName =
  | "person"
  | "skills"
  | "inv"
  | "vault"
  | "shop"
  | "portal"
  | "skillmaster"
  | "sage"
  | "composer"
  | "quest";

const PANEL_IDS: Record<WirePanelName, string> = {
  person: "p-person",
  skills: "p-skills",
  inv: "p-inv",
  vault: "p-vault",
  shop: "p-shop",
  portal: "p-portal",
  skillmaster: "p-skillmaster",
  sage: "p-sage",
  composer: "p-composer",
  quest: "p-quest",
};

const MID_PANELS: WirePanelName[] = [
  "skills",
  "vault",
  "shop",
  "portal",
  "sage",
  "composer",
  "quest",
];

const RIGHT_PANELS: WirePanelName[] = ["inv", "skillmaster"];

const SOLO_PANELS: WirePanelName[] = ["quest", "portal", "composer", "sage"];
const WIRE_PANEL_NAMES = new Set<string>(Object.keys(PANEL_IDS));

export function isWirePanelName(name: string): name is WirePanelName {
  return WIRE_PANEL_NAMES.has(name);
}

const OVERLAY_CSS = `
#wire-ui{
  position:absolute;inset:0;z-index:12;pointer-events:none;overflow:hidden;
  background:transparent!important;margin:0!important;height:100%;width:100%;
}
#wire-ui .viewport{
  position:absolute;inset:0;background:transparent!important;
  display:flex;align-items:center;justify-content:center;
}
#wire-ui .stage{
  background:transparent!important;
  pointer-events:none;
}
#wire-ui .stage::before{display:none!important}
#wire-ui .wins{pointer-events:none}
#wire-ui .win:not(.is-closed){pointer-events:auto}
#wire-ui .hint,
#wire-ui .hud{pointer-events:auto}
#wire-ui .skill-tip,
#wire-ui .item-tip{pointer-events:none}
#wire-ui .confirm-layer{pointer-events:auto}
.drag-ghost{
  position:fixed;z-index:50;width:40px;height:40px;pointer-events:none;
  opacity:.9;transform:translate(-50%,-50%);
  filter:drop-shadow(0 4px 8px rgba(0,0,0,.6));
}
.drag-ghost img{width:100%;height:100%;display:block}
`;

function scopeCss(css: string, scope: string): string {
  const withVars = css.replace(/:root\b/g, scope);
  return withVars.replace(/(^|})\s*([^{}@]+)\s*\{/g, (_full, brace: string, selectors: string) => {
    const scoped = selectors
      .split(",")
      .map((raw) => {
        const sel = raw.trim();
        if (!sel) return sel;
        if (sel.startsWith(scope)) return sel;
        if (sel === "html" || sel === "body") return scope;
        if (sel.startsWith("html ") || sel.startsWith("body ")) {
          return sel.replace(/^(html|body)/, scope);
        }
        if (sel.startsWith("*")) return `${scope} ${sel}`;
        return `${scope} ${sel}`;
      })
      .join(", ");
    return `${brace} ${scoped} {`;
  });
}

function rewriteAssetUrls(text: string): string {
  return text
    .replaceAll("assets/face-tk.png", "/boot/assets/face-tk.png")
    .replaceAll("assets/char-tk.png", "/boot/assets/char-tk.png")
    .replaceAll("assets/face-fm.png", "/boot/assets/face-fm.png")
    .replaceAll("assets/char-fm.png", "/boot/assets/char-fm.png")
    .replaceAll("assets/face-bm.png", "/boot/assets/face-bm.png")
    .replaceAll("assets/char-bm.png", "/boot/assets/char-bm.png")
    .replaceAll("assets/face-ht.png", "/boot/assets/face-ht.png")
    .replaceAll("assets/char-ht.png", "/boot/assets/char-ht.png")
    .replaceAll('"assets/', '"/wire/assets/')
    .replaceAll("'assets/", "'/wire/assets/")
    .replaceAll("+ \"assets/", "+ \"/wire/assets/")
    .replaceAll("+ 'assets/", "+ '/wire/assets/");
}

export class WireUi {
  private readonly root: HTMLElement;
  private view: CharacterViewModel | null = null;

  private constructor(root: HTMLElement) {
    this.root = root;
  }

  static async mount(host: HTMLElement, view?: CharacterViewModel | null): Promise<WireUi> {
    const res = await fetch("/wire/03-wire-paineis-cidade.html");
    if (!res.ok) throw new Error(`Wire UI indisponível (${res.status})`);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const styleEl = doc.querySelector("style");
    const scriptEl = doc.querySelector("script");
    doc.querySelectorAll("script").forEach((node) => node.remove());
    const bodyHtml = doc.body.innerHTML;

    host.id = "wire-ui";
    host.setAttribute("data-ui-block-click", "true");
    host.replaceChildren();

    const style = document.createElement("style");
    style.setAttribute("data-wire-ui", "true");
    style.textContent =
      scopeCss(styleEl?.textContent || "", "#wire-ui") +
      "\n" +
      OVERLAY_CSS;
    document.head.appendChild(style);

    host.innerHTML = rewriteAssetUrls(bodyHtml);

    host.querySelectorAll(".win").forEach((win) => {
      win.classList.add("is-closed");
    });

    (window as unknown as { __UAIDZIN_ECONOMY__?: unknown }).__UAIDZIN_ECONOMY__ = {
      getShopCatalog: () => shopCatalogForUi(),
      resolveItemIcon: (defId: string, slot?: string, name?: string) =>
        resolveItemIcon(defId, slot, name),
      skillPointsCost: () => SKILL_TRAINING.pointsCost,
      skillGoldCost: (index: number) => SKILL_TRAINING.goldCost(index),
      skillUpCost: (index: number) => SKILL_TRAINING.upCost(index),
      canAffordSkill: (skillPoints: number, gold: number, pointsCost: number, goldCost: number) =>
        SKILL_TRAINING.canAfford(skillPoints, gold, pointsCost, goldCost),
    };

    const code = rewriteAssetUrls(scriptEl?.textContent || "");
    const run = document.createElement("script");
    run.textContent = code;
    host.appendChild(run);

    const ui = new WireUi(host);
    if (view) ui.applyCharacter(view);
    return ui;
  }

  applyCharacter(view: CharacterViewModel): void {
    this.view = view;
    bindWirePanels(this.root, view);
  }

  isOpen(): boolean {
    return !!this.root.querySelector(".win:not(.is-closed)");
  }

  open(name: WirePanelName, opts?: { title?: string; shopId?: string }): void {
    if (this.view) bindWirePanels(this.root, this.view);
    const syncApi = (window as unknown as { __UAIDZIN_WIRE__?: { syncFromGame?: () => void } })
      .__UAIDZIN_WIRE__;
    syncApi?.syncFromGame?.();
    const el = this.root.querySelector("#" + PANEL_IDS[name]);
    if (!el) return;
    if (MID_PANELS.includes(name)) {
      for (const other of MID_PANELS) {
        if (other === name) continue;
        this.root.querySelector("#" + PANEL_IDS[other])?.classList.add("is-closed");
      }
    }
    if (RIGHT_PANELS.includes(name)) {
      for (const other of RIGHT_PANELS) {
        if (other === name) continue;
        this.root.querySelector("#" + PANEL_IDS[other])?.classList.add("is-closed");
      }
    }
    if (name === "sage") {
      this.root.querySelector("#" + PANEL_IDS.person)?.classList.add("is-closed");
    }
    if (name === "person") {
      this.root.querySelector("#" + PANEL_IDS.sage)?.classList.add("is-closed");
    }
    if (SOLO_PANELS.includes(name)) {
      this.root.querySelectorAll(".win").forEach((win) => {
        if (win.id === PANEL_IDS[name]) return;
        win.classList.add("is-closed");
      });
    }
    if (name === "shop") {
      if (opts?.title) {
        const titleEl = this.root.querySelector("#shopTitle");
        if (titleEl) titleEl.textContent = opts.title;
      }
      const shopId = opts?.shopId || "merchant";
      (el as HTMLElement).dataset.shop = shopId;
      const api = (window as unknown as { __UAIDZIN_WIRE__?: { paintShop?: (id: string) => void } })
        .__UAIDZIN_WIRE__;
      api?.paintShop?.(shopId);
    }
    if (name === "portal") {
      const api = (window as unknown as { __UAIDZIN_WIRE__?: { paintPortal?: () => void } })
        .__UAIDZIN_WIRE__;
      api?.paintPortal?.();
    }
    if (name === "sage") {
      const api = (window as unknown as { __UAIDZIN_WIRE__?: { paintSage?: () => void } })
        .__UAIDZIN_WIRE__;
      api?.paintSage?.();
    }
    if (name === "composer") {
      const api = (window as unknown as { __UAIDZIN_WIRE__?: { paintComposer?: () => void } })
        .__UAIDZIN_WIRE__;
      api?.paintComposer?.();
    }
    if (name === "quest") {
      const api = (window as unknown as { __UAIDZIN_WIRE__?: { paintQuest?: () => void } })
        .__UAIDZIN_WIRE__;
      api?.paintQuest?.();
    }
    el.classList.remove("is-closed");
  }

  close(): void {
    this.root.querySelectorAll(".win").forEach((win) => {
      win.classList.add("is-closed");
    });
  }

  toggle(name: WirePanelName): void {
    const el = this.root.querySelector("#" + PANEL_IDS[name]);
    if (!el) return;
    if (el.classList.contains("is-closed")) this.open(name);
    else el.classList.add("is-closed");
  }
}
