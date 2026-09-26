import type { WeaponSetId } from "../presentation/player/WeaponRig";

const STROKE = "#c8b89a";

function svgIcon(body: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function imgIcon(src: string): string {
  return `<img src="${src}" alt="" width="22" height="22" decoding="async" />`;
}

const ICON_BODY: Record<WeaponSetId, string> = {
  "dual-axe": svgIcon(
    `<path d="M5 19 L13 7l2 2L7 21z" fill="none" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M11 9l3-3 2 2-3 3" fill="${STROKE}"/>
    <path d="M14 16 L20 8l2 2L16 18z" fill="none" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M18 10l2-2 2 2-2 2" fill="${STROKE}"/>`,
  ),
  "axe-shield": svgIcon(
    `<path d="M4 18 L11 6l2 2L6 20z" fill="none" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M9 8l2-2 2 2-2 2" fill="${STROKE}"/>
    <path d="M14 5v14c0 2 4 2 4 0V5c0-2-4-2-4 0z" fill="none" stroke="${STROKE}" stroke-width="1.5"/>`,
  ),
  "sword-shield": svgIcon(
    `<path d="M5 19 L12 7l1.5 1.5L6.5 20.5z" fill="none" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M10 9l2-2 1.5 1.5-2 2" fill="${STROKE}"/>
    <path d="M14 5v14c0 2 4 2 4 0V5c0-2-4-2-4 0z" fill="none" stroke="${STROKE}" stroke-width="1.5"/>`,
  ),
  "dual-sword": svgIcon(
    `<path d="M4 18 L10 8l1.5 1.5L5.5 19.5z" fill="none" stroke="${STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M8 10l1.5-1.5 1.5 1.5-1.5 1.5" fill="${STROKE}"/>
    <path d="M12 18 L18 8l1.5 1.5L13.5 19.5z" fill="none" stroke="${STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M16 10l1.5-1.5 1.5 1.5-1.5 1.5" fill="${STROKE}"/>`,
  ),
  greatsword: imgIcon("/wire/assets/items/espada_curta.svg"),
  "dual-gloves": svgIcon(
    `<path d="M6 14v-3c0-1 1-2 2-2h1v7H8c-1 0-2-1-2-2z" fill="none" stroke="${STROKE}" stroke-width="1.4"/>
    <path d="M15 14v-3c0-1 1-2 2-2h1v7h-2c-1 0-2-1-2-2z" fill="none" stroke="${STROKE}" stroke-width="1.4"/>
    <path d="M8 10V8c0-1 1-2 2-2h1v4H9c-1 0-1-1-1-2z" fill="${STROKE}" opacity=".85"/>
    <path d="M14 10V8c0-1 1-2 2-2h1v4h-1c-1 0-1-1-1-2z" fill="${STROKE}" opacity=".85"/>`,
  ),
  "staff-shield": svgIcon(
    `<path d="M6 4v16M6 4l3 2M6 10l3 2" fill="none" stroke="${STROKE}" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M14 5v14c0 2 4 2 4 0V5c0-2-4-2-4 0z" fill="none" stroke="${STROKE}" stroke-width="1.5"/>`,
  ),
  greatstaff: imgIcon("/wire/assets/items/cajado_rustico.svg"),
  bow: imgIcon("/wire/assets/items/arco_curto.svg"),
};

export function weaponSetIconMarkup(id: WeaponSetId): string {
  return ICON_BODY[id];
}
