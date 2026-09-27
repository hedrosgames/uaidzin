import type { WireContext } from "./types";

export interface SageTopic {
  id: string;
  title: string;
  html: string;
}

export interface SageTab {
  label: string;
  topics: SageTopic[];
}

export const SAGE_DOCS: Record<string, SageTab> = {
  fundamentos: {
    label: "Fundamentos",
    topics: [
      {
        id: "ciclo",
        title: "O ciclo do aventureiro",
        html:
          "<p>UAIDZIN gira em torno de um ciclo simples e repetível.</p>" +
          "<p><strong>Cidade → Preparação → Dungeon → Farm → Retorno → Progressão → Nova Dungeon</strong></p>" +
          "<p>Na cidade você prepara o personagem. Na dungeon, tem dez minutos para farmar. Ao acabar o tempo — ou se cair — volta à cidade com o que já conquistou.</p>" +
          "<p>O personagem é permanente. Equipamento, inventário, Ouro e conquistas acompanham você entre as entradas.</p>",
      },
      {
        id: "cidade",
        title: "A cidade",
        html:
          "<p>A cidade é o hub permanente. É um espaço 3D explorável onde ficam os serviços do RPG.</p>" +
          "<p>Aproxime-se de um NPC e clique nele para abrir o serviço correspondente. O personagem permanece na cidade enquanto a interface estiver aberta.</p>" +
          "<ul>" +
          "<li><strong>Guarda do Portal</strong> — escolhe e entra em dungeons.</li>" +
          "<li><strong>Mercador</strong> e <strong>Ferreiro</strong> — compra, venda e preparação.</li>" +
          "<li><strong>Mestre de Técnicas</strong> — compra de skills.</li>" +
          "<li><strong>Sábio</strong> — tutorial e códice: ciclo do jogo, evolução e reset.</li>" +
          "<li><strong>Compositor</strong> — composição de itens.</li>" +
          "<li><strong>Baú</strong> — armazenamento da conta.</li>" +
          "<li><strong>Mestre de Quests</strong> — missões.</li>" +
          "</ul>",
      },
      {
        id: "interface",
        title: "Painéis e atalhos",
        html:
          "<p>Três painéis acompanham o aventureiro na cidade e no farm:</p>" +
          "<ul>" +
          "<li><strong>C</strong> — Personagem: atributos, especialização e poder.</li>" +
          "<li><strong>K</strong> — Técnicas: árvores de skill e barra inferior.</li>" +
          "<li><strong>I</strong> — Equipamento e bolsa.</li>" +
          "</ul>" +
          "<p><strong>Esc</strong> fecha as janelas abertas. NPCs de serviço abrem pelo clique, sem tecla extra.</p>" +
          "<p>Build e equipamentos abrem pelos atalhos ou pelos NPCs próprios — nunca por esta tela do Sábio.</p>",
      },
      {
        id: "movimento",
        title: "Movimento e câmera",
        html:
          "<p>Você controla o personagem em terceira pessoa isométrica. O movimento decide onde farmar e quando reposicionar.</p>" +
          "<p>O jogo não exige movimento constante. Parar em uma posição boa é parte da habilidade do jogador.</p>" +
          "<p>Autofarm não anda sozinho: o personagem continua combatendo no lugar em que você o deixou até ser movido de novo.</p>",
      },
      {
        id: "combate",
        title: "Combate",
        html:
          "<p>O combate mistura posicionamento e automação.</p>" +
          "<p>O <strong>ataque básico</strong> é sempre automático e depende da arma. Ele só acontece enquanto o personagem está parado. Não há botão para ligar ou desligar o básico.</p>" +
          "<p>As <strong>skills</strong> podem ser automáticas ou manuais. Você pode desligar a automação de cada skill, mas o ataque básico permanece automático.</p>" +
          "<p>Acerto e esquiva vêm dos atributos e do sistema de combate. Não existe esquiva manual no momento do golpe.</p>",
      },
      {
        id: "inimigos",
        title: "Inimigos e spawns",
        html:
          "<p>Cada dungeon define onde os inimigos surgem e como se comportam.</p>" +
          "<ul>" +
          "<li><strong>Guarda estático</strong> — permanece perto do spawn.</li>" +
          "<li><strong>Perseguidor</strong> — aproxima-se do personagem.</li>" +
          "<li><strong>Atirador</strong> — pressiona à distância.</li>" +
          "</ul>" +
          "<p>Alguns encontros pedem que você vá até o spawn. Outros pedem que você se afaste ou use cobertura de distância. Chefes aparecem em arenas específicas.</p>",
      },
      {
        id: "dungeon-basico",
        title: "Dentro da dungeon",
        html:
          "<p>Cada dungeon é uma área fechada, feita à mão, com arenas conectadas. Não há geração procedural nem escolha de caminho.</p>" +
          "<p>Ao entrar, o contador de <strong>10 minutos</strong> começa na hora. O tempo não pausa nem renova entre arenas.</p>" +
          "<p>Quando o tempo zera, a entrada termina e você retorna à cidade. Se o personagem morrer antes, também volta — e o que já foi obtido permanece.</p>",
      },
      {
        id: "sobrevivencia",
        title: "Sobrevivência",
        html:
          "<p>HP e MP limitam quanto tempo você aguenta no farm. MP alimenta skills; HP cai sob pressão de perseguidores e área.</p>" +
          "<p>Morrer não apaga o progresso da conta. Você perde o restante da janela de 10 minutos daquela entrada e volta à cidade para se preparar de novo.</p>",
      },
    ],
  },
  progressao: {
    label: "Progressão",
    topics: [
      {
        id: "niveis",
        title: "Níveis e atributos",
        html:
          "<p>Ao subir de nível você ganha pontos de atributo e pontos de skill.</p>" +
          "<p>Os atributos principais são <strong>FOR</strong>, <strong>DES</strong>, <strong>CONS</strong> e <strong>INT</strong>. Eles alimentam ataque, defesa, vitalidade e poder mágico conforme a classe.</p>" +
          "<p>Distribua os pontos no painel Personagem (<strong>C</strong>). Pontos não gastos ficam guardados até você aplicá-los.</p>",
      },
      {
        id: "evolucao",
        title: "Mortal, Arch e Cele",
        html:
          "<p>A jornada tem três etapas de evolução:</p>" +
          "<ul>" +
          "<li><strong>Mortal</strong> — níveis 1 a 400.</li>" +
          "<li><strong>Arch</strong> — níveis 1 a 400.</li>" +
          "<li><strong>Cele</strong> — níveis 1 a 200.</li>" +
          "</ul>" +
          "<p>Cada etapa tem seu próprio ciclo de nível e de reset. O Guarda do Portal separa as dungeons por evolução. Mortal → Arch exige nível 400 e o item de evolução; Arch e Cele liberam suas próprias faixas de dungeon.</p>",
      },
      {
        id: "skills",
        title: "Técnicas e especialização",
        html:
          "<p>Cada classe possui três árvores de combate com oito skills compráveis. A oitava skill só pode ser aprendida em uma árvore.</p>" +
          "<p>No <strong>Mestre de Técnicas</strong> você compra skills com pontos e Ouro, em ordem: a skill 2 exige a 1, e assim por diante. Skills de livro ficam na árvore Special e não se compram ali.</p>" +
          "<p>Pontos de especialização reforçam uma árvore. São separados dos pontos de skill e também podem ser redistribuídos na cidade. O painel de técnicas abre com <strong>K</strong>.</p>",
      },
      {
        id: "equip",
        title: "Equipamento e bolsa",
        html:
          "<p>Armas e armaduras mudam o poder de combate. A bolsa guarda o que dropa no farm e o que você compra na cidade.</p>" +
          "<p>No painel Equipamento (<strong>I</strong>) você veste, remove e organiza itens. A lixeira descarta com confirmação. O botão Organizar compacta e ordena a bolsa ativa.</p>" +
          "<p>Itens têm raridade. Refine no Ferreiro para empurrar o poder além do base.</p>",
      },
      {
        id: "bau",
        title: "Baú e Ouro",
        html:
          "<p>O baú da cidade guarda itens e Ouro da <strong>conta</strong>, separado da bolsa de combate do personagem.</p>" +
          "<p>Arraste entre bolsa e baú. Deposite ou saque Ouro pelos campos do painel. Excluir um personagem não esvazia o baú da conta.</p>",
      },
      {
        id: "lojas",
        title: "Mercador e Ferreiro",
        html:
          "<p>Mercador e Ferreiro usam o mesmo tipo de vitrine. Os cards mostram nome e quantidade; o preço aparece no detalhe ao passar o mouse.</p>" +
          "<p>O Mercador cobre consumíveis, itens de entrada de dungeon e utilidades. O Ferreiro cobre catálogo e refino. Use o inventário ao lado para comparar o que já carrega com o que está à venda.</p>",
      },
      {
        id: "portal",
        title: "Entrar em dungeons",
        html:
          "<p>Fale com o <strong>Guarda do Portal</strong>. Escolha a aba da sua evolução e leia os cards: descrição, faixa de nível, tempo da run, tipos de inimigo e item de entrada com ícone.</p>" +
          "<p>O filtro <strong>Disponíveis</strong> esconde dungeons fora da sua faixa. Dungeons acima ou abaixo do intervalo não aceitam entrada.</p>" +
          "<p>Algumas dungeons pedem um item de entrada. Confirme a expedição — ou marque para não pedir confirmação de novo — e o item é consumido antes do teleporte.</p>",
      },
      {
        id: "reset",
        title: "Reset e redistribuição",
        html:
          "<p>Reset e redistribuição acontecem na cidade, sob custo em Ouro que cresce com o nível.</p>" +
          "<p>O reset remove nível, atributos e skills do ciclo atual e devolve o personagem ao nível 1 da mesma evolução. Equipamento, refine, inventário e etapa de evolução permanecem.</p>" +
          "<p>Atributos e skills podem ser redistribuídos para experimentar builds. Especialização tem custo menor. Skills de livro permanecem após o reset. Leia este códice antes do nível 400 para planejar a passagem Mortal → Arch.</p>",
      },
      {
        id: "classes",
        title: "As quatro classes",
        html:
          "<p>No lançamento há quatro caminhos:</p>" +
          "<ul>" +
          "<li><strong>TK · Thegn Knight</strong> — linha de frente e pressão.</li>" +
          "<li><strong>FM · Frost Maiden</strong> — magia e controle.</li>" +
          "<li><strong>BM · Beast Master</strong> — invocações e área.</li>" +
          "<li><strong>HT · Huntress</strong> — alcance, marcas e caça.</li>" +
          "</ul>" +
          "<p>A classe define árvores, fantasias de combate e prioridades de atributo. Bolsa e equipamento ficam com o personagem; o baú é da conta e é compartilhado entre personagens.</p>",
      },
    ],
  },
};

export interface SagePanel {
  renderHtml(): string;
  bindEvents(): void;
  sync(): void;
}

export function createSagePanel(container: HTMLElement, ctx: WireContext): SagePanel {
  let sageTabId = "fundamentos";
  let sageTopicId = SAGE_DOCS.fundamentos?.topics[0]?.id || "ciclo";

  function renderHtml(): string {
    return `
<section class="win is-closed" id="p-sage">
  <div class="win-h">Sábio de Aurelion <span class="x" data-close="sage">×</span></div>
  <div class="win-main">
    <svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner tr" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner bl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <svg class="corner br" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
    <div class="win-b" style="display:flex;flex-direction:column;gap:8px;height:100%">
      <div class="sage-tabs" id="sageTabs" style="display:flex;gap:4px">
        <button type="button" class="bag-tab on" data-sage-tab="fundamentos">Fundamentos</button>
        <button type="button" class="bag-tab" data-sage-tab="progressao">Progressão</button>
      </div>
      <div style="display:flex;gap:10px;flex:1;min-height:0">
        <nav class="sage-index" id="sageIndex" aria-label="Índice" style="width:200px;overflow:auto;display:flex;flex-direction:column;gap:3px;border-right:1px solid #3a2e22;padding-right:6px"></nav>
        <article class="sage-text" id="sageText" style="flex:1;overflow:auto;padding:4px 8px;font-size:13px;line-height:1.5"></article>
      </div>
    </div>
  </div>
</section>
`;
  }

  function paintSageText(): void {
    const textEl = container.querySelector<HTMLElement>("#sageText");
    const tab = SAGE_DOCS[sageTabId];
    if (!tab || !textEl) return;
    const topic = tab.topics.find((t) => t.id === sageTopicId) || tab.topics[0];
    if (!topic) {
      textEl.innerHTML = "";
      return;
    }
    sageTopicId = topic.id;
    textEl.innerHTML = `<h3 style="color:var(--gold-hi);margin:0 0 8px 0;font-size:15px">${topic.title}</h3>${topic.html}`;
    textEl.scrollTop = 0;
  }

  function paintSageIndex(): void {
    const indexEl = container.querySelector<HTMLElement>("#sageIndex");
    const tab = SAGE_DOCS[sageTabId];
    if (!tab || !indexEl) return;
    indexEl.innerHTML = "";
    tab.topics.forEach((topic) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = topic.title;
      btn.className = "bag-tab" + (topic.id === sageTopicId ? " on" : "");
      btn.style.textAlign = "left";
      btn.style.width = "100%";
      btn.addEventListener("click", () => {
        sageTopicId = topic.id;
        paintSageIndex();
        paintSageText();
      });
      indexEl.appendChild(btn);
    });
    indexEl.scrollTop = 0;
  }

  function paintSage(): void {
    const tabsEl = container.querySelector<HTMLElement>("#sageTabs");
    if (tabsEl) {
      tabsEl.querySelectorAll<HTMLButtonElement>("[data-sage-tab]").forEach((btn) => {
        btn.classList.toggle("on", btn.getAttribute("data-sage-tab") === sageTabId);
      });
    }
    paintSageIndex();
    paintSageText();
  }

  function bindEvents(): void {
    const win = container.querySelector<HTMLElement>("#p-sage");
    if (!win) return;

    win.querySelector("[data-close='sage']")?.addEventListener("click", () => {
      ctx.closePanel("sage");
    });

    const tabsEl = win.querySelector<HTMLElement>("#sageTabs");
    if (tabsEl) {
      tabsEl.querySelectorAll<HTMLButtonElement>("[data-sage-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-sage-tab");
          if (!id || !SAGE_DOCS[id]) return;
          sageTabId = id;
          sageTopicId = SAGE_DOCS[id]!.topics[0]?.id || "";
          paintSage();
        });
      });
    }
  }

  function sync(): void {
    paintSage();
  }

  return {
    renderHtml,
    bindEvents,
    sync,
  };
}
