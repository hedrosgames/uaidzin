import { describe, expect, it } from "vitest";
import { InputService, isTypingElement, normalizeWheelZoom } from "./InputService";

function createKeyEvent(opts: {
  code?: string;
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  target?: unknown;
}): Event {
  const event = new Event("keydown");
  Object.defineProperty(event, "code", { value: opts.code || "" });
  Object.defineProperty(event, "key", { value: opts.key || opts.code || "" });
  Object.defineProperty(event, "ctrlKey", { value: Boolean(opts.ctrlKey) });
  Object.defineProperty(event, "metaKey", { value: Boolean(opts.metaKey) });
  Object.defineProperty(event, "altKey", { value: Boolean(opts.altKey) });
  Object.defineProperty(event, "repeat", { value: Boolean(opts.repeat) });
  Object.defineProperty(event, "target", { value: opts.target || null });
  let prevented = false;
  event.preventDefault = () => {
    prevented = true;
  };
  Object.defineProperty(event, "defaultPrevented", {
    get: () => prevented,
  });
  return event;
}

function createKeyUpEvent(opts: { code: string; target?: unknown }): Event {
  const event = new Event("keyup");
  Object.defineProperty(event, "code", { value: opts.code });
  Object.defineProperty(event, "key", { value: opts.code });
  Object.defineProperty(event, "target", { value: opts.target || null });
  return event;
}

describe("InputService", () => {
  it("bloqueia E (interact) quando a UI estiver aberta", () => {
    const target = new EventTarget();
    const input = new InputService(target);
    input.setMode("CITY");

    input.setUiOpen(true);
    target.dispatchEvent(createKeyEvent({ code: "KeyE" }));
    expect(input.consumeAction("interact")).toBe(false);

    input.setUiOpen(false);
    target.dispatchEvent(createKeyEvent({ code: "KeyE" }));
    expect(input.consumeAction("interact")).toBe(true);
    input.dispose();
  });

  it("ignora atalhos quando o foco estiver em campo de digitacao", () => {
    const target = new EventTarget();
    const input = new InputService(target);
    input.setMode("CITY");

    const inputElement = { tagName: "INPUT" };
    expect(isTypingElement(inputElement)).toBe(true);

    target.dispatchEvent(createKeyEvent({ code: "KeyW", target: inputElement }));
    expect(input.isActionDown("move.up")).toBe(false);

    target.dispatchEvent(createKeyEvent({ code: "KeyC", target: inputElement }));
    expect(input.consumeAction("panel.person")).toBe(false);
    input.dispose();
  });

  it("permite Escape mesmo com foco em campo de digitacao", () => {
    const target = new EventTarget();
    const input = new InputService(target);
    let escapeTriggered = false;
    input.registerAction("ui.escape", () => {
      escapeTriggered = true;
    });

    const textarea = { tagName: "TEXTAREA" };
    target.dispatchEvent(createKeyEvent({ code: "Escape", key: "Escape", target: textarea }));
    expect(escapeTriggered).toBe(true);
    input.dispose();
  });

  it("limpa tecla no keyup mesmo com foco em campo de digitacao", () => {
    const target = new EventTarget();
    const input = new InputService(target);

    target.dispatchEvent(createKeyEvent({ code: "KeyW" }));
    expect(input.isActionDown("move.up")).toBe(true);

    const inputEl = { tagName: "INPUT" };
    target.dispatchEvent(createKeyUpEvent({ code: "KeyW", target: inputEl }));
    expect(input.isActionDown("move.up")).toBe(false);
    input.dispose();
  });

  it("ignora teclas com modificador Ctrl ou Meta (ex: Ctrl+C)", () => {
    const target = new EventTarget();
    const input = new InputService(target);
    input.setMode("CITY");

    target.dispatchEvent(createKeyEvent({ code: "KeyC", ctrlKey: true }));
    expect(input.consumeAction("panel.person")).toBe(false);

    target.dispatchEvent(createKeyEvent({ code: "KeyC", metaKey: true }));
    expect(input.consumeAction("panel.person")).toBe(false);
    input.dispose();
  });

  it("nao captura nem impede F5 em producao", () => {
    const target = new EventTarget();
    const input = new InputService(target);

    const event = createKeyEvent({ code: "F5", key: "F5" });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    input.dispose();
  });

  it("mapeia teclas 1 a 9 e 0 para slots de skill 0 a 9", () => {
    const target = new EventTarget();
    const input = new InputService(target);
    input.setMode("CITY");

    const digits = [
      { code: "Digit1", slot: 0 },
      { code: "Digit2", slot: 1 },
      { code: "Digit3", slot: 2 },
      { code: "Digit4", slot: 3 },
      { code: "Digit5", slot: 4 },
      { code: "Digit6", slot: 5 },
      { code: "Digit7", slot: 6 },
      { code: "Digit8", slot: 7 },
      { code: "Digit9", slot: 8 },
      { code: "Digit0", slot: 9 },
    ];

    for (const { code, slot } of digits) {
      target.dispatchEvent(createKeyEvent({ code }));
      expect(input.consumeSkillSlot()).toBe(slot);
    }

    const numpads = [
      { code: "Numpad1", slot: 0 },
      { code: "Numpad9", slot: 8 },
      { code: "Numpad0", slot: 9 },
    ];
    for (const { code, slot } of numpads) {
      target.dispatchEvent(createKeyEvent({ code }));
      expect(input.consumeSkillSlot()).toBe(slot);
    }

    input.dispose();
  });

  it("normaliza roda com deltaMode 0, 1, 2 e deltaY zero", () => {
    expect(normalizeWheelZoom({ deltaY: 0 })).toBe(0);
    expect(normalizeWheelZoom({ deltaY: 100, ctrlKey: true })).toBe(0);
    expect(normalizeWheelZoom({ deltaY: 100, metaKey: true })).toBe(0);

    const pixelZoom = normalizeWheelZoom({ deltaY: 48, deltaMode: 0 });
    expect(pixelZoom).toBeCloseTo(0.05, 4);

    const lineZoom = normalizeWheelZoom({ deltaY: 3, deltaMode: 1 });
    expect(lineZoom).toBeCloseTo(0.05, 4);

    const pageZoom = normalizeWheelZoom({ deltaY: 1, deltaMode: 2 }, 600);
    expect(pageZoom).toBe(0.2);

    const negZoom = normalizeWheelZoom({ deltaY: -48, deltaMode: 0 });
    expect(negZoom).toBeCloseTo(-0.05, 4);
  });

  it("desbloqueia movimentacao e interacao quando a UI e fechada", () => {
    const target = new EventTarget();
    const input = new InputService(target);
    input.setMode("CITY");

    input.setUiOpen(true);
    expect(input.isUiOpen()).toBe(true);

    target.dispatchEvent(createKeyEvent({ code: "KeyW" }));
    expect(input.isActionDown("move.up")).toBe(false);

    input.setUiOpen(false);
    expect(input.isUiOpen()).toBe(false);

    target.dispatchEvent(createKeyEvent({ code: "KeyW" }));
    expect(input.isActionDown("move.up")).toBe(true);

    target.dispatchEvent(createKeyEvent({ code: "KeyE" }));
    expect(input.consumeAction("interact")).toBe(true);

    input.dispose();
  });
});
