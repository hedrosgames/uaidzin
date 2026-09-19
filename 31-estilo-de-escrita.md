# UAIDZIN

## Estilo de Escrita do GDD

Este arquivo define o padrão de escrita que deve ser seguido em todos os documentos do GDD de UAIDZIN. Ele existe para manter a documentação consistente mesmo quando novos arquivos forem criados ou textos antigos forem revisados.

## Objetivo

A documentação deve parecer escrita por uma equipe de desenvolvimento de jogos que conhece o projeto e está registrando suas decisões de forma prática.

O texto deve ser fácil de ler, direto e específico. O GDD deve explicar o jogo, e não tentar impressionar quem está lendo.

## Tom

Use um tom profissional, natural e objetivo.

Escreva como uma pessoa explicaria o projeto para outra pessoa da equipe.

Evite linguagem acadêmica, burocrática, corporativa ou excessivamente formal.

Evite frases que pareçam introduções genéricas de textos produzidos por IA.

Quando o assunto for uma fantasia de jogador ou uma sensação de gameplay, a linguagem pode ser mais humana e concreta.

## Construção das Frases

Prefira frases curtas e diretas.

Uma ideia principal deve caber em uma frase sempre que possível.

Prefira voz ativa. Exemplo: "O jogador escolhe a dungeon" em vez de "A dungeon é escolhida pelo jogador".

Evite repetir a mesma informação em parágrafos consecutivos. Se uma regra já foi explicada, complemente-a em vez de reescrevê-la sem necessidade.

Evite palavras vagas como "deve proporcionar uma experiência única" quando for possível explicar exatamente o que acontece no jogo.

## Travessões

Não usar travessões na prosa do GDD.

Não usar o caractere de travessão para separar ideias dentro de frases ou títulos.

Quando uma relação precisar ser apresentada, usar dois-pontos, ponto, vírgula ou uma estrutura de lista.

Exemplo ruim: "O combate é simples — a profundidade está na progressão."

Exemplo correto: "O combate é simples. A profundidade está na progressão."

Listas Markdown continuam usando a sintaxe normal de lista com hífen.

## Vocabulário

Usar os termos do glossário de forma consistente.

Preferir "skill" ou "skills" quando estiver falando das habilidades do sistema, conforme o contexto do GDD.

Usar "árvore de skills" em vez de "galho de skills".

Usar "pontos de atributo adicionais" para os pontos concedidos pelo reset.

Usar "reset" para a mecânica de reinício do ciclo.

Usar "Mortal", "Arch" e "Cele" como nomes das três etapas de evolução.

Usar "dungeon" para as áreas fechadas de farm e "arena" para os espaços de combate dentro delas.

Usar "Ouro" como nome da moeda principal.

Usar "loot" para os itens e recursos obtidos durante o combate.

Usar "autofarm" para a automação do combate. Autofarm nunca deve ser descrito como movimentação autônoma, porque o personagem não se movimenta sozinho.

## Números e Regras

Quando uma regra já estiver definida, escrever o valor diretamente.

Exemplo: "Cada entrada em uma dungeon dura 10 minutos."

Evitar expressões vagas como "cerca de 10 minutos" quando a regra definida for exatamente 10 minutos.

Para a progressão atual, usar sempre:

- Mortal: nível 1 a 400.
- Arch: nível 1 a 400.
- Cele: nível 1 a 200.

Um reset concede, como valor inicial de design, 1.000 pontos de atributo adicionais.

## Decisões e Pendências

Não inventar regras para preencher lacunas.

Quando uma definição ainda não foi tomada, registrar como pendência ou usar "ainda será definido".

Quando uma regra já foi decidida, não tratá-la como hipótese.

Valores marcados como iniciais ou provisórios devem continuar identificados dessa forma até que sejam validados como definitivos.

## Referências

As referências a outros jogos servem para explicar a intenção do sistema. Não usar a referência como se ela fosse uma regra do jogo.

Exemplo: "O reset é inspirado na estrutura de progressão de MU". Depois disso, explicar a regra específica de UAIDZIN.

## Prosa de Sistemas

Explique primeiro o que o sistema faz. Depois explique por que ele existe, quando isso for útil.

Exemplo:

"O ataque básico é automático e depende da arma equipada. O personagem não ataca enquanto está se movimentando. Por isso, o jogador precisa escolher uma posição antes de deixar o personagem atacar."

Evite transformar regras simples em textos longos.

## Prosa de Fantasia

Quando estiver descrevendo a fantasia do jogo, priorize ações e sensações concretas.

Evite frases genéricas como "o jogador terá uma experiência imersiva".

Prefira algo como: "O jogador encontra um spawn, posiciona o personagem e deixa o ataque automático fazer o trabalho enquanto decide se vale a pena mudar de posição."

## Estrutura dos Arquivos

Cada arquivo deve ter um título principal, seguido por seções objetivas.

Use subtítulos para separar sistemas diferentes.

Use listas quando houver vários itens independentes.

Use negrito para destacar regras importantes, números ou termos que precisam de atenção.

Não criar seções apenas para aumentar o tamanho do documento.

## Revisão Obrigatória

Antes de considerar um documento pronto:

1. Remover travessões da prosa.
2. Conferir se os termos seguem o glossário.
3. Conferir se as regras estão de acordo com os demais arquivos.
4. Remover repetições desnecessárias.
5. Trocar frases genéricas por descrições concretas.
6. Manter pendências claramente identificadas.
7. Conferir números, níveis e valores definidos.
8. Ler o texto inteiro procurando trechos que soem burocráticos, acadêmicos ou artificiais.

Este padrão deve ser aplicado a todo novo conteúdo e a toda revisão futura do GDD.