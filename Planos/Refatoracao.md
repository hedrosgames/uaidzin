# Refatoração — implementação

Executar passos **1 → 10** na ordem. Cada passo = concluir **todos** os passos do plano filho indicado. Código em `game/` sem comentários.

## Comportamento

- Objetivo: reduzir acoplamento e bugs estruturais em save, sessão, input, HUD, itens, wire e render — **sem** mudar ids de skill, item, dungeon ou world.
- Personagem novo: atributos **5/5/5/5** (`AGENTS.md`); normalização única antes de qualquer `apply`.
- `loadSave`: três resultados — `found`, `absent`, `error`; **error** não cria personagem nem grava por cima.
- Gravação: um coordenador; flush por **seção** do perfil; perfil v4 inclui `meta`, `character`, `skills`, `skillLoadout`, `equipment`, `inventory`, `bags`, `buffs`, `progress`, `options`.
- Conta: registros separados `slots` e `vault`; cofre + inventário na **mesma** transação quando ouro/item cruza fronteira.
- Boot e runtime: **uma** versão de IndexedDB e o mesmo módulo de storage (ou boot gerado a partir do runtime).
- Segunda aba com o mesmo `profileId`: somente leitura + aviso (provisório: `navigator.locks`, fallback `BroadcastChannel`).
- Input: atalhos **C/K/I** iguais na cidade e na dungeon; `interact` só com UI fechada; debug só em `import.meta.env.DEV`.
- XP no nível máximo: não sobe além de `xpToNext` (provisório: congelar em `xpToNext`).
- `GamePanels.ts` só sai depois de aprender skill (ouro + save) existir na `WireApi` — ver `Planos/Skill TK linhagem 1.md` passo **14**.
- Lista de ciclo de vida VFX: `Planos/Skill TK linhagem 1.md` passo **23** — **não** duplicar em `Refatoracao 9.md`.
- Criptografia: AES-GCM em HTTP; XOR em `file://` (`AGENTS.md`); testes cobrem os dois caminhos.

| Plano filho | Foco |
|---|---|
| `Refatoracao 1.md` | Vitest + normalizar + carregar |
| `Refatoracao 2.md` | Coordenador + seções IDB + migração perfil 3→4 |
| `Refatoracao 3.md` | Conta 2→3 + boot unificado + lock de aba |
| `Refatoracao 4.md` | Input + tick + HUD diff |
| `Refatoracao 5.md` | Itens, equip, ouro, loja |
| `Refatoracao 6.md` | Extrair módulos de `CityGameSession` |
| `Refatoracao 7.md` | `WireApi` injetada |
| `Refatoracao 8.md` | Wire TS + remover legado |
| `Refatoracao 9.md` | VFX registro (após TK1 passo 23) |
| `Refatoracao 10.md` | Views async + diff |

## Passos

1. Executar `Planos/Refatoracao 1.md` passos **1 → 16**.
2. Executar `Planos/Refatoracao 2.md` passos **1 → 22**.
3. Executar `Planos/Refatoracao 3.md` passos **1 → 14**.
4. Executar `Planos/Refatoracao 4.md` passos **1 → 20** (coordenar com `Skill TK linhagem 1.md` passos **6–7** se barra 10 ainda pendente).
5. Executar `Planos/Refatoracao 5.md` passos **1 → 16**.
6. Executar `Planos/Refatoracao 6.md` passos **1 → 20**.
7. Executar `Planos/Refatoracao 7.md` passos **1 → 12**.
8. Executar `Planos/Refatoracao 8.md` passos **1 → 18**.
9. Executar `Planos/Refatoracao 9.md` passos **1 → 10** (após `Skill TK linhagem 1.md` passo **23**).
10. Executar `Planos/Refatoracao 10.md` passos **1 → 12**.

## Testar

- [ ] Passos 1–3: save lab admin/admin migra v3→v4 e conta v2→v3 sem perda; `npm run test:save` verde.
- [ ] Passos 4–5: `npm run bot` e combate/equip/inventário estáveis.
- [ ] Passos 6–8: smoke + login + Mestre/comprar skill/cofre sem `window.__UAIDZIN_WIRE__` em produção.
- [ ] Passos 9–10: `npm run vfx:runtime:qa` e labs de controller verdes.
- [ ] `cd game && npm run typecheck && npm run smoke` após cada plano filho.
