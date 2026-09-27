import "./wire.css";
import type { CharacterViewModel } from "../../persistence/SaveTypes";
import type { WireApi, WireUiHandle } from "../WireApi";
import { createWireShell } from "./shell";
import type { WirePanelName } from "./types";

export type { WirePanelName };

export class WireUi {
  readonly root: HTMLElement;
  private readonly api: WireApi | null;
  private handle: WireUiHandle | null = null;
  private view: CharacterViewModel | null = null;
  private onOpenChange?: (open: boolean) => void;

  private constructor(root: HTMLElement, api: WireApi | null) {
    this.root = root;
    this.api = api;
  }

  static async mount(
    host: HTMLElement,
    api: WireApi | null = null,
    view?: CharacterViewModel | null,
  ): Promise<WireUi> {
    host.id = "wire-ui";
    host.setAttribute("data-ui-block-click", "true");

    const ui = new WireUi(host, api);

    if (api) {
      ui.handle = createWireShell(host, api, {
        onDialogOpen: () => ui.notifyOpenChange(),
        onPanelsOpen: () => ui.notifyOpenChange(),
      });
      if (view) {
        ui.applyCharacter(view);
      }
    } else {
      host.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "empty-wire-state";
      empty.textContent = "Nenhum jogo ativo.";
      host.appendChild(empty);
    }

    return ui;
  }

  private notifyOpenChange(): void {
    this.onOpenChange?.(this.isOpen());
  }

  getApi(): WireApi | null {
    return this.api;
  }

  applyCharacter(view: CharacterViewModel): void {
    this.view = view;
    this.handle?.setCharacter?.(view);
    this.handle?.syncFromGame?.();
  }

  setOnOpenChange(cb: (open: boolean) => void): void {
    this.onOpenChange = cb;
  }

  getView(): CharacterViewModel | null {
    return this.view;
  }

  handleEscape(): boolean {
    return this.handle?.handleEscape?.() ?? false;
  }

  isOpen(): boolean {
    return this.handle?.isOpen?.() ?? false;
  }

  open(name: WirePanelName, opts?: { title?: string; shopId?: string }): void {
    this.handle?.open?.(name, opts);
    this.notifyOpenChange();
  }

  close(name?: WirePanelName): void {
    this.handle?.close?.(name);
    this.notifyOpenChange();
  }

  toggle(name: WirePanelName, opts?: { title?: string; shopId?: string }): void {
    this.handle?.toggle?.(name, opts);
    this.notifyOpenChange();
  }

  openPortalConfirm(dungeonId: string, onConfirm?: () => void): void {
    this.handle?.openPortalConfirm?.(dungeonId, onConfirm);
  }

  openInteraction(kind: string, id: string): void {
    this.handle?.openInteraction?.(kind, id);
    this.notifyOpenChange();
  }

  syncFromGame(): void {
    this.handle?.syncFromGame?.();
  }
}
