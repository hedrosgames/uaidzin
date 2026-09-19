export interface InteractionPrompt {
  id: string;
  label: string;
  body: string;
  kind: string;
}

export class InteractionPanel {
  private currentId: string | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly onConfirm: (id: string) => void,
    private readonly onClose: () => void,
  ) {
    root.setAttribute("data-ui-block-click", "true");
    root.hidden = true;

    const btnAction = root.querySelector<HTMLButtonElement>("#interaction-action");
    const btnClose = root.querySelector<HTMLButtonElement>("#interaction-close");
    btnAction?.addEventListener("click", () => {
      if (this.currentId) this.onConfirm(this.currentId);
    });
    btnClose?.addEventListener("click", () => this.close());
  }

  open(prompt: InteractionPrompt): void {
    this.currentId = prompt.id;
    const title = this.root.querySelector("#interaction-title");
    const body = this.root.querySelector("#interaction-body");
    const action = this.root.querySelector<HTMLButtonElement>("#interaction-action");
    if (title) title.textContent = prompt.label;
    if (body) body.textContent = prompt.body;
    if (action) {
      if (prompt.kind === "portal") action.textContent = "Entrar na dungeon";
      else if (prompt.kind === "portal-exit") action.textContent = "Voltar para Aurelion";
      else action.textContent = "Falar (stub)";
    }
    this.root.hidden = false;
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.currentId = null;
    this.onClose();
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  getCurrentId(): string | null {
    return this.currentId;
  }
}
