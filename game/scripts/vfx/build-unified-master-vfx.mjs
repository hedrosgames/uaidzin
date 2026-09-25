import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL_PROMPTS } from "./prompts-data.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.resolve(scriptDir, "../..");
const manifestPath = path.join(gameDir, "vfx/skills-manifest.json");
const desktopDir = "C:\\Users\\Felipe\\Desktop";
const targetHtml = path.join(desktopDir, "VFX TESTE.html");
const targetNoExt = path.join(desktopDir, "VFX TESTE");

const manifestSkills = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const enrichedSkills = manifestSkills.map((s, index) => {
  const promptData = SKILL_PROMPTS[s.id] || {
    title: s.name,
    concept: `Efeito visual para a habilidade ${s.name} da classe ${s.className}.`,
    colors: { primary: "#d4a017", secondary: "#c45c26", emissive: "#ffffff" },
    timeline: {
      cast: "Acúmulo de energia correspondente ao elemento.",
      action: "Disparo ou propagação da habilidade.",
      impact: "Detonação ou aplicação do efeito no alvo/área.",
      fade: "Dissipação gradual dos resíduos visuais."
    },
    promptText: `VFX Prompt for ${s.name} (${s.className} - ${s.treeLabel}): High-impact visual effect matching ${s.kind} archetype and ${s.element || "physical"} element.`
  };

  return {
    ...s,
    orderIndex: index,
    prompt: promptData
  };
});

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UAIDZIN — Master VFX Suite (VFX TESTE)</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>">

    <script src="CartoonFX_VFX_Quarks/libs/three.min.js"></script>
    <script src="CartoonFX_VFX_Quarks/libs/OrbitControls.js"></script>
    <script src="CartoonFX_VFX_Quarks/libs/three.quarks.min.js"></script>
    <script src="CartoonFX_VFX_Quarks/uaidzin_vfx_data.js"></script>

    <style>
        :root {
            --bg0: #0a0705;
            --bg1: #140e0a;
            --bg2: #1e150f;
            --panel: rgba(20, 14, 10, 0.96);
            --panel-card: rgba(30, 21, 15, 0.92);
            --panel-card-hover: rgba(52, 36, 26, 0.98);
            --panel-card-active: #4a2810;
            --iron: #3d3228;
            --iron-hi: #5a4a38;
            --gold: #d4a017;
            --gold-hi: #f6dfae;
            --gold-dim: #9e7611;
            --blood: #a33b3b;
            --ember: #ff8c2e;
            --ink: #f0e6d0;
            --ink-dim: #b8a88c;
            --ink-mute: #7a6b58;
            --cyan: #38bdf8;
            --green: #4ade80;
            --purple: #c084fc;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
            -webkit-user-select: none;
        }

        body, html {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: var(--bg0);
            font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
            color: var(--ink);
        }

        #viewport-container {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            background: #000;
        }

        #canvas-3d {
            width: 100%;
            height: 100%;
            display: block;
        }

        #combat-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 5;
            overflow: hidden;
        }

        .floating-dmg {
            position: absolute;
            font-weight: 800;
            font-size: 20px;
            font-family: ui-monospace, Consolas, monospace;
            text-shadow: 0 2px 4px #000, 0 0 10px rgba(0,0,0,0.8);
            transform: translate(-50%, -50%);
            transition: opacity 0.1s linear;
        }

        #header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(180deg, rgba(26, 18, 12, 0.98) 0%, rgba(14, 9, 6, 0.95) 100%);
            border-bottom: 1px solid var(--iron-hi);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 18px;
            z-index: 10;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8);
        }

        .header-title-box {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-title-box h1 {
            font-size: 15px;
            font-weight: 700;
            color: var(--gold-hi);
            letter-spacing: 1.2px;
            text-transform: uppercase;
        }

        .header-badge {
            background: var(--iron);
            border: 1px solid var(--gold);
            color: var(--gold);
            font-size: 11px;
            padding: 2px 8px;
            font-weight: 600;
            border-radius: 2px;
        }

        .nav-tabs {
            display: flex;
            gap: 4px;
            background: #0f0a07;
            padding: 3px;
            border: 1px solid var(--iron);
            border-radius: 2px;
        }

        .nav-tab {
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--ink-dim);
            cursor: pointer;
            border-radius: 2px;
            transition: all 0.15s ease;
        }

        .nav-tab:hover {
            color: var(--ink);
            background: rgba(255, 255, 255, 0.04);
        }

        .nav-tab.active {
            background: var(--panel-card-active);
            color: var(--gold-hi);
            border: 1px solid var(--gold);
            box-shadow: 0 0 10px rgba(212, 160, 23, 0.25);
        }

        .header-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn-ui {
            background: var(--panel-card);
            border: 1px solid var(--iron-hi);
            color: var(--ink);
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-ui:hover {
            border-color: var(--gold);
            background: var(--panel-card-hover);
            color: var(--gold-hi);
        }

        .btn-ui.active {
            border-color: var(--gold);
            background: var(--panel-card-active);
            color: var(--gold-hi);
            box-shadow: 0 0 8px rgba(212, 160, 23, 0.2);
        }

        .btn-primary {
            background: var(--blood);
            border-color: var(--ember);
            color: #ffffff;
        }

        .btn-primary:hover {
            background: #b94242;
            border-color: var(--gold-hi);
        }

        #sidebar-left {
            position: absolute;
            top: 60px;
            bottom: 0;
            left: 0;
            width: 350px;
            background: var(--panel);
            border-right: 1px solid var(--iron-hi);
            z-index: 10;
            display: flex;
            flex-direction: column;
            box-shadow: 4px 0 20px rgba(0,0,0,0.6);
        }

        .class-tabs {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-bottom: 1px solid var(--iron-hi);
            background: rgba(10, 7, 5, 0.95);
        }

        .class-tab {
            padding: 9px 4px;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: var(--ink-dim);
            transition: all 0.15s ease;
        }

        .class-tab:hover {
            color: var(--ink);
            background: rgba(255,255,255,0.03);
        }

        .class-tab.active {
            color: var(--gold);
            border-bottom-color: var(--gold);
            background: rgba(212, 160, 23, 0.1);
        }

        .filter-bar {
            padding: 10px 14px;
            border-bottom: 1px solid var(--iron);
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: var(--bg1);
        }

        .search-input {
            width: 100%;
            background: #0e0906;
            border: 1px solid var(--iron-hi);
            padding: 6px 10px;
            font-size: 11px;
            color: var(--ink);
            border-radius: 2px;
            outline: none;
        }

        .search-input:focus {
            border-color: var(--gold);
        }

        .tree-pills {
            display: flex;
            gap: 6px;
        }

        .tree-pill {
            flex: 1;
            padding: 4px;
            font-size: 10px;
            text-align: center;
            background: var(--panel-card);
            border: 1px solid var(--iron);
            border-radius: 2px;
            cursor: pointer;
            color: var(--ink-dim);
            transition: all 0.15s;
        }

        .tree-pill.active {
            border-color: var(--gold);
            color: var(--gold-hi);
            background: var(--panel-card-active);
        }

        .item-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .item-list::-webkit-scrollbar {
            width: 6px;
        }

        .item-list::-webkit-scrollbar-thumb {
            background: var(--iron);
            border-radius: 3px;
        }

        .vfx-card {
            background: var(--panel-card);
            border: 1px solid var(--iron);
            padding: 8px 10px;
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .vfx-card:hover {
            border-color: var(--iron-hi);
            background: var(--panel-card-hover);
        }

        .vfx-card.active {
            border-color: var(--gold);
            background: var(--panel-card-active);
            box-shadow: inset 0 0 8px rgba(212, 160, 23, 0.25);
        }

        .vfx-card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .vfx-card-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--ink);
        }

        .vfx-card.active .vfx-card-title {
            color: var(--gold-hi);
        }

        .vfx-card-badge {
            font-size: 9px;
            padding: 1px 5px;
            border-radius: 2px;
            background: #100a06;
            border: 1px solid var(--iron);
            color: var(--ink-dim);
            text-transform: uppercase;
        }

        .vfx-card-meta {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--ink-mute);
        }

        #sidebar-right {
            position: absolute;
            top: 60px;
            bottom: 0;
            right: 0;
            width: 440px;
            background: var(--panel);
            border-left: 1px solid var(--iron-hi);
            z-index: 10;
            display: flex;
            flex-direction: column;
            box-shadow: -4px 0 20px rgba(0,0,0,0.6);
            padding: 14px;
            gap: 12px;
            overflow-y: auto;
        }

        .prompt-header {
            border-bottom: 1px solid var(--iron-hi);
            padding-bottom: 10px;
        }

        .prompt-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--gold-hi);
            margin-bottom: 4px;
        }

        .prompt-sub {
            font-size: 11px;
            color: var(--ink-dim);
        }

        .prompt-box {
            background: #0d0805;
            border: 1px solid var(--iron-hi);
            padding: 10px 12px;
            border-radius: 2px;
            font-size: 11px;
            line-height: 1.5;
            color: #d1c7b7;
            position: relative;
        }

        .prompt-box-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--gold);
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .copy-btn {
            background: transparent;
            border: 1px solid var(--iron-hi);
            color: var(--gold);
            font-size: 10px;
            padding: 2px 6px;
            cursor: pointer;
            border-radius: 2px;
            transition: all 0.15s;
        }

        .copy-btn:hover {
            border-color: var(--gold);
            background: rgba(212,160,23,0.15);
        }

        .version-switcher {
            display: flex;
            gap: 6px;
            margin-top: 6px;
        }

        .version-btn {
            flex: 1;
            padding: 6px;
            font-size: 11px;
            text-align: center;
            background: var(--panel-card);
            border: 1px solid var(--iron);
            border-radius: 2px;
            cursor: pointer;
            color: var(--ink-dim);
            transition: all 0.15s;
        }

        .version-btn.active {
            border-color: var(--gold);
            color: var(--gold-hi);
            background: var(--panel-card-active);
        }

        .timeline-step {
            margin-bottom: 6px;
            padding-left: 8px;
            border-left: 2px solid var(--iron-hi);
        }

        .timeline-step-label {
            font-size: 10px;
            font-weight: 700;
            color: var(--ember);
            text-transform: uppercase;
        }

        .timeline-step-desc {
            font-size: 11px;
            color: var(--ink-dim);
            margin-top: 1px;
        }

        #bottom-bar {
            position: absolute;
            bottom: 20px;
            left: 370px;
            right: 460px;
            height: 48px;
            background: rgba(18, 12, 8, 0.94);
            border: 1px solid var(--iron-hi);
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            z-index: 10;
            box-shadow: 0 4px 15px rgba(0,0,0,0.7);
        }

        .playback-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .telemetry-group {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 11px;
            color: var(--ink-dim);
            font-family: ui-monospace, Consolas, monospace;
        }

        .telemetry-val {
            color: var(--gold-hi);
            font-weight: 700;
        }

        .hint-text {
            font-size: 11px;
            color: var(--ink-mute);
            margin-left: 6px;
        }
    </style>
</head>
<body>
    <div id="viewport-container">
        <canvas id="canvas-3d"></canvas>
    </div>
    <div id="combat-overlay"></div>

    <header id="header">
        <div class="header-title-box">
            <h1>UAIDZIN · Master VFX Suite</h1>
            <span class="header-badge">VFX TESTE</span>
        </div>

        <nav class="nav-tabs">
            <div class="nav-tab active" data-mode="skills-96">96 Skills & Prompts</div>
            <div class="nav-tab" data-mode="quarks-288">Skills 3 Versões (288)</div>
            <div class="nav-tab" data-mode="vfx-pack">VFX Pack (67)</div>
            <div class="nav-tab" data-mode="combat-runtime">Combate Runtime</div>
            <div class="nav-tab" data-mode="ambient-hub">Ambiente Hub</div>
            <div class="nav-tab" data-mode="fire-burst">Fire Burst Especial</div>
        </nav>

        <div class="header-controls">
            <button id="btn-theme-arena" class="btn-ui">Arena: Brasa</button>
            <button id="btn-cam-front" class="btn-ui">Frontal</button>
            <button id="btn-cam-iso" class="btn-ui active">Isométrica</button>
            <button id="btn-cam-top" class="btn-ui">Top-Down</button>
            <button id="btn-clear" class="btn-ui">Limpar</button>
        </div>
    </header>

    <aside id="sidebar-left">
        <div id="class-tabs-container" class="class-tabs">
            <div class="class-tab active" data-class="TK">TK</div>
            <div class="class-tab" data-class="FM">FM</div>
            <div class="class-tab" data-class="BM">BM</div>
            <div class="class-tab" data-class="HT">HT</div>
        </div>

        <div class="filter-bar">
            <input type="text" id="main-search" class="search-input" placeholder="Buscar efeito ou skill...">
            <div id="tree-pills-container" class="tree-pills">
                <div class="tree-pill active" data-tree="all">Todas (24)</div>
                <div class="tree-pill" data-tree="fisica">Física (8)</div>
                <div class="tree-pill" data-tree="controle">Controle (8)</div>
                <div class="tree-pill" data-tree="magia">Magia (8)</div>
            </div>
        </div>

        <div id="item-list" class="item-list"></div>
    </aside>

    <aside id="sidebar-right">
        <div class="prompt-header">
            <div id="details-title" class="prompt-title">Nome do Efeito</div>
            <div id="details-sub" class="prompt-sub">Metadados e contexto do jogo</div>
        </div>

        <div id="box-version-select" class="prompt-box" style="display: none;">
            <div class="prompt-box-title">Versão do Efeito (Composição)</div>
            <div class="version-switcher">
                <div class="version-btn active" data-v="0">V1 · Tática</div>
                <div class="version-btn" data-v="1">V2 · Orbital</div>
                <div class="version-btn" data-v="2">V3 · Ritual</div>
            </div>
        </div>

        <div id="box-prompt-canonical" class="prompt-box">
            <div class="prompt-box-title">
                <span>Prompt Canônico de VFX</span>
                <button id="btn-copy-prompt" class="copy-btn">Copiar Prompt</button>
            </div>
            <div id="prompt-canonical-text">Carregando prompt...</div>
        </div>

        <div id="box-concept" class="prompt-box">
            <div class="prompt-box-title"><span>Conceito & Atmosfera</span></div>
            <div id="prompt-concept-text">...</div>
        </div>

        <div id="box-colors" class="prompt-box">
            <div class="prompt-box-title"><span>Cores & Iluminação</span></div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <div id="chip-primary" style="width: 22px; height: 22px; border-radius: 2px; border: 1px solid var(--iron-hi);"></div>
                <div id="chip-secondary" style="width: 22px; height: 22px; border-radius: 2px; border: 1px solid var(--iron-hi);"></div>
                <div id="chip-emissive" style="width: 22px; height: 22px; border-radius: 2px; border: 1px solid var(--iron-hi);"></div>
                <span id="chips-labels" style="font-size: 11px; color: var(--ink-dim); font-family: ui-monospace, monospace;">#HEX</span>
            </div>
        </div>

        <div id="box-timeline" class="prompt-box">
            <div class="prompt-box-title"><span>Linha do Tempo Visual</span></div>
            <div class="timeline-step">
                <div class="timeline-step-label">1. Cast / Telegrafo</div>
                <div id="tl-cast" class="timeline-step-desc">...</div>
            </div>
            <div class="timeline-step">
                <div class="timeline-step-label">2. Ação / Disparo</div>
                <div id="tl-action" class="timeline-step-desc">...</div>
            </div>
            <div class="timeline-step">
                <div class="timeline-step-label">3. Impacto / Ápice</div>
                <div id="tl-impact" class="timeline-step-desc">...</div>
            </div>
            <div class="timeline-step">
                <div class="timeline-step-label">4. Dissipação</div>
                <div id="tl-fade" class="timeline-step-desc">...</div>
            </div>
        </div>

        <div id="box-stats" class="prompt-box">
            <div class="prompt-box-title"><span>Parâmetros Técnicos</span></div>
            <div id="details-stats" style="font-family: ui-monospace, monospace; font-size: 11px;">...</div>
        </div>
    </aside>

    <div id="bottom-bar">
        <div class="playback-group">
            <button id="btn-play" class="btn-ui btn-primary">Disparar [Espaço]</button>
            <button id="btn-loop" class="btn-ui">Loop: Desligado</button>
            <button id="btn-speed" class="btn-ui">Velocidade: 1.0x</button>
            <span class="hint-text">Clique no chão da arena 3D para conjurar nas coordenadas</span>
        </div>
        <div class="telemetry-group">
            <span>FPS: <span id="tel-fps" class="telemetry-val">60</span></span>
            <span>Partículas: <span id="tel-particles" class="telemetry-val">0</span></span>
            <span>Meshes: <span id="tel-meshes" class="telemetry-val">0</span></span>
        </div>
    </div>

    <script>
      window.UAIDZIN_96_CANONICAL = ${JSON.stringify(enrichedSkills, null, 2)};
    </script>

    <script>
    document.addEventListener('DOMContentLoaded', () => {
        let currentMode = 'skills-96';
        let selectedClass = 'TK';
        let selectedTree = 'all';
        let selectedSkillId = 'tk_fis_force_wave';
        let selectedVersionIndex = 0;
        let selectedPackId = null;
        let selectedCombatId = 'hit-flash';
        let selectedAmbientId = 'fountain-water';

        let isLooping = false;
        let timeScale = 1.0;
        let loopTimer = null;
        let arenaTheme = 'saloon';

        const canvas = document.getElementById('canvas-3d');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0705);
        scene.fog = new THREE.FogExp2(0x0a0705, 0.032);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(7, 6.5, 8.5);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.0, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 32;

        let batchRenderer = null;
        if (typeof QUARKS !== 'undefined' && QUARKS.BatchedRenderer) {
            batchRenderer = new QUARKS.BatchedRenderer();
            scene.add(batchRenderer);
        }

        const ambientLight = new THREE.AmbientLight(0xfff0dd, 0.45);
        scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffdfae, 0.85);
        mainLight.position.set(6, 14, 8);
        scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
        fillLight.position.set(-6, 8, -6);
        scene.add(fillLight);

        const arenaGroup = new THREE.Group();
        scene.add(arenaGroup);

        const groundGeo = new THREE.PlaneGeometry(36, 36);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x140e0a, roughness: 0.85, metalness: 0.15 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        arenaGroup.add(ground);

        const gridHelper = new THREE.GridHelper(30, 30, 0xd4a017, 0x3d3228);
        gridHelper.position.y = 0.01;
        arenaGroup.add(gridHelper);

        const ringGeo = new THREE.RingGeometry(5.8, 6.0, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        const arenaRing = new THREE.Mesh(ringGeo, ringMat);
        arenaRing.rotation.x = -Math.PI / 2;
        arenaRing.position.y = 0.02;
        arenaGroup.add(arenaRing);

        const dummyGroup = new THREE.Group();
        dummyGroup.position.set(0, 0, 0);
        const dummyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.7, 16);
        const dummyMat = new THREE.MeshStandardMaterial({ color: 0x3d3228, roughness: 0.6, metalness: 0.3 });
        const dummyMesh = new THREE.Mesh(dummyGeo, dummyMat);
        dummyMesh.position.y = 0.85;
        dummyGroup.add(dummyMesh);

        const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), new THREE.MeshStandardMaterial({ color: 0x5a4a38 }));
        dummyHead.position.y = 1.9;
        dummyGroup.add(dummyHead);
        scene.add(dummyGroup);

        function createTexture(drawFn) {
            const c = document.createElement('canvas');
            c.width = 128;
            c.height = 128;
            const ctx = c.getContext('2d');
            drawFn(ctx, 128, 128);
            const tex = new THREE.CanvasTexture(c);
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            return tex;
        }

        const textures = {
            flare: createTexture((ctx, w, h) => {
                const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
                grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
                grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
                grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }),
            spark: createTexture((ctx, w, h) => {
                ctx.translate(w/2, h/2);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(0, -h/2);
                ctx.quadraticCurveTo(w/12, 0, w/2, 0);
                ctx.quadraticCurveTo(w/12, 0, 0, h/2);
                ctx.quadraticCurveTo(-w/12, 0, -w/2, 0);
                ctx.quadraticCurveTo(-w/12, 0, 0, -h/2);
                ctx.fill();
            }),
            ring: createTexture((ctx, w, h) => {
                ctx.beginPath();
                ctx.arc(w/2, h/2, w*0.4, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = w*0.1;
                ctx.stroke();
            }),
            smoke: createTexture((ctx, w, h) => {
                const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
                grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)');
                grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }),
            star: createTexture((ctx, w, h) => {
                ctx.translate(w/2, h/2);
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(w/16, w/16);
                    ctx.lineTo(0, h/2);
                    ctx.lineTo(-w/16, w/16);
                    ctx.fill();
                    ctx.rotate(Math.PI / 2);
                }
            })
        };

        const activeParticles = [];
        const activeMeshes = [];
        const particleGroup = new THREE.Group();
        scene.add(particleGroup);

        function spawnParticle(opts) {
            const p = {
                mesh: null,
                pos: opts.pos ? opts.pos.clone() : new THREE.Vector3(),
                vel: opts.vel ? opts.vel.clone() : new THREE.Vector3(),
                acc: opts.acc ? opts.acc.clone() : new THREE.Vector3(),
                color: opts.color ? opts.color.clone() : new THREE.Color(0xffffff),
                endColor: opts.endColor ? opts.endColor.clone() : null,
                size: opts.size || 0.4,
                endSize: opts.endSize !== undefined ? opts.endSize : 0.0,
                life: 0,
                maxLife: opts.maxLife || 0.8,
                drag: opts.drag !== undefined ? opts.drag : 0.98,
                gravity: opts.gravity || 0,
                rotSpeed: opts.rotSpeed || (Math.random() - 0.5) * 4,
                rot: Math.random() * Math.PI * 2,
                opacity: opts.opacity || 1.0,
                tex: opts.tex || textures.flare
            };

            const mat = new THREE.SpriteMaterial({
                map: p.tex,
                color: p.color,
                transparent: true,
                opacity: p.opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(mat);
            sprite.position.copy(p.pos);
            sprite.scale.set(p.size, p.size, 1);
            particleGroup.add(sprite);
            p.mesh = sprite;
            p.material = mat;

            activeParticles.push(p);
            return p;
        }

        function spawnShockwave(pos, colorHex, startR, maxR, duration) {
            const geo = new THREE.RingGeometry(startR, startR + 0.35, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.copy(pos);
            mesh.position.y += 0.04;
            scene.add(mesh);

            activeMeshes.push({
                mesh,
                material: mat,
                life: 0,
                maxLife: duration,
                update: function(dt) {
                    this.life += dt;
                    const prog = Math.min(this.life / this.maxLife, 1);
                    const curR = startR + (maxR - startR) * prog;
                    mesh.geometry.dispose();
                    mesh.geometry = new THREE.RingGeometry(curR, curR + 0.35 * (1 - prog * 0.7), 32);
                    mat.opacity = (1 - prog) * 0.9;
                    if (this.life >= this.maxLife) {
                        scene.remove(mesh);
                        mesh.geometry.dispose();
                        mat.dispose();
                        return false;
                    }
                    return true;
                }
            });
        }

        function spawnPillar(pos, colorHex, radius, height, duration) {
            const geo = new THREE.CylinderGeometry(radius * 0.8, radius, height, 24, 1, true);
            const mat = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.position.y += height / 2;
            scene.add(mesh);

            activeMeshes.push({
                mesh,
                material: mat,
                life: 0,
                maxLife: duration,
                update: function(dt) {
                    this.life += dt;
                    const prog = Math.min(this.life / this.maxLife, 1);
                    mesh.scale.x = 1 + prog * 0.4;
                    mesh.scale.z = 1 + prog * 0.4;
                    mesh.rotation.y += dt * 3;
                    mat.opacity = (1 - prog) * 0.85;
                    if (this.life >= this.maxLife) {
                        scene.remove(mesh);
                        geo.dispose();
                        mat.dispose();
                        return false;
                    }
                    return true;
                }
            });
        }

        function spawnSlash(pos, dir, colorHex, scale, duration) {
            const geo = new THREE.RingGeometry(scale * 0.7, scale, 24, 1, 0, Math.PI * 0.95);
            const mat = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.95,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.position.y += 1.1;
            mesh.rotation.x = -Math.PI / 4;
            mesh.rotation.z = Math.random() * Math.PI * 2;
            scene.add(mesh);

            activeMeshes.push({
                mesh,
                material: mat,
                life: 0,
                maxLife: duration,
                update: function(dt) {
                    this.life += dt;
                    const prog = Math.min(this.life / this.maxLife, 1);
                    mesh.rotation.z += dt * 8;
                    mesh.scale.setScalar(1 + prog * 0.8);
                    mesh.position.addScaledVector(dir, dt * 6);
                    mat.opacity = (1 - prog) * 0.95;
                    if (this.life >= this.maxLife) {
                        scene.remove(mesh);
                        geo.dispose();
                        mat.dispose();
                        return false;
                    }
                    return true;
                }
            });
        }

        function spawnDome(pos, colorHex, radius, duration) {
            const geo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
            const mat = new THREE.MeshBasicMaterial({
                color: colorHex,
                wireframe: true,
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            scene.add(mesh);

            activeMeshes.push({
                mesh,
                material: mat,
                life: 0,
                maxLife: duration,
                update: function(dt) {
                    this.life += dt;
                    const prog = Math.min(this.life / this.maxLife, 1);
                    mesh.rotation.y += dt * 1.5;
                    mat.opacity = Math.sin(prog * Math.PI) * 0.75;
                    if (this.life >= this.maxLife) {
                        scene.remove(mesh);
                        geo.dispose();
                        mat.dispose();
                        return false;
                    }
                    return true;
                }
            });
        }

        function spawnProjectile(origin, target, colorHex, speed, onHit) {
            const dir = new THREE.Vector3().subVectors(target, origin).normalize();
            const dist = origin.distanceTo(target);
            let traveled = 0;
            const curPos = origin.clone();

            activeMeshes.push({
                update: function(dt) {
                    const step = speed * dt;
                    traveled += step;
                    curPos.addScaledVector(dir, step);

                    spawnParticle({
                        pos: curPos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2)),
                        vel: dir.clone().multiplyScalar(-speed * 0.15).add(new THREE.Vector3((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5)),
                        color: new THREE.Color(colorHex),
                        size: 0.55,
                        endSize: 0.05,
                        maxLife: 0.25,
                        tex: textures.flare
                    });

                    if (traveled >= dist) {
                        if (onHit) onHit(target);
                        return false;
                    }
                    return true;
                }
            });
        }

        function spawnFloatingDmg(text, worldPos, color = '#f0e6d0') {
            const el = document.createElement('div');
            el.className = 'floating-dmg';
            el.innerText = text;
            el.style.color = color;
            document.getElementById('combat-overlay').appendChild(el);

            const startTime = performance.now();
            const startPos = worldPos.clone().add(new THREE.Vector3(0, 1.8, 0));

            function updateDmg() {
                const elapsed = (performance.now() - startTime) / 1000;
                if (elapsed >= 0.85) {
                    el.remove();
                    return;
                }
                const curPos = startPos.clone().add(new THREE.Vector3(0, elapsed * 1.5, 0));
                const screenPos = curPos.project(camera);
                const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
                el.style.left = \`\${x}px\`;
                el.style.top = \`\${y}px\`;
                el.style.opacity = Math.max(0, 1 - (elapsed / 0.85));
                requestAnimationFrame(updateDmg);
            }
            updateDmg();
        }

        function triggerFireBurstSpecial(origin = new THREE.Vector3(-2, 0.05, -2), target = new THREE.Vector3(2, 0.05, 2)) {
            const p1 = origin.clone().add(new THREE.Vector3(0, 3.2, 1));
            const p2 = target.clone().add(new THREE.Vector3(0, 2.5, -1));
            const curve = new THREE.CubicBezierCurve3(origin, p1, p2, target);

            const count = 38;
            const chainGeo = new THREE.TorusGeometry(0.12, 0.03, 6, 12);
            const chainMat = new THREE.MeshStandardMaterial({
                color: 0x5a3322,
                emissive: 0xff4500,
                emissiveIntensity: 2.2,
                roughness: 0.3
            });
            const instanced = new THREE.InstancedMesh(chainGeo, chainMat, count);
            const dummyObj = new THREE.Object3D();

            for (let i = 0; i < count; i++) {
                const t = i / (count - 1);
                const pos = curve.getPoint(t);
                const tangent = curve.getTangent(t);
                dummyObj.position.copy(pos);
                dummyObj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
                dummyObj.updateMatrix();
                instanced.setMatrixAt(i, dummyObj.matrix);
            }
            instanced.instanceMatrix.needsUpdate = true;
            scene.add(instanced);

            setTimeout(() => {
                spawnShockwave(target, 0xff4500, 0.4, 4.2, 0.6);
                spawnPillar(target, 0xff8c2e, 2.4, 4.0, 0.5);
                for (let i = 0; i < 45; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const spd = 2 + Math.random() * 5;
                    spawnParticle({
                        pos: target.clone().add(new THREE.Vector3(0, 0.2, 0)),
                        vel: new THREE.Vector3(Math.cos(ang) * spd, 3 + Math.random() * 4, Math.sin(ang) * spd),
                        color: Math.random() > 0.4 ? new THREE.Color(0xff4500) : new THREE.Color(0xffbe6a),
                        size: 0.6,
                        endSize: 0.05,
                        gravity: -9,
                        drag: 0.94,
                        maxLife: 0.65,
                        tex: textures.spark
                    });
                }
            }, 280);

            setTimeout(() => {
                scene.remove(instanced);
                chainGeo.dispose();
                chainMat.dispose();
            }, 600);
        }

        function triggerCombatRuntime(type, pos = new THREE.Vector3(0, 0.05, 0)) {
            if (type === 'hit-flash') {
                dummyMat.emissive.setHex(0xff0000);
                setTimeout(() => dummyMat.emissive.setHex(0x000000), 140);
                spawnFloatingDmg('-148', dummyGroup.position, '#ff5555');
            } else if (type === 'attack-pulse') {
                dummyGroup.scale.set(1.3, 0.7, 1.3);
                setTimeout(() => dummyGroup.scale.set(1, 1, 1), 180);
            } else if (type === 'slash') {
                spawnSlash(pos, new THREE.Vector3(0, 0, 1), 0xd4a017, 2.2, 0.35);
                spawnFloatingDmg('CRÍTICO! 312', pos.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ffd700');
            } else if (type === 'skill-bolt') {
                const origin = new THREE.Vector3(-3, 1.2, -1);
                spawnProjectile(origin, dummyGroup.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xb07cff, 20, () => {
                    spawnShockwave(dummyGroup.position, 0xb07cff, 0.2, 1.6, 0.35);
                    spawnFloatingDmg('420', dummyGroup.position, '#c084fc');
                });
            } else if (type === 'skill-burst') {
                spawnShockwave(pos, 0xc45c26, 0.3, 2.8, 0.45);
            } else if (type === 'skill-zone') {
                spawnShockwave(pos, 0x6b7cff, 0.2, 1.8, 0.6);
            } else if (type === 'death-scale') {
                dummyGroup.scale.set(0.1, 0.1, 0.1);
                for (let i = 0; i < 25; i++) {
                    spawnParticle({
                        pos: dummyGroup.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
                        vel: new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2, (Math.random()-0.5)*3),
                        color: new THREE.Color(0x7a6b58),
                        size: 0.5,
                        endSize: 0.0,
                        maxLife: 0.6,
                        tex: textures.smoke
                    });
                }
                spawnFloatingDmg('K.O.!', dummyGroup.position, '#a33b3b');
                setTimeout(() => dummyGroup.scale.set(1, 1, 1), 900);
            } else if (type === 'level-up') {
                spawnShockwave(dummyGroup.position, 0xd4a017, 0.35, 3.2, 0.8);
                spawnPillar(dummyGroup.position, 0xf6dfae, 1.8, 4.5, 0.7);
                dummyGroup.scale.set(1.35, 1.22, 1.35);
                setTimeout(() => dummyGroup.scale.set(1, 1, 1), 220);
                spawnFloatingDmg('NÍVEL SUPERIOR!', dummyGroup.position, '#ffd700');
            }
        }

        function triggerAmbientHub(type, pos = new THREE.Vector3(0, 0.05, 0)) {
            if (type === 'fountain-water') {
                for (let i = 0; i < 28; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const r = Math.random() * 0.4;
                    spawnParticle({
                        pos: pos.clone().add(new THREE.Vector3(Math.cos(ang)*r, 0.2, Math.sin(ang)*r)),
                        vel: new THREE.Vector3(Math.cos(ang)*0.8, 2.5 + Math.random()*1.5, Math.sin(ang)*0.8),
                        color: new THREE.Color(0x38bdf8),
                        size: 0.35,
                        endSize: 0.05,
                        gravity: -6.5,
                        maxLife: 0.8,
                        tex: textures.flare
                    });
                }
                spawnShockwave(pos, 0x38bdf8, 0.2, 1.2, 0.4);
            } else if (type === 'brazier-flame') {
                for (let i = 0; i < 20; i++) {
                    spawnParticle({
                        pos: pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.3, 0.3, (Math.random()-0.5)*0.3)),
                        vel: new THREE.Vector3((Math.random()-0.5)*0.5, 1.8 + Math.random()*1.2, (Math.random()-0.5)*0.5),
                        color: Math.random() > 0.4 ? new THREE.Color(0xff8c2e) : new THREE.Color(0xa33b3b),
                        size: 0.45,
                        endSize: 0.05,
                        maxLife: 0.55,
                        tex: textures.smoke
                    });
                }
            } else if (type === 'ambient-embers') {
                for (let i = 0; i < 35; i++) {
                    spawnParticle({
                        pos: pos.clone().add(new THREE.Vector3((Math.random()-0.5)*6, 0.1, (Math.random()-0.5)*6)),
                        vel: new THREE.Vector3((Math.random()-0.5)*0.8, 0.6 + Math.random()*0.8, (Math.random()-0.5)*0.8),
                        color: new THREE.Color(0xd4a017),
                        size: 0.28,
                        endSize: 0.0,
                        maxLife: 1.6,
                        tex: textures.spark
                    });
                }
            } else if (type === 'portal-gate') {
                spawnPillar(pos, 0xc084fc, 1.4, 3.5, 1.2);
                spawnShockwave(pos, 0x38bdf8, 0.2, 2.2, 0.8);
                for (let i = 0; i < 30; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    spawnParticle({
                        pos: pos.clone().add(new THREE.Vector3(Math.cos(ang)*1.2, 1 + Math.random()*2, Math.sin(ang)*1.2)),
                        vel: new THREE.Vector3(-Math.cos(ang)*1.2, 0.5, -Math.sin(ang)*1.2),
                        color: new THREE.Color(0xa855f7),
                        size: 0.4,
                        endSize: 0.0,
                        maxLife: 0.8,
                        tex: textures.star
                    });
                }
            } else if (type === 'armor-aura') {
                spawnDome(pos, 0xa33b3b, 1.2, 1.2);
                for (let i = 0; i < 20; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    spawnParticle({
                        pos: pos.clone().add(new THREE.Vector3(Math.cos(ang)*0.6, 0.8, Math.sin(ang)*0.6)),
                        vel: new THREE.Vector3(0, 0.8, 0),
                        color: new THREE.Color(0xff8c2e),
                        size: 0.35,
                        endSize: 0.05,
                        maxLife: 0.6,
                        tex: textures.flare
                    });
                }
            }
        }

        function triggerProceduralSkill(skill, origin = new THREE.Vector3(0, 0.05, 0)) {
            const pCol = new THREE.Color(skill.prompt.colors.primary);
            const sCol = new THREE.Color(skill.prompt.colors.secondary);
            const forward = new THREE.Vector3(0, 0, 1);
            const targetPos = origin.clone().addScaledVector(forward, skill.range || 4.5);

            if (skill.shape === 'line' || skill.gameplay?.projectile || (skill.kind === 'damage' && (skill.range || 0) >= 5.0)) {
                spawnProjectile(origin.clone().add(new THREE.Vector3(0, 1.2, 0)), targetPos.clone().add(new THREE.Vector3(0, 0.5, 0)), pCol.getHex(), 18, (hitPos) => {
                    spawnShockwave(hitPos, pCol.getHex(), 0.2, 2.2, 0.4);
                    for (let i = 0; i < 35; i++) {
                        const ang = Math.random() * Math.PI * 2;
                        const spd = 2 + Math.random() * 6;
                        spawnParticle({
                            pos: hitPos.clone().add(new THREE.Vector3(0, 0.2, 0)),
                            vel: new THREE.Vector3(Math.cos(ang) * spd, 1 + Math.random() * 4, Math.sin(ang) * spd),
                            color: Math.random() > 0.4 ? pCol : sCol,
                            size: 0.55,
                            endSize: 0.0,
                            gravity: -8,
                            drag: 0.94,
                            maxLife: 0.5 + Math.random() * 0.4,
                            tex: textures.spark
                        });
                    }
                });
            } else if (skill.shape === 'aoe') {
                spawnShockwave(origin, pCol.getHex(), 0.3, skill.radius || 3.8, 0.6);
                spawnPillar(origin, sCol.getHex(), (skill.radius || 3.8) * 0.85, 3.5, 0.5);
                for (let i = 0; i < 45; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const r = Math.random() * (skill.radius || 3.5);
                    const spd = 1.5 + Math.random() * 4;
                    spawnParticle({
                        pos: origin.clone().add(new THREE.Vector3(Math.cos(ang) * r, 0.1, Math.sin(ang) * r)),
                        vel: new THREE.Vector3(Math.cos(ang) * spd, 3 + Math.random() * 5, Math.sin(ang) * spd),
                        color: Math.random() > 0.5 ? pCol : sCol,
                        size: 0.6,
                        endSize: 0.0,
                        gravity: -9.8,
                        drag: 0.95,
                        maxLife: 0.6 + Math.random() * 0.5,
                        tex: textures.smoke
                    });
                }
            } else if (skill.kind === 'buff' || skill.kind === 'heal' || skill.shape === 'self') {
                spawnDome(origin.clone().add(new THREE.Vector3(0, 0.1, 0)), pCol.getHex(), 1.6, 1.2);
                spawnShockwave(origin, sCol.getHex(), 0.2, 1.8, 0.7);
                for (let i = 0; i < 30; i++) {
                    const prog = i / 30;
                    const ang = prog * Math.PI * 4;
                    spawnParticle({
                        pos: origin.clone().add(new THREE.Vector3(Math.cos(ang) * 0.85, prog * 1.8, Math.sin(ang) * 0.85)),
                        vel: new THREE.Vector3((Math.random()-0.5)*0.3, 1.5 + Math.random()*1.5, (Math.random()-0.5)*0.3),
                        color: pCol,
                        size: 0.45,
                        endSize: 0.1,
                        maxLife: 0.8,
                        tex: skill.kind === 'heal' ? textures.star : textures.flare
                    });
                }
            } else if (skill.kind === 'summon' || skill.kind === 'transform') {
                spawnPillar(origin, pCol.getHex(), 2.2, 4.5, 0.8);
                spawnShockwave(origin, sCol.getHex(), 0.4, 3.2, 0.65);
                for (let i = 0; i < 40; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const spd = 2 + Math.random() * 4;
                    spawnParticle({
                        pos: origin.clone().add(new THREE.Vector3(0, 0.2, 0)),
                        vel: new THREE.Vector3(Math.cos(ang) * spd, 3 + Math.random() * 4, Math.sin(ang) * spd),
                        color: Math.random() > 0.5 ? pCol : sCol,
                        size: 0.55,
                        endSize: 0.05,
                        maxLife: 0.8,
                        tex: textures.smoke
                    });
                }
            } else {
                spawnSlash(origin, forward, pCol.getHex(), 2.2, 0.35);
                spawnShockwave(origin.clone().addScaledVector(forward, 1.2), sCol.getHex(), 0.2, 1.5, 0.3);
                for (let i = 0; i < 25; i++) {
                    spawnParticle({
                        pos: origin.clone().add(new THREE.Vector3((Math.random()-0.5)*0.8, 1.0 + (Math.random()-0.5)*0.6, 1.0)),
                        vel: forward.clone().multiplyScalar(4 + Math.random()*4).add(new THREE.Vector3((Math.random()-0.5)*3, (Math.random()-0.5)*2, 0)),
                        color: pCol,
                        size: 0.4,
                        endSize: 0.0,
                        drag: 0.92,
                        maxLife: 0.35,
                        tex: textures.spark
                    });
                }
            }
        }

        function triggerQuarksVersion(skillId, vIdx, origin = new THREE.Vector3(0, 0, 0)) {
            const baseSkill = window.UAIDZIN_96_CANONICAL.find(s => s.id === skillId);
            if (baseSkill) triggerProceduralSkill(baseSkill, origin);
        }

        function triggerPackVfx(packId, origin = new THREE.Vector3(0, 0, 0)) {
            spawnShockwave(origin, 0xd4a017, 0.2, 2.5, 0.5);
            for (let i = 0; i < 30; i++) {
                const ang = Math.random() * Math.PI * 2;
                spawnParticle({
                    pos: origin.clone().add(new THREE.Vector3(0, 0.5, 0)),
                    vel: new THREE.Vector3(Math.cos(ang)*3, 2 + Math.random()*3, Math.sin(ang)*3),
                    color: new THREE.Color(0xff8c2e),
                    size: 0.5,
                    endSize: 0.0,
                    maxLife: 0.6,
                    tex: textures.spark
                });
            }
        }

        function triggerCurrent(pos = new THREE.Vector3(0, 0.05, 0)) {
            if (currentMode === 'skills-96') {
                const skill = window.UAIDZIN_96_CANONICAL.find(s => s.id === selectedSkillId);
                if (skill) triggerProceduralSkill(skill, pos);
            } else if (currentMode === 'quarks-288') {
                triggerQuarksVersion(selectedSkillId, selectedVersionIndex, pos);
            } else if (currentMode === 'vfx-pack') {
                triggerPackVfx(selectedPackId, pos);
            } else if (currentMode === 'combat-runtime') {
                triggerCombatRuntime(selectedCombatId, pos);
            } else if (currentMode === 'ambient-hub') {
                triggerAmbientHub(selectedAmbientId, pos);
            } else if (currentMode === 'fire-burst') {
                triggerFireBurstSpecial(pos.clone().add(new THREE.Vector3(-2, 0, -2)), pos.clone().add(new THREE.Vector3(2, 0, 2)));
            }
        }

        function updateUI() {
            const canonicalSkills = window.UAIDZIN_96_CANONICAL;
            const skill = canonicalSkills.find(s => s.id === selectedSkillId) || canonicalSkills[0];

            if (currentMode === 'skills-96' || currentMode === 'quarks-288') {
                document.getElementById('details-title').innerText = skill.name;
                document.getElementById('details-sub').innerText = \`\${skill.className} (\${skill.classId}) · \${skill.treeLabel} · \${skill.element || 'Físico'}\`;

                document.getElementById('box-version-select').style.display = currentMode === 'quarks-288' ? 'block' : 'none';
                document.getElementById('box-prompt-canonical').style.display = 'block';
                document.getElementById('box-concept').style.display = 'block';
                document.getElementById('box-colors').style.display = 'block';
                document.getElementById('box-timeline').style.display = 'block';
                document.getElementById('box-stats').style.display = 'block';

                document.getElementById('prompt-canonical-text').innerText = skill.prompt.promptText;
                document.getElementById('prompt-concept-text').innerText = skill.prompt.concept;

                document.getElementById('chip-primary').style.backgroundColor = skill.prompt.colors.primary;
                document.getElementById('chip-secondary').style.backgroundColor = skill.prompt.colors.secondary;
                document.getElementById('chip-emissive').style.backgroundColor = skill.prompt.colors.emissive;
                document.getElementById('chips-labels').innerText = \`\${skill.prompt.colors.primary} / \${skill.prompt.colors.secondary}\`;

                document.getElementById('tl-cast').innerText = skill.prompt.timeline.cast;
                document.getElementById('tl-action').innerText = skill.prompt.timeline.action;
                document.getElementById('tl-impact').innerText = skill.prompt.timeline.impact;
                document.getElementById('tl-fade').innerText = skill.prompt.timeline.fade;

                document.getElementById('details-stats').innerHTML = \`
                    Tipo: \${skill.kind.toUpperCase()} | Forma: \${skill.shape.toUpperCase()}<br>
                    Alcance: \${skill.range}m | Raio: \${skill.radius ? skill.radius + 'm' : 'N/A'}<br>
                    Cooldown: \${skill.cooldown}s | Custo MP: \${skill.mp}
                \`;
            } else if (currentMode === 'vfx-pack') {
                document.getElementById('box-version-select').style.display = 'none';
                document.getElementById('box-prompt-canonical').style.display = 'none';
                document.getElementById('box-concept').style.display = 'block';
                document.getElementById('box-colors').style.display = 'none';
                document.getElementById('box-timeline').style.display = 'none';
                document.getElementById('box-stats').style.display = 'block';

                document.getElementById('details-title').innerText = selectedPackId || 'Efeito do Pack';
                document.getElementById('details-sub').innerText = 'Cartoon FX Remaster · Efeito Reusável';
                document.getElementById('prompt-concept-text').innerText = 'Efeito de partículas modular pré-construído em Quarks.';
                document.getElementById('details-stats').innerText = 'ID: ' + selectedPackId;
            } else if (currentMode === 'combat-runtime') {
                document.getElementById('box-version-select').style.display = 'none';
                document.getElementById('box-prompt-canonical').style.display = 'none';
                document.getElementById('box-concept').style.display = 'block';
                document.getElementById('box-colors').style.display = 'none';
                document.getElementById('box-timeline').style.display = 'none';
                document.getElementById('box-stats').style.display = 'block';

                document.getElementById('details-title').innerText = 'Combate: ' + selectedCombatId.toUpperCase();
                document.getElementById('details-sub').innerText = 'EffectManager · Feedback Visual';
                document.getElementById('prompt-concept-text').innerText = 'Efeito nativo disparado pelo sistema de combate e cálculo de dano do UAIDZIN.';
                document.getElementById('details-stats').innerText = 'Gatilho: Interação de combate / morte / level up.';
            } else if (currentMode === 'ambient-hub') {
                document.getElementById('box-version-select').style.display = 'none';
                document.getElementById('box-prompt-canonical').style.display = 'none';
                document.getElementById('box-concept').style.display = 'block';
                document.getElementById('box-colors').style.display = 'none';
                document.getElementById('box-timeline').style.display = 'none';
                document.getElementById('box-stats').style.display = 'block';

                document.getElementById('details-title').innerText = 'Ambiente: ' + selectedAmbientId.toUpperCase();
                document.getElementById('details-sub').innerText = 'Cenário & Hub do Salão / Dungeon';
                document.getElementById('prompt-concept-text').innerText = 'Efeito atmosférico contínuo do ambiente 3D.';
                document.getElementById('details-stats').innerText = 'Gatilho: Presença de cenário.';
            } else if (currentMode === 'fire-burst') {
                document.getElementById('box-version-select').style.display = 'none';
                document.getElementById('box-prompt-canonical').style.display = 'block';
                document.getElementById('box-concept').style.display = 'block';
                document.getElementById('box-colors').style.display = 'block';
                document.getElementById('box-timeline').style.display = 'block';
                document.getElementById('box-stats').style.display = 'block';

                document.getElementById('details-title').innerText = 'Fire Burst (Assinatura Dark Lord)';
                document.getElementById('details-sub').innerText = 'Thegn Knight · Físico Ofensivo · Curvas Bézier';
                document.getElementById('prompt-canonical-text').innerText = 'VFX Prompt: Master Fire Burst chain strike. Golden-bronze glowing chains launch in triple cubic Bezier arcs, slamming into the target area and releasing rolling volcanic magma shockwaves.';
                document.getElementById('prompt-concept-text').innerText = 'Habilidade lendária de correntes de fogo instanciadas inspirada no Dark Lord do clássico Mu Online.';
                document.getElementById('chip-primary').style.backgroundColor = '#ff4500';
                document.getElementById('chip-secondary').style.backgroundColor = '#d4a017';
                document.getElementById('chip-emissive').style.backgroundColor = '#ffffff';
                document.getElementById('chips-labels').innerText = '#ff4500 / #d4a017';
                document.getElementById('tl-cast').innerText = 'Acúmulo de brasa e tensão na mão.';
                document.getElementById('tl-action').innerText = '38 elos de corrente de fogo viajam sobre curva Bézier.';
                document.getElementById('tl-impact').innerText = 'Impacto colossal no solo com anel de choque duplo.';
                document.getElementById('tl-fade').innerText = 'Dissipação em fumaça negra vulcânica.';
                document.getElementById('details-stats').innerText = 'Geometria: TorusGeometry InstancedMesh + RingGeometry.';
            }
        }

        function renderSidebar() {
            const listEl = document.getElementById('item-list');
            listEl.innerHTML = '';
            const searchTxt = (document.getElementById('main-search').value || '').toLowerCase().trim();
            const classTabsEl = document.getElementById('class-tabs-container');
            const treePillsEl = document.getElementById('tree-pills-container');

            if (currentMode === 'skills-96' || currentMode === 'quarks-288') {
                classTabsEl.style.display = 'grid';
                treePillsEl.style.display = 'flex';

                const filtered = window.UAIDZIN_96_CANONICAL.filter(s => {
                    const matchClass = s.classId === selectedClass;
                    const matchTree = selectedTree === 'all' || s.tree === selectedTree;
                    const matchSearch = s.name.toLowerCase().includes(searchTxt) || s.id.toLowerCase().includes(searchTxt);
                    return matchClass && matchTree && matchSearch;
                });

                filtered.forEach(s => {
                    const card = document.createElement('div');
                    card.className = \`vfx-card \${s.id === selectedSkillId ? 'active' : ''}\`;
                    card.innerHTML = \`
                        <div class="vfx-card-top">
                            <span class="vfx-card-title">\${s.name}</span>
                            <span class="vfx-card-badge">\${s.tree.toUpperCase()}</span>
                        </div>
                        <div class="vfx-card-meta">
                            <span>\${s.kind} \${s.element ? '· ' + s.element : ''}</span>
                            <span>\${s.range}m</span>
                        </div>
                    \`;
                    card.addEventListener('click', () => {
                        selectedSkillId = s.id;
                        document.querySelectorAll('.vfx-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        updateUI();
                        triggerCurrent();
                    });
                    listEl.appendChild(card);
                });
            } else if (currentMode === 'vfx-pack') {
                classTabsEl.style.display = 'none';
                treePillsEl.style.display = 'none';

                const packList = (window.CFXR_DATA && window.CFXR_DATA.vfxList) ? window.CFXR_DATA.vfxList : [
                    { id: 'cfxr_fire_burst', name: 'CFXR Fire Burst', category: 'Explosions' },
                    { id: 'cfxr_lightning_bolt', name: 'CFXR Lightning Bolt', category: 'Rays' },
                    { id: 'cfxr_ice_nova', name: 'CFXR Ice Nova', category: 'Elements' },
                    { id: 'cfxr_skull_eerie', name: 'CFXR Skull Eerie', category: 'Eerie' },
                    { id: 'cfxr_slash_cross', name: 'CFXR Slash Cross', category: 'Combat' },
                    { id: 'cfxr_holy_heal', name: 'CFXR Holy Heal', category: 'Spells' },
                    { id: 'cfxr_poison_cloud', name: 'CFXR Poison Cloud', category: 'Elements' }
                ];

                const filtered = packList.filter(v => v.name.toLowerCase().includes(searchTxt) || v.id.toLowerCase().includes(searchTxt));

                filtered.forEach(v => {
                    const card = document.createElement('div');
                    card.className = \`vfx-card \${v.id === selectedPackId ? 'active' : ''}\`;
                    card.innerHTML = \`
                        <div class="vfx-card-top">
                            <span class="vfx-card-title">\${v.name}</span>
                            <span class="vfx-card-badge">\${v.category || 'PACK'}</span>
                        </div>
                        <div class="vfx-card-meta">
                            <span>Emissor Quarks</span>
                            <span>Reusável</span>
                        </div>
                    \`;
                    card.addEventListener('click', () => {
                        selectedPackId = v.id;
                        document.querySelectorAll('.vfx-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        updateUI();
                        triggerCurrent();
                    });
                    listEl.appendChild(card);
                });
            } else if (currentMode === 'combat-runtime') {
                classTabsEl.style.display = 'none';
                treePillsEl.style.display = 'none';

                const combatFx = [
                    { id: 'hit-flash', name: 'Hit Flash (Impacto Vermelho)', meta: 'Mesh Emissive' },
                    { id: 'attack-pulse', name: 'Attack Pulse (Squash de Ataque)', meta: 'Transform Scale' },
                    { id: 'slash', name: 'Slash (Corte de Espada)', meta: 'Line / Arc' },
                    { id: 'skill-bolt', name: 'Skill Bolt (Raio Mágico)', meta: 'Projectile' },
                    { id: 'skill-burst', name: 'Skill Burst (Impacto Físico)', meta: 'Ring Floor' },
                    { id: 'skill-zone', name: 'Skill Zone (Área de Controle)', meta: 'Ring Zone' },
                    { id: 'death-scale', name: 'Death Scale (Morte & Poof)', meta: 'Scale Down' },
                    { id: 'level-up', name: 'Level Up (Fanfarra & Choque)', meta: 'Golden Ring + Shake' }
                ];

                combatFx.forEach(c => {
                    const card = document.createElement('div');
                    card.className = \`vfx-card \${c.id === selectedCombatId ? 'active' : ''}\`;
                    card.innerHTML = \`
                        <div class="vfx-card-top">
                            <span class="vfx-card-title">\${c.name}</span>
                            <span class="vfx-card-badge">RUNTIME</span>
                        </div>
                        <div class="vfx-card-meta">
                            <span>\${c.meta}</span>
                            <span>EffectManager</span>
                        </div>
                    \`;
                    card.addEventListener('click', () => {
                        selectedCombatId = c.id;
                        document.querySelectorAll('.vfx-card').forEach(cardEl => cardEl.classList.remove('active'));
                        card.classList.add('active');
                        updateUI();
                        triggerCurrent();
                    });
                    listEl.appendChild(card);
                });
            } else if (currentMode === 'ambient-hub') {
                classTabsEl.style.display = 'none';
                treePillsEl.style.display = 'none';

                const ambientFx = [
                    { id: 'fountain-water', name: 'Fountain Water (Fonte da Cidade)', meta: 'Partículas & Ripples' },
                    { id: 'brazier-flame', name: 'Brazier Flame (Tocha & Fogo)', meta: 'Fogo & PointLight' },
                    { id: 'ambient-embers', name: 'Ambient Embers (Brasas no Ar)', meta: 'Turbulência Dourada' },
                    { id: 'portal-gate', name: 'Portal Gate (Portal de Dungeon)', meta: 'Vórtice Cósmico' },
                    { id: 'armor-aura', name: 'Armor Aura (Brilho da Arma)', meta: 'Aura Vermelha/Ouro' }
                ];

                ambientFx.forEach(a => {
                    const card = document.createElement('div');
                    card.className = \`vfx-card \${a.id === selectedAmbientId ? 'active' : ''}\`;
                    card.innerHTML = \`
                        <div class="vfx-card-top">
                            <span class="vfx-card-title">\${a.name}</span>
                            <span class="vfx-card-badge">AMBIENTE</span>
                        </div>
                        <div class="vfx-card-meta">
                            <span>\${a.meta}</span>
                            <span>Cenário Hub</span>
                        </div>
                    \`;
                    card.addEventListener('click', () => {
                        selectedAmbientId = a.id;
                        document.querySelectorAll('.vfx-card').forEach(cardEl => cardEl.classList.remove('active'));
                        card.classList.add('active');
                        updateUI();
                        triggerCurrent();
                    });
                    listEl.appendChild(card);
                });
            } else if (currentMode === 'fire-burst') {
                classTabsEl.style.display = 'none';
                treePillsEl.style.display = 'none';

                const card = document.createElement('div');
                card.className = 'vfx-card active';
                card.innerHTML = \`
                    <div class="vfx-card-top">
                        <span class="vfx-card-title">Fire Burst (Dark Lord)</span>
                        <span class="vfx-card-badge">ESPECIAL</span>
                    </div>
                    <div class="vfx-card-meta">
                        <span>Correntes Bézier</span>
                        <span>Assinatura</span>
                    </div>
                \`;
                listEl.appendChild(card);
            }
        }

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentMode = tab.dataset.mode;
                renderSidebar();
                updateUI();
                triggerCurrent();
            });
        });

        document.querySelectorAll('.class-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.class-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                selectedClass = tab.dataset.class;
                const first = window.UAIDZIN_96_CANONICAL.find(s => s.classId === selectedClass);
                if (first) selectedSkillId = first.id;
                renderSidebar();
                updateUI();
                triggerCurrent();
            });
        });

        document.querySelectorAll('.tree-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.tree-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedTree = pill.dataset.tree;
                renderSidebar();
            });
        });

        document.querySelectorAll('.version-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.version-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedVersionIndex = parseInt(btn.dataset.v);
                triggerCurrent();
            });
        });

        document.getElementById('main-search').addEventListener('input', renderSidebar);

        document.getElementById('btn-play').addEventListener('click', () => triggerCurrent());

        const btnLoop = document.getElementById('btn-loop');
        btnLoop.addEventListener('click', () => {
            isLooping = !isLooping;
            btnLoop.classList.toggle('active', isLooping);
            btnLoop.innerText = isLooping ? 'Loop: Ligado' : 'Loop: Desligado';
            if (isLooping) {
                loopTimer = setInterval(() => triggerCurrent(), 1200 / timeScale);
            } else {
                clearInterval(loopTimer);
            }
        });

        const btnSpeed = document.getElementById('btn-speed');
        const speeds = [0.5, 1.0, 1.5, 2.0];
        let speedIdx = 1;
        btnSpeed.addEventListener('click', () => {
            speedIdx = (speedIdx + 1) % speeds.length;
            timeScale = speeds[speedIdx];
            btnSpeed.innerText = \`Velocidade: \${timeScale.toFixed(1)}x\`;
            if (isLooping) {
                clearInterval(loopTimer);
                loopTimer = setInterval(() => triggerCurrent(), 1200 / timeScale);
            }
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            activeParticles.forEach(p => {
                particleGroup.remove(p.mesh);
                p.material.dispose();
            });
            activeParticles.length = 0;
            activeMeshes.forEach(m => {
                if (m.mesh) scene.remove(m.mesh);
                if (m.material) m.material.dispose();
            });
            activeMeshes.length = 0;
        });

        const btnTheme = document.getElementById('btn-theme-arena');
        btnTheme.addEventListener('click', () => {
            if (arenaTheme === 'saloon') {
                arenaTheme = 'minimal';
                btnTheme.innerText = 'Arena: Minimal';
                ground.visible = false;
                gridHelper.material.color.setHex(0x5a4a38);
                scene.background.setHex(0x0e0e0e);
                scene.fog.color.setHex(0x0e0e0e);
            } else if (arenaTheme === 'minimal') {
                arenaTheme = 'void';
                btnTheme.innerText = 'Arena: Vazio';
                arenaGroup.visible = false;
                scene.background.setHex(0x000000);
                scene.fog.color.setHex(0x000000);
            } else {
                arenaTheme = 'saloon';
                btnTheme.innerText = 'Arena: Brasa';
                arenaGroup.visible = true;
                ground.visible = true;
                gridHelper.material.color.setHex(0xd4a017);
                scene.background.setHex(0x0a0705);
                scene.fog.color.setHex(0x0a0705);
            }
        });

        document.getElementById('btn-cam-front').addEventListener('click', () => {
            camera.position.set(0, 2.5, 9);
            controls.target.set(0, 1.2, 0);
            updateCamBtns('btn-cam-front');
        });
        document.getElementById('btn-cam-iso').addEventListener('click', () => {
            camera.position.set(7, 6.5, 8.5);
            controls.target.set(0, 1.0, 0);
            updateCamBtns('btn-cam-iso');
        });
        document.getElementById('btn-cam-top').addEventListener('click', () => {
            camera.position.set(0, 14, 0.1);
            controls.target.set(0, 0, 0);
            updateCamBtns('btn-cam-top');
        });
        function updateCamBtns(id) {
            ['btn-cam-front', 'btn-cam-iso', 'btn-cam-top'].forEach(b => {
                document.getElementById(b).classList.toggle('active', b === id);
            });
        }

        document.getElementById('btn-copy-prompt').addEventListener('click', () => {
            const text = document.getElementById('prompt-canonical-text').innerText;
            navigator.clipboard.writeText(text).then(() => {
                const btn = document.getElementById('btn-copy-prompt');
                const prev = btn.innerText;
                btn.innerText = 'Copiado!';
                setTimeout(() => btn.innerText = prev, 1200);
            });
        });

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        canvas.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const hitPoint = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
                spawnShockwave(hitPoint, 0xd4a017, 0.1, 0.6, 0.25);
                triggerCurrent(hitPoint);
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                triggerCurrent();
            }
        });

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        const clock = new THREE.Clock();
        const fpsEl = document.getElementById('tel-fps');
        const partsEl = document.getElementById('tel-particles');
        const meshesEl = document.getElementById('tel-meshes');
        let frameCount = 0;
        let lastFpsTime = performance.now();

        function animate() {
            requestAnimationFrame(animate);

            const dt = Math.min(clock.getDelta(), 0.1) * timeScale;
            controls.update();

            if (batchRenderer) {
                batchRenderer.update(dt);
            }

            for (let i = activeParticles.length - 1; i >= 0; i--) {
                const p = activeParticles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    particleGroup.remove(p.mesh);
                    p.material.dispose();
                    activeParticles.splice(i, 1);
                    continue;
                }

                const prog = p.life / p.maxLife;
                p.vel.addScaledVector(p.acc, dt);
                p.vel.y += p.gravity * dt;
                p.vel.multiplyScalar(p.drag);
                p.pos.addScaledVector(p.vel, dt);

                p.mesh.position.copy(p.pos);

                const curSize = p.size + (p.endSize - p.size) * prog;
                p.mesh.scale.set(curSize, curSize, 1);
                p.rot += p.rotSpeed * dt;
                p.material.rotation = p.rot;
                p.material.opacity = Math.sin(prog * Math.PI) * p.opacity;

                if (p.endColor) {
                    p.material.color.copy(p.color).lerp(p.endColor, prog);
                }
            }

            for (let i = activeMeshes.length - 1; i >= 0; i--) {
                const m = activeMeshes[i];
                if (!m.update(dt)) {
                    activeMeshes.splice(i, 1);
                }
            }

            renderer.render(scene, camera);

            frameCount++;
            const now = performance.now();
            if (now - lastFpsTime >= 500) {
                fpsEl.innerText = Math.round((frameCount * 1000) / (now - lastFpsTime));
                partsEl.innerText = activeParticles.length;
                meshesEl.innerText = activeMeshes.length;
                frameCount = 0;
                lastFpsTime = now;
            }
        }

        renderSidebar();
        updateUI();
        triggerCurrent();
        animate();
    });
    </script>
</body>
</html>
`;

fs.writeFileSync(targetHtml, htmlContent, "utf8");
fs.writeFileSync(targetNoExt, htmlContent, "utf8");

console.log("Sucesso absoluto: VFX TESTE gerado!");
