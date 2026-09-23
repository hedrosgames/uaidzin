import type { CharacterViewModel } from "../persistence/SaveTypes";
import { viewModelFromPayload, viewModelFromSummary, type SavePayload, type SlotSummary } from "../persistence/SaveTypes";

export const CLASS_ART: Record<
  string,
  { face: string; portrait: string; name: string; namePt: string }
> = {
  TK: {
    face: "/boot/assets/face-tk.png",
    portrait: "/boot/assets/char-tk.png",
    name: "Thegn Knight",
    namePt: "Cavaleiro Thegn",
  },
  FM: {
    face: "/boot/assets/face-fm.png",
    portrait: "/boot/assets/char-fm.png",
    name: "Frost Maiden",
    namePt: "Donzela do Gelo",
  },
  BM: {
    face: "/boot/assets/face-bm.png",
    portrait: "/boot/assets/char-bm.png",
    name: "Beast Master",
    namePt: "Mestre das Feras",
  },
  HT: {
    face: "/boot/assets/face-ht.png",
    portrait: "/boot/assets/char-ht.png",
    name: "Huntress",
    namePt: "Caçadora",
  },
};

export function artForClass(classId: string) {
  return CLASS_ART[classId] || CLASS_ART.TK;
}

export function viewFromSlot(slot: SlotSummary | null): CharacterViewModel | null {
  return slot ? viewModelFromSummary(slot) : null;
}

export function viewFromSave(payload: SavePayload): CharacterViewModel {
  return viewModelFromPayload(payload);
}

function setText(root: HTMLElement, selector: string, value: string): void {
  root.querySelectorAll(selector).forEach((el) => {
    el.textContent = value;
  });
}

function setRowByLab(root: HTMLElement, scope: string, lab: string, value: string): void {
  root.querySelectorAll(`${scope} .row`).forEach((row) => {
    const labEl = row.querySelector(".lab");
    if (!labEl || labEl.textContent?.trim() !== lab) return;
    const val = row.querySelector(".val");
    if (val) val.textContent = value;
  });
}

export function bindHud(
  els: {
    face?: HTMLImageElement | null;
    name?: HTMLElement | null;
    level?: HTMLElement | null;
  },
  view: CharacterViewModel,
): void {
  const art = artForClass(view.classId);
  if (els.face) els.face.src = art.face;
  if (els.name) els.name.textContent = view.name;
  if (els.level) els.level.textContent = `Lv ${view.level}`;
}

export function bindWirePanels(root: HTMLElement, view: CharacterViewModel): void {
  const art = artForClass(view.classId);
  root.querySelectorAll<HTMLImageElement>("img[src*='face-'], img[src*='char-']").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (src.includes("face-")) img.src = art.face;
    else if (src.includes("char-")) img.src = art.portrait;
  });

  setText(root, "[data-bind='name'], #personName, .person-name, .char-name", view.name);
  setRowByLab(root, "#p-person", "Nome", view.name);

  setText(root, "[data-bind='class'], #personClass, .person-class", art.name);
  setRowByLab(root, "#p-person", "Classe", art.name);
  setRowByLab(root, "#p-skills", "Classe", art.name);

  setText(root, "[data-bind='level'], #personLevel, .person-level", String(view.level));
  setRowByLab(root, "#p-person", "Nível", String(view.level));

  setText(root, "[data-bind='resets'], #personResets, .person-resets", String(view.resets));
  setRowByLab(root, "#p-person", "Resets", String(view.resets));

  setText(root, "[data-bind='gold'], #goldValue, .gold-value, #invGold, #playerGold, #vaultPlayerGold", String(view.gold));

  if (view.vaultGold !== undefined) {
    setText(root, "#vaultBankGold, #vaultFootGold, [data-bind='vaultGold']", String(view.vaultGold));
  }

  const attrMap: Record<string, number> = {
    FOR: view.attrs.FOR,
    DES: view.attrs.DES,
    CONS: view.attrs.CONS,
    INT: view.attrs.INT,
  };
  const statKey: Record<string, string> = {
    FOR: "for",
    DES: "des",
    CONS: "cons",
    INT: "int",
  };
  for (const [key, value] of Object.entries(attrMap)) {
    setText(root, `[data-attr='${key}'], #attr-${key}, #attr${key}`, String(value));
    const row = root.querySelector(`#attr-list .attr[data-stat='${statKey[key]}']`);
    const bold = row?.querySelector("b");
    if (bold) bold.textContent = String(value);
  }

  if (view.attrPts !== undefined) {
    setText(root, "[data-bind='attrPts'], #attr-pts", String(view.attrPts));
  }

  if (view.xp !== undefined && view.xpToNext !== undefined) {
    const xpText = `${view.xp} / ${view.xpToNext}`;
    setText(root, "[data-bind='xp']", xpText);
    setRowByLab(root, "#p-person", "EXP", xpText);
    const ratio = view.xpToNext > 0 ? Math.max(0, Math.min(1, view.xp / view.xpToNext)) : 0;
    const pct = Math.round(ratio * 100);
    const bar = root.querySelector("#p-person .bar");
    if (bar) {
      const fill = bar.querySelector("i");
      const label = bar.querySelector("span");
      if (fill) (fill as HTMLElement).style.width = `${pct}%`;
      if (label) label.textContent = `${pct}%`;
    }
  }

  if (view.hp !== undefined && view.maxHp !== undefined) {
    setRowByLab(root, "#p-person .combat", "HP", `${Math.ceil(view.hp)} / ${Math.ceil(view.maxHp)}`);
  }
  if (view.mp !== undefined && view.maxMp !== undefined) {
    setRowByLab(root, "#p-person .combat", "MP", `${Math.ceil(view.mp)} / ${Math.ceil(view.maxMp)}`);
  }
  if (view.attack !== undefined) {
    setRowByLab(root, "#p-person .combat", "Ataque", String(view.attack));
  }
  if (view.defense !== undefined) {
    setRowByLab(root, "#p-person .combat", "Defesa", String(view.defense));
  }

  if (view.spec) {
    const cap = 40;
    for (const tree of ["controle", "magia", "fisica"] as const) {
      const row = root.querySelector(`#spec-spend .spend-row[data-tree='${tree}']`);
      const num = row?.querySelector(".num");
      if (num) num.textContent = `${view.spec[tree]}/${cap}`;
    }
  }
  if (view.specPts !== undefined) {
    setText(root, "#spec-pts, [data-bind='specPts']", String(view.specPts));
  }

  const api = (
    window as unknown as {
      __UAIDZIN_WIRE__?: {
        setCharacter?: (v: CharacterViewModel) => void;
        syncFromGame?: () => void;
      };
    }
  ).__UAIDZIN_WIRE__;
  api?.setCharacter?.(view);
  api?.syncFromGame?.();
}
