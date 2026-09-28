import type { CharacterViewModel } from "../../persistence/SaveTypes";
import type { WireApi, WireItem, WireUiHandle } from "../WireApi";

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

export interface ConfirmOpts {
  title: string;
  msg: string;
  yesLabel?: string;
  noLabel?: string;
  onYes: () => void;
  onNo?: () => void;
  danger?: boolean;
}

export interface PortalConfirmOpts {
  title: string;
  msg: string;
  onYes: (dontAskAgain: boolean) => void;
  onNo?: () => void;
}

export interface WireContext {
  readonly api: WireApi;
  readonly hostEl: HTMLElement;
  notifyDialog(open: boolean): void;
  notifyPanels(open: boolean): void;
  openConfirm(opts: ConfirmOpts): void;
  closeConfirm(): void;
  openPortalConfirm(opts: PortalConfirmOpts): void;
  closePortalConfirm(): void;
  showSkillTip(el: HTMLElement, title: string, sub: string, meta: Record<string, string>, desc: string, iconSrc?: string): void;
  hideSkillTip(): void;
  showItemTip(el: HTMLElement, item: WireItem, actsHtml?: string): void;
  hideItemTip(): void;
  syncFromGame(): void;
  getViewModel(): CharacterViewModel | null;
  setViewModel(view: CharacterViewModel): void;
  closeMidExcept(panelName: WirePanelName): void;
  closeRightExcept(panelName: WirePanelName): void;
  togglePanel(panelName: WirePanelName, opts?: { title?: string; shopId?: string }): void;
  openPanel(panelName: WirePanelName, opts?: { title?: string; shopId?: string }): void;
  closePanel(panelName: WirePanelName): void;
  closeAll(): void;
  isAnyPanelOpen(): boolean;
  isDialogOpen(): boolean;
  refreshPower(): void;
}

export type { WireUiHandle };
