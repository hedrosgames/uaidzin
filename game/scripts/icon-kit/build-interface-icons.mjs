import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gameDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(gameDir, "public/assets/icons/interface-kit");
const icons = {
  menu: ["Menu", "M5 8h14M5 12h14M5 16h14"], close: ["Fechar", "M6 6l12 12M18 6L6 18"], settings: ["Configurações", "M12 4v2m0 12v2M4 12h2m12 0h2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"], inventory: ["Inventário", "M4 7h16v13H4zM3 4h18v3H3zM9 11h6"], character: ["Personagem", "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20c.4-3.4 2.8-5.2 7-5.2s6.6 1.8 7 5.2"], skills: ["Habilidades", "M12 3 14 9l6 3-6 2-2 7-2-7-6-2 6-3z"], map: ["Mapa", "M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14m6-12v14"], quest: ["Missões", "M6 4h12v16H6zM9 8h6m-6 4h6m-6 4h4"], shop: ["Loja", "M4 9h16l-1 11H5zM3 9l2-5h14l2 5M9 9a3 3 0 0 0 6 0"], chat: ["Chat", "M4 5h16v11H9l-5 4zM8 9h8m-8 4h5"], volume: ["Volume", "M4 10h4l5-4v12l-5-4H4zM16 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12"], mute: ["Silenciar", "M4 10h4l5-4v12l-5-4H4zM17 9l4 6m0-6-4 6"], fullscreen: ["Tela cheia", "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"], back: ["Voltar", "M19 12H5m7-7-7 7 7 7"], confirm: ["Confirmar", "M4 12l5 5L20 6"], cancel: ["Cancelar", "M6 6l12 12M18 6 6 18"], search: ["Buscar", "M15 15l5 5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"], filter: ["Filtrar", "M4 5h16l-6 7v6l-4 2v-8z"], sort: ["Ordenar", "M7 5v14m-3-3 3 3 3-3m7-11v14m-3-3 3 3 3-3"], plus: ["Adicionar", "M12 5v14m-7-7h14"], minus: ["Remover", "M5 12h14"], info: ["Informações", "M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"], help: ["Ajuda", "M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1.2 1.1-1.9 1.3-1.9 3.4m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"], mail: ["Mensagens", "M4 6h16v12H4zM4 7l8 6 8-6"], friends: ["Grupo", "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5M3 19c0-3 2-5 6-5s6 2 6 5m1-4c3 0 5 1 5 4"], party: ["Grupo de aventura", "M12 4l2 4 4 .6-3 3 .7 4.4-3.7-2-3.7 2 .7-4.4-3-3 4-.6zM5 18l2 2m10-2-2 2"], lock: ["Bloqueado", "M6 11h12v9H6zM8 11V8a4 4 0 1 1 8 0v3"], unlock: ["Desbloqueado", "M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.8-1"], refresh: ["Atualizar", "M20 7v5h-5M4 17v-5h5M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"], save: ["Salvar", "M5 4h13l2 2v14H4V4zM8 4v6h8V4m-8 16v-6h8v6"], trash: ["Excluir", "M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13m-6 3v7m3-7v7"], sound: ["Som", "M4 10h4l5-4v12l-5-4H4zM17 9l3 3-3 3"], exit: ["Sair", "M10 5H5v14h5m4-3 4-4-4-4m4 4H9"]
};
fs.mkdirSync(outDir, { recursive: true });
const manifest = Object.entries(icons).map(([id, [name, d]]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#d4a017" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="22" height="22" rx="3" stroke="#75603a" stroke-width="1.1"/><path d="${d}"/><path d="M2.5 5V2.5H5M19 2.5h2.5V5M21.5 19v2.5H19M5 21.5H2.5V19" stroke="#f0e6d0" stroke-width=".8"/></svg>`;
  fs.writeFileSync(path.join(outDir, `${id}.svg`), `${svg}\n`);
  return { id, name, path: `/assets/icons/interface-kit/${id}.svg`, format: "svg", status: "ready" };
});
fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.length} interface icons.`);
