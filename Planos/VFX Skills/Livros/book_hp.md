# Vida — brief VFX de Livro

O perfil **Vida** (`book_hp`) existe hoje como `bookStub` com magnitude **0**. Não criar VFX de gameplay, proc ou buff até a mecânica ser definida. Este arquivo descreve somente o estudo visual de aquisição/desbloqueio.

## DIREÇÃO VISUAL

An open ivory spellbook releasing a vivid ruby heart and restorative red-gold light.

Estilo cartoon/stylized, livro físico 3D e Quarks de baixa contagem.

## COMPOSIÇÃO

1. **Book Open** — abre em 120–180 ms.
2. **Symbol Rise** — símbolo emerge em 180–320 ms.
3. **Orbit Accent** — 4–8 motes em órbita curta e assimétrica.
4. **Seal** — selo pequeno fecha a leitura.
5. **Cleanup** — tudo encerra em até 700 ms.

## REGRAS

Enquanto `book_hp` permanecer `bookStub`:
- sem cast;
- sem aura persistente;
- sem proc;
- sem sugerir dano, cura, cooldown ou bônus;
- sem registro de VFX dedicado como habilidade finalizada.

## RESULTADO FINAL

Estabelecer identidade para **Vida** sem inventar mecânica. Quando o efeito real for definido, atualizar este brief com contrato, layers, timing e QA antes da implementação.
