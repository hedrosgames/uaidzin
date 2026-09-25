# Fire Burst 2D

Arte e animação 2D aprovadas pelo Felipe em 24/09/2026. O HTML original do Desktop permanece intacto. A prévia 3D e a integração das cinco correntes são acompanhadas separadamente em X9/X10.

## Arquivos

| Arquivo | Uso |
|---|---|
| `Fire Burst.html` | Animação independente, offline, com canvas transparente e sem interface |
| `fire-burst-art.png` | Arte-base estática, gerada por IA, RGBA 1920×1080 |
| `fire-burst-animation.png` | APNG animado com transparência, 800×450 |
| `fire-burst-spritesheet.png` | Sequência RGBA, células de 800×450, oito colunas |
| `fire-burst-animation.json` | Quantidade de quadros, duração, ordem e resultados da exportação |

O PNG de arte-base é uma referência estática. A animação usa curvas e sprites de chamas procedurais em Canvas2D, não uma animação quadro a quadro desse PNG.

## Visualização

Abra `Fire Burst.html`. Para conferir sobre fundo escuro, acrescente `?bg=dark` à URL. O fundo é apenas da página; não entra nos pixels do canvas nem nos arquivos exportados.

`?bg=dark&time=0.9` mostra um quadro pausado. Sem parâmetros, o efeito se repete automaticamente.

Um visualizador que não suporta APNG pode mostrar somente o primeiro quadro transparente. Abra o APNG em um navegador compatível.

## Uso dos quadros

A spritesheet segue da esquerda para a direita, de cima para baixo, a 24 fps. Use apenas `count` células indicadas no JSON; as células restantes da última linha são vazias. Preserve o retângulo de cada quadro para manter o ponto de origem estável.

Os arquivos usam alfa RGBA convencional. Não dependem de composição aditiva. Tempos e escalas são escolhas desta proposta visual, não números de balanceamento do jogo.

## Reexportação e verificação

Com Python, Pillow e `agent-browser` disponíveis:

```powershell
py "C:\GameProjects\uaidzin\visual\fire-burst-art\export.py"
```

O exportador usa a aba incorporada do Factory quando configurada e abre somente o HTML local. Verifica render determinístico, ausência de interface, margens sem cortes, dissipação completa e duração do APNG. Regrava apenas as exportações e seus metadados nesta pasta.
