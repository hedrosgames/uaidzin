export class LoadingScreen {
  private element: HTMLDivElement | null = null;
  private textEl: HTMLParagraphElement | null = null;
  private spinnerEl: HTMLDivElement | null = null;
  private errorBoxEl: HTMLDivElement | null = null;
  private errorMsgEl: HTMLParagraphElement | null = null;
  private onRetryCallback?: () => void;

  constructor(private readonly host: HTMLElement = document.body) {
    this.createDom();
  }

  private createDom(): void {
    const el = document.createElement("div");
    el.id = "uaidzin-loading-screen";
    el.setAttribute(
      "style",
      [
        "position:fixed",
        "inset:0",
        "width:100%",
        "height:100%",
        "background:#100c08",
        "z-index:300",
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "justify-content:center",
        "user-select:none",
        "color:#f0e6d0",
        "font-family:sans-serif",
        "transition:opacity 350ms ease",
        "opacity:1",
      ].join(";"),
    );

    const spinner = document.createElement("div");
    spinner.setAttribute(
      "style",
      [
        "width:44px",
        "height:44px",
        "border:3px solid #241c14",
        "border-top-color:#d4a017",
        "border-radius:50%",
        "animation:uaidzin-spin 1s linear infinite",
        "margin-bottom:18px",
      ].join(";"),
    );

    const text = document.createElement("p");
    text.setAttribute(
      "style",
      "font-size:15px;color:#d4a017;letter-spacing:0.5px;margin:0;font-weight:600;",
    );
    text.textContent = "Carregando o jogo…";

    const errorBox = document.createElement("div");
    errorBox.setAttribute(
      "style",
      [
        "display:none",
        "flex-direction:column",
        "align-items:center",
        "background:#241c14",
        "border:1px solid #a33b3b",
        "border-radius:2px",
        "padding:24px 32px",
        "max-width:420px",
        "text-align:center",
      ].join(";"),
    );

    const errorMsg = document.createElement("p");
    errorMsg.setAttribute(
      "style",
      "margin:0 0 16px 0;color:#f0e6d0;font-size:14px;line-height:1.5;",
    );

    const retryBtn = document.createElement("button");
    retryBtn.setAttribute(
      "style",
      [
        "background:#d4a017",
        "color:#100c08",
        "border:none",
        "border-radius:2px",
        "padding:8px 24px",
        "font-weight:700",
        "font-size:14px",
        "cursor:pointer",
        "letter-spacing:0.5px",
      ].join(";"),
    );
    retryBtn.textContent = "Tentar de novo";
    retryBtn.onclick = () => {
      if (this.onRetryCallback) {
        this.onRetryCallback();
      } else {
        window.location.reload();
      }
    };

    errorBox.appendChild(errorMsg);
    errorBox.appendChild(retryBtn);

    const style = document.createElement("style");
    style.textContent = "@keyframes uaidzin-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
    el.appendChild(style);
    el.appendChild(spinner);
    el.appendChild(text);
    el.appendChild(errorBox);

    this.element = el;
    this.textEl = text;
    this.spinnerEl = spinner;
    this.errorBoxEl = errorBox;
    this.errorMsgEl = errorMsg;

    this.host.appendChild(el);
  }

  setText(msg: string): void {
    if (this.textEl) this.textEl.textContent = msg;
  }

  show(msg = "Carregando o jogo…"): void {
    if (!this.element) this.createDom();
    this.setText(msg);
    if (this.textEl) this.textEl.style.display = "";
    if (this.spinnerEl) this.spinnerEl.style.display = "";
    if (this.errorBoxEl) this.errorBoxEl.style.display = "none";
    if (!this.element) return;
    this.element.style.display = "flex";
    this.element.style.pointerEvents = "auto";
    this.element.style.opacity = "1";
  }

  showError(message: string, onRetry?: () => void): void {
    this.onRetryCallback = onRetry;
    if (this.textEl) this.textEl.style.display = "none";
    if (this.spinnerEl) this.spinnerEl.style.display = "none";
    if (this.errorBoxEl && this.errorMsgEl) {
      this.errorMsgEl.textContent = message;
      this.errorBoxEl.style.display = "flex";
    }
  }

  dismiss(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.element) {
        resolve();
        return;
      }
      const el = this.element;
      this.element = null;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      const finish = () => {
        el.remove();
        resolve();
      };
      el.addEventListener("transitionend", finish, { once: true });
      window.setTimeout(finish, 400);
    });
  }
}

let sharedLoading: LoadingScreen | null = null;

export function showGameLoading(msg = "Carregando o jogo…"): void {
  if (typeof document === "undefined") return;
  if (!sharedLoading) sharedLoading = new LoadingScreen();
  sharedLoading.show(msg);
}

export function hideGameLoading(): Promise<void> {
  if (!sharedLoading) return Promise.resolve();
  return sharedLoading.dismiss();
}
