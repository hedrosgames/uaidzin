import { requireElement } from "./dom";
import type { ModelViewer } from "./ModelViewer";

export abstract class LabCard<V extends ModelViewer | null = ModelViewer | null> {
  readonly element: HTMLElement;
  readonly viewer: V;
  protected readonly statusEl: HTMLElement;
  private visible = true;

  protected constructor(element: HTMLElement, viewer: V) {
    this.element = element;
    this.viewer = viewer;
    this.statusEl = requireElement(element, ".card-status", HTMLElement);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  update(dt: number): void {
    if (!this.visible || !this.viewer) return;
    this.onUpdate(dt);
    this.viewer.render();
  }

  protected onUpdate(dt: number): void {
    this.viewer?.update(dt);
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }
}
