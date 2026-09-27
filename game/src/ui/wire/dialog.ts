import type { ConfirmOpts, PortalConfirmOpts } from "./types";

export interface DialogManager {
  renderHtml(): string;
  bindEvents(): void;
  openConfirm(opts: ConfirmOpts): void;
  closeConfirm(): void;
  openPortalConfirm(opts: PortalConfirmOpts): void;
  closePortalConfirm(): void;
  isDialogOpen(): boolean;
  handleEscape(): boolean;
}

export function createDialogManager(
  container: HTMLElement,
  notifyDialog: (open: boolean) => void,
): DialogManager {
  let confirmAction: (() => void) | null = null;
  let confirmCancelAction: (() => void) | null = null;
  let portalConfirmAction: ((dontAsk: boolean) => void) | null = null;
  let portalCancelAction: (() => void) | null = null;

  function renderHtml(): string {
    return `
<div class="confirm-layer" id="confirmLayer" hidden>
  <div class="confirm-box">
    <p class="ttl" id="confirmTitle">Confirmar</p>
    <p class="msg" id="confirmMsg"></p>
    <div class="confirm-actions">
      <button type="button" class="no" id="confirmNo">Cancelar</button>
      <button type="button" class="yes" id="confirmYes">Confirmar</button>
    </div>
  </div>
</div>
<div class="confirm-layer" id="portalConfirmLayer" hidden>
  <div class="confirm-box">
    <p class="ttl" id="portalConfirmTitle">Entrar</p>
    <p class="msg" id="portalConfirmMsg"></p>
    <label class="portal-skip"><input type="checkbox" id="portalSkipConfirm"> Não solicitar mais confirmação</label>
    <div class="confirm-actions">
      <button type="button" class="no" id="portalConfirmNo">Cancelar</button>
      <button type="button" class="yes" id="portalConfirmYes">Entrar</button>
    </div>
  </div>
</div>
`;
  }

  function bindEvents(): void {
    const noBtn = container.querySelector<HTMLButtonElement>("#confirmNo");
    const yesBtn = container.querySelector<HTMLButtonElement>("#confirmYes");
    const portalNoBtn = container.querySelector<HTMLButtonElement>("#portalConfirmNo");
    const portalYesBtn = container.querySelector<HTMLButtonElement>("#portalConfirmYes");

    noBtn?.addEventListener("click", () => {
      const cb = confirmCancelAction;
      closeConfirm();
      cb?.();
    });

    yesBtn?.addEventListener("click", () => {
      const cb = confirmAction;
      closeConfirm();
      cb?.();
    });

    portalNoBtn?.addEventListener("click", () => {
      const cb = portalCancelAction;
      closePortalConfirm();
      cb?.();
    });

    portalYesBtn?.addEventListener("click", () => {
      const skipEl = container.querySelector<HTMLInputElement>("#portalSkipConfirm");
      const dontAsk = !!skipEl?.checked;
      const cb = portalConfirmAction;
      closePortalConfirm();
      cb?.(dontAsk);
    });
  }

  function openConfirm(opts: ConfirmOpts): void {
    const layer = container.querySelector<HTMLElement>("#confirmLayer");
    const titleEl = container.querySelector<HTMLElement>("#confirmTitle");
    const msgEl = container.querySelector<HTMLElement>("#confirmMsg");
    const yesBtn = container.querySelector<HTMLButtonElement>("#confirmYes");
    const noBtn = container.querySelector<HTMLButtonElement>("#confirmNo");
    if (!layer || !titleEl || !msgEl || !yesBtn) return;

    titleEl.textContent = opts.title;
    msgEl.innerHTML = opts.msg;
    yesBtn.textContent = opts.yesLabel || "Confirmar";
    if (noBtn) noBtn.textContent = opts.noLabel || "Cancelar";
    confirmAction = opts.onYes;
    confirmCancelAction = opts.onNo || null;
    layer.hidden = false;
    notifyDialog(true);
  }

  function closeConfirm(): void {
    const layer = container.querySelector<HTMLElement>("#confirmLayer");
    if (layer) layer.hidden = true;
    confirmAction = null;
    confirmCancelAction = null;
    notifyDialog(isDialogOpen());
  }

  function openPortalConfirm(opts: PortalConfirmOpts): void {
    const layer = container.querySelector<HTMLElement>("#portalConfirmLayer");
    const titleEl = container.querySelector<HTMLElement>("#portalConfirmTitle");
    const msgEl = container.querySelector<HTMLElement>("#portalConfirmMsg");
    const skipEl = container.querySelector<HTMLInputElement>("#portalSkipConfirm");
    if (!layer || !titleEl || !msgEl) return;

    titleEl.textContent = opts.title;
    msgEl.innerHTML = opts.msg;
    if (skipEl) skipEl.checked = false;
    portalConfirmAction = opts.onYes;
    portalCancelAction = opts.onNo || null;
    layer.hidden = false;
    notifyDialog(true);
  }

  function closePortalConfirm(): void {
    const layer = container.querySelector<HTMLElement>("#portalConfirmLayer");
    if (layer) layer.hidden = true;
    portalConfirmAction = null;
    portalCancelAction = null;
    notifyDialog(isDialogOpen());
  }

  function isDialogOpen(): boolean {
    const cLayer = container.querySelector<HTMLElement>("#confirmLayer");
    const pLayer = container.querySelector<HTMLElement>("#portalConfirmLayer");
    return (!!cLayer && !cLayer.hidden) || (!!pLayer && !pLayer.hidden);
  }

  function handleEscape(): boolean {
    if (isDialogOpen()) {
      closeConfirm();
      closePortalConfirm();
      return true;
    }
    return false;
  }

  return {
    renderHtml,
    bindEvents,
    openConfirm,
    closeConfirm,
    openPortalConfirm,
    closePortalConfirm,
    isDialogOpen,
    handleEscape,
  };
}
