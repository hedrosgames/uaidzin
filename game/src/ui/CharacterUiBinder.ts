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

  const nameTargets = root.querySelectorAll(
    "[data-bind='name'], #personName, .person-name, .char-name",
  );
  nameTargets.forEach((el) => {
    el.textContent = view.name;
  });

  const levelTargets = root.querySelectorAll("[data-bind='level'], #personLevel, .person-level");
  levelTargets.forEach((el) => {
    el.textContent = String(view.level);
  });

  const classTargets = root.querySelectorAll("[data-bind='class'], #personClass, .person-class");
  classTargets.forEach((el) => {
    el.textContent = art.name;
  });

  const goldTargets = root.querySelectorAll("[data-bind='gold'], #goldValue, .gold-value, #invGold, #playerGold, #vaultPlayerGold");
  goldTargets.forEach((el) => {
    el.textContent = String(view.gold);
  });

  if (view.vaultGold !== undefined) {
    root.querySelectorAll("#vaultBankGold, #vaultFootGold, [data-bind='vaultGold']").forEach((el) => {
      el.textContent = String(view.vaultGold);
    });
  }

  const attrMap: Record<string, number> = {
    FOR: view.attrs.FOR,
    DES: view.attrs.DES,
    CONS: view.attrs.CONS,
    INT: view.attrs.INT,
  };
  for (const [key, value] of Object.entries(attrMap)) {
    root.querySelectorAll(`[data-attr='${key}'], #attr-${key}, #attr${key}`).forEach((el) => {
      el.textContent = String(value);
    });
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
