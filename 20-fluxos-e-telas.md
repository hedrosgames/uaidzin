# UAIDZIN

## Fluxos e Telas

## Abertura

**Login → (configurações opcionais) → Continuar/Novo → Cidade**

### Tela de login

Primeira tela ao abrir o jogo.

1. Jogador digita login e senha.
2. Pode marcar **salvar credenciais** no dispositivo.
3. Pode usar **Entrar com Google** (simulado; sem backend).
4. Botão **Entrar** habilita apenas com login e senha preenchidos.
5. Erro: campos vazios ou credenciais inválidas — mensagem na própria tela.
6. Sucesso: confirmação breve e avança para o fluxo de continuação ou novo jogo.
7. **Opções** abre as configurações do jogo (áudio, vídeo, controles) por cima do login.

Não há cadastro de conta real. Credenciais salvas ficam só no dispositivo (preferência local).

## Fluxo Principal

**Cidade → Seleção de Dungeon → Dungeon → Resultado → Cidade**

A partir da cidade, o jogador acessa a interface de seleção de dungeon.

Depois de entrar, começa um contador de 10 minutos. Quando o tempo termina, o jogador retorna para a cidade. Se for derrotado antes disso, também retorna.

## Cidade

Telas e interfaces previstas:

- Personagem.
- Atributos.
- Skills.
- Equipamentos.
- Inventário.
- Lojas.
- Quests.
- Seleção de dungeon.
- Evolução.
- Reset.

## Dungeon

A HUD da dungeon precisa comunicar o estado do personagem, o tempo restante, as skills e as informações essenciais de combate.

## Resultado

Ao terminar a dungeon, o jogador deve visualizar os principais resultados da atividade, incluindo experiência, loot e outros recursos obtidos.


## Proposta de Design

### Primeira entrada

0. Login (ou Google simulado) na tela inicial.
1. **Hub 3D de seleção de personagem** (estilo WYD): salão com as 4 classes em linha no tapete.
   - Clique na figura ou no nome da lista → zoom no centro + painel de info (classe, atributos, ouro).
   - Botão **Entrar** leva o personagem escolhido para a cidade.
   - Criar / Excluir na lateral.
2. (Se for personagem novo) escolher classe e nome no hub.
3. Aparecer na cidade com tutorial curto de movimento.
4. Falar com o Guarda do Portal.
5. Entrar na D1 sem custo.
6. Completar ou morrer e voltar.

### Morte na dungeon

1. Personagem cai.
2. Tela simples informa que os recursos obtidos foram mantidos.
3. Botão de retorno à cidade.
4. Nenhuma perda de inventário ou Ouro.

### Conclusão por tempo

1. Contador chega a zero.
2. Tela de resultado: experiência ganha, Ouro, itens.
3. Retorno automático à cidade.

### Level up

- Feedback na HUD sem abrir tela.
- Pontos de atributo ficam pendentes até o jogador distribuir.

### Loot

- Item entra no inventário.
- Toast com nome e raridade.
- Se inventário cheio: mensagem de perda do item.

### Evolução

1. Atingir o nível máximo da etapa.
2. Falar com o Sábio.
3. Confirmar custo.
4. Personagem inicia a nova etapa no nível 1 com patrimônio permanente.

### Reset

1. Atingir o nível máximo da etapa.
2. Falar com o Sábio e escolher reset.
3. Confirmar Ouro e material.
4. Voltar ao nível 1 da mesma etapa com 1.000 pontos adicionais.

## Pendências

- Fluxo de criação de personagem com nome e aparência.
- Fluxo de primeira distribuição de atributos.
- Detalhe da tela de opções (além do overlay a partir do login).
