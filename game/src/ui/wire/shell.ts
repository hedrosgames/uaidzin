import type { CharacterViewModel } from "../../persistence/SaveTypes";
import type { WireApi, WireUiHandle } from "../WireApi";
import { createComposerPanel, type ComposerPanel } from "./composer";
import { createDialogManager, type DialogManager } from "./dialog";
import { createHintBar, type HintBar } from "./hint";
import { createInventoryPanel, type InventoryPanel } from "./inventory";
import { createPersonPanel, type PersonPanel } from "./person";
import { createPortalPanel, type PortalPanel } from "./portal";
import { createQuestPanel, type QuestPanel } from "./quest";
import { createSagePanel, type SagePanel } from "./sage";
import { createShopPanel, type ShopPanel } from "./shop";
import { createSkillBarHud, type SkillBarHud } from "./skillbar";
import { createSkillMasterPanel, type SkillMasterPanel } from "./skillmaster";
import { createSkillsPanel, type SkillsPanel } from "./skills";
import { createSmithManager } from "./smith";
import { createTooltipManager, type TooltipManager } from "./tooltip";
import type { ConfirmOpts, PortalConfirmOpts, WireContext, WirePanelName } from "./types";
import { createVaultPanel, type VaultPanel } from "./vault";

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

const PANEL_ID_MAP: Record<WirePanelName, string> = {
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

export interface WireShellOpts {
  onDialogOpen?: (open: boolean) => void;
  onPanelsOpen?: (open: boolean) => void;
}

export function createWireShell(
  hostEl: HTMLElement,
  api: WireApi,
  opts?: WireShellOpts,
): WireUiHandle {
  let cachedView: CharacterViewModel | null = null;

  const viewport = document.createElement("div");
  viewport.className = "viewport";

  const stage = document.createElement("div");
  stage.className = "stage";
  stage.id = "stage";
  viewport.appendChild(stage);

  const dialogHost = document.createElement("div");
  dialogHost.className = "dialog-host";

  hostEl.replaceChildren(viewport, dialogHost);

  const dialogMgr: DialogManager = createDialogManager(dialogHost, (open) => {
    opts?.onDialogOpen?.(open);
  });

  const tooltipMgr: TooltipManager = createTooltipManager(stage);

  const ctx: WireContext = {
    api,
    hostEl,
    notifyDialog: (open) => opts?.onDialogOpen?.(open),
    notifyPanels: (open) => opts?.onPanelsOpen?.(open),
    openConfirm: (cOpts: ConfirmOpts) => dialogMgr.openConfirm(cOpts),
    closeConfirm: () => dialogMgr.closeConfirm(),
    openPortalConfirm: (pOpts: PortalConfirmOpts) => dialogMgr.openPortalConfirm(pOpts),
    closePortalConfirm: () => dialogMgr.closePortalConfirm(),
    showSkillTip: (el, t, s, m, d, ico, role) => tooltipMgr.showSkillTip(el, t, s, m, d, ico, role),
    hideSkillTip: () => tooltipMgr.hideSkillTip(),
    showItemTip: (el, item, acts) => tooltipMgr.showItemTip(el, item, acts),
    hideItemTip: () => tooltipMgr.hideItemTip(),
    syncFromGame: () => syncAll(),
    getViewModel: () => cachedView,
    setViewModel: (v) => {
      cachedView = v;
    },
    closeMidExcept: (panel) => closeMidPanelsExcept(panel),
    closeRightExcept: (panel) => closeRightPanelsExcept(panel),
    togglePanel: (panel, pOpts) => togglePanel(panel, pOpts),
    openPanel: (panel, pOpts) => openPanel(panel, pOpts),
    closePanel: (panel) => closePanel(panel),
    closeAll: () => closeAllPanels(),
    isAnyPanelOpen: () => checkAnyPanelOpen(),
    isDialogOpen: () => dialogMgr.isDialogOpen(),
    refreshPower: () => personPanel.sync(cachedView),
  };

  const hintBar: HintBar = createHintBar(stage, ctx);
  const personPanel: PersonPanel = createPersonPanel(stage, ctx);
  const skillsPanel: SkillsPanel = createSkillsPanel(stage, ctx);
  const skillMasterPanel: SkillMasterPanel = createSkillMasterPanel(stage, ctx);
  const skillBarHud: SkillBarHud = createSkillBarHud(stage, ctx);
  const inventoryPanel: InventoryPanel = createInventoryPanel(stage, ctx);
  const composerPanel: ComposerPanel = createComposerPanel(stage, ctx);
  const questPanel: QuestPanel = createQuestPanel(stage, ctx);
  const portalPanel: PortalPanel = createPortalPanel(stage, ctx);
  const sagePanel: SagePanel = createSagePanel(stage, ctx);
  const shopPanel: ShopPanel = createShopPanel(stage, ctx);
  const vaultPanel: VaultPanel = createVaultPanel(stage, ctx);
  createSmithManager(ctx);

  stage.innerHTML = `
    ${hintBar.renderHtml()}
    <div class="wins" id="wins">
      ${personPanel.renderHtml()}
      ${skillsPanel.renderHtml()}
      ${vaultPanel.renderHtml()}
      ${inventoryPanel.renderHtml()}
      ${composerPanel.renderHtml()}
      ${questPanel.renderHtml()}
      ${portalPanel.renderHtml()}
      ${sagePanel.renderHtml()}
      ${shopPanel.renderHtml()}
      ${skillMasterPanel.renderHtml()}
    </div>
    ${skillBarHud.renderHtml()}
    ${tooltipMgr.renderHtml()}
  `;

  dialogHost.innerHTML = dialogMgr.renderHtml();
  dialogMgr.bindEvents();

  stage.querySelectorAll(".win").forEach((win) => {
    win.classList.add("is-closed");
  });

  hintBar.bindEvents();
  personPanel.bindEvents();
  skillsPanel.bindEvents();
  skillMasterPanel.bindEvents();
  skillBarHud.bindEvents();
  inventoryPanel.bindEvents();
  vaultPanel.bindEvents();
  composerPanel.bindEvents();
  questPanel.bindEvents();
  portalPanel.bindEvents();
  sagePanel.bindEvents();
  shopPanel.bindEvents();

  function fit(): void {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    stage.style.transform = `scale(${s})`;
    const mx = (1600 * s - 1600) / 2;
    const my = (900 * s - 900) / 2;
    stage.style.margin = `${my}px ${mx}px`;
  }
  fit();
  window.addEventListener("resize", fit);

  function syncAll(): void {
    cachedView = api.getCharacterViewModel();
    personPanel.sync(cachedView);
    skillsPanel.sync();
    skillMasterPanel.sync();
    skillBarHud.sync();
    inventoryPanel.sync(cachedView);
    vaultPanel.sync();
    composerPanel.sync();
    questPanel.sync();
    portalPanel.sync();
    sagePanel.sync();
    shopPanel.sync();
    checkAnyPanelOpen();
  }

  function closeMidPanelsExcept(panel: WirePanelName): void {
    for (const name of MID_PANELS) {
      if (name === panel) continue;
      stage.querySelector(`#${PANEL_ID_MAP[name]}`)?.classList.add("is-closed");
    }
  }

  function closeRightPanelsExcept(panel: WirePanelName): void {
    for (const name of RIGHT_PANELS) {
      if (name === panel) continue;
      stage.querySelector(`#${PANEL_ID_MAP[name]}`)?.classList.add("is-closed");
    }
  }

  function openPanel(name: WirePanelName, pOpts?: { title?: string; shopId?: string }): void {
    const win = stage.querySelector<HTMLElement>(`#${PANEL_ID_MAP[name]}`);
    if (!win) return;

    if (SOLO_PANELS.includes(name)) {
      for (const other of Object.keys(PANEL_ID_MAP) as WirePanelName[]) {
        if (other !== name) stage.querySelector(`#${PANEL_ID_MAP[other]}`)?.classList.add("is-closed");
      }
    } else {
      for (const solo of SOLO_PANELS) {
        stage.querySelector(`#${PANEL_ID_MAP[solo]}`)?.classList.add("is-closed");
      }
    }

    if (MID_PANELS.includes(name)) {
      closeMidPanelsExcept(name);
    }
    if (RIGHT_PANELS.includes(name)) {
      closeRightPanelsExcept(name);
    }

    if (name === "shop") {
      shopPanel.setShopId(pOpts?.shopId || "merchant", pOpts?.title);
    }

    win.classList.remove("is-closed");

    if (name === "vault") {
      inventoryPanel.setVaultOpen(true);
      stage.querySelector(`#${PANEL_ID_MAP.inv}`)?.classList.remove("is-closed");
    }

    checkAnyPanelOpen();
    syncAll();
  }

  function closePanel(name: WirePanelName): void {
    const win = stage.querySelector<HTMLElement>(`#${PANEL_ID_MAP[name]}`);
    if (!win) return;
    win.classList.add("is-closed");
    if (name === "vault") {
      inventoryPanel.setVaultOpen(false);
    }
    checkAnyPanelOpen();
  }

  function togglePanel(name: WirePanelName, pOpts?: { title?: string; shopId?: string }): void {
    const win = stage.querySelector<HTMLElement>(`#${PANEL_ID_MAP[name]}`);
    if (!win) return;
    if (win.classList.contains("is-closed")) {
      openPanel(name, pOpts);
    } else {
      closePanel(name);
    }
  }

  function closeAllPanels(): void {
    stage.querySelectorAll(".win").forEach((win) => win.classList.add("is-closed"));
    inventoryPanel.setVaultOpen(false);
    checkAnyPanelOpen();
  }

  let lastPanelsOpen = false;
  function checkAnyPanelOpen(): boolean {
    const hasOpen = !!stage.querySelector(".win:not(.is-closed)");
    if (hasOpen !== lastPanelsOpen) {
      lastPanelsOpen = hasOpen;
      opts?.onPanelsOpen?.(hasOpen);
    }
    return hasOpen;
  }

  syncAll();

  return {
    setCharacter: (view: CharacterViewModel) => {
      cachedView = view;
      syncAll();
    },
    syncFromGame: () => {
      syncAll();
    },
    handleEscape: () => {
      if (dialogMgr.handleEscape()) return true;
      if (checkAnyPanelOpen()) {
        closeAllPanels();
        return true;
      }
      return false;
    },
    open: (panelName: string, pOpts?: { title?: string; shopId?: string }) => {
      if (panelName in PANEL_ID_MAP) {
        openPanel(panelName as WirePanelName, pOpts);
      }
    },
    close: (panelName?: string) => {
      if (!panelName) {
        closeAllPanels();
      } else if (panelName in PANEL_ID_MAP) {
        closePanel(panelName as WirePanelName);
      }
    },
    toggle: (panelName: string, pOpts?: { title?: string; shopId?: string }) => {
      if (panelName in PANEL_ID_MAP) {
        togglePanel(panelName as WirePanelName, pOpts);
      }
    },
    isOpen: () => {
      return !!stage.querySelector(".win:not(.is-closed)") || dialogMgr.isDialogOpen();
    },
    openPortalConfirm: (dungeonId: string, onConfirm?: () => void) => {
      portalPanel.requestEnter(dungeonId);
      if (onConfirm) onConfirm();
    },
    openInteraction: (kind: string, id: string) => {
      if (kind === "npc") {
        if (id === "npc-merchant") openPanel("shop", { title: "Mercador", shopId: "merchant" });
        else if (id === "npc-blacksmith") openPanel("shop", { title: "Ferreiro", shopId: "blacksmith" });
        else if (id === "npc-skills") openPanel("skillmaster");
        else if (id === "npc-sage") openPanel("sage");
        else if (id === "npc-composer") openPanel("composer");
        else if (id === "npc-vault") openPanel("vault");
        else if (id === "npc-quest") openPanel("quest");
      } else if (kind === "portal") {
        openPanel("portal");
      }
    },
  };
}
