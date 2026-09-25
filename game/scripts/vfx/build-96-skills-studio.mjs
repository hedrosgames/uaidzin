import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL_PROMPTS } from "./prompts-data.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.resolve(scriptDir, "../..");
const manifestPath = path.join(gameDir, "vfx/skills-manifest.json");
const desktopDir = "C:\\Users\\Felipe\\Desktop";
const targetHtml = path.join(desktopDir, "96 skill - agora vai.html");
const targetNoExt = path.join(desktopDir, "96 skill - agora vai");

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
    <title>UAIDZIN — 96 Skills VFX Studio (Agora Vai)</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http:
    
    <!-- ThreeJS e OrbitControls: tenta offline local e faz fallback automático para CDN -->
    <script src="CartoonFX_VFX_Quarks/libs/three.min.js"></script>
    <script src="CartoonFX_VFX_Quarks/libs/OrbitControls.js"></script>
    <script>
      if (typeof THREE === 'undefined') {
        document.write('<script src="https:
        document.write('<script src="https:
      }
    </script>

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
            background: #000000;
        }

        #canvas-3d {
            width: 100%;
            height: 100%;
            display: block;
        }

        
        #header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: linear-gradient(180deg, rgba(26, 18, 12, 0.98) 0%, rgba(14, 9, 6, 0.94) 100%);
            border-bottom: 1px solid var(--iron-hi);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 10;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8);
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-title h1 {
            font-size: 16px;
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
            font-size: 12px;
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
            box-shadow: 0 0 10px rgba(212, 160, 23, 0.25);
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
            top: 56px;
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
            padding: 10px 4px;
            text-align: center;
            font-size: 12px;
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
            font-size: 12px;
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
            font-size: 11px;
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

        .skill-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .skill-list::-webkit-scrollbar {
            width: 6px;
        }

        .skill-list::-webkit-scrollbar-thumb {
            background: var(--iron);
            border-radius: 3px;
        }

        .skill-card {
            background: var(--panel-card);
            border: 1px solid var(--iron);
            padding: 8px 10px;
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .skill-card:hover {
            border-color: var(--iron-hi);
            background: var(--panel-card-hover);
        }

        .skill-card.active {
            border-color: var(--gold);
            background: var(--panel-card-active);
            box-shadow: inset 0 0 8px rgba(212, 160, 23, 0.25);
        }

        .skill-card-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .skill-card-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--ink);
        }

        .skill-card.active .skill-card-name {
            color: var(--gold-hi);
        }

        .skill-card-badge {
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 2px;
            background: #100a06;
            border: 1px solid var(--iron);
            color: var(--ink-dim);
            text-transform: uppercase;
        }

        .skill-card-meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--ink-mute);
        }

        
        #sidebar-right {
            position: absolute;
            top: 56px;
            bottom: 0;
            right: 0;
            width: 450px;
            background: var(--panel);
            border-left: 1px solid var(--iron-hi);
            z-index: 10;
            display: flex;
            flex-direction: column;
            box-shadow: -4px 0 20px rgba(0,0,0,0.6);
            padding: 16px;
            gap: 12px;
            overflow-y: auto;
        }

        .prompt-header {
            border-bottom: 1px solid var(--iron-hi);
            padding-bottom: 10px;
        }

        .prompt-title {
            font-size: 16px;
            font-weight: 700;
            color: var(--gold-hi);
            margin-bottom: 4px;
        }

        .prompt-sub {
            font-size: 12px;
            color: var(--ink-dim);
        }

        .prompt-box {
            background: #0d0805;
            border: 1px solid var(--iron-hi);
            padding: 12px;
            border-radius: 2px;
            font-size: 12px;
            line-height: 1.5;
            color: #d1c7b7;
            position: relative;
        }

        .prompt-box-title {
            font-size: 11px;
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
            padding: 2px 8px;
            cursor: pointer;
            border-radius: 2px;
            transition: all 0.15s;
        }

        .copy-btn:hover {
            border-color: var(--gold);
            background: rgba(212,160,23,0.15);
        }

        .timeline-step {
            margin-bottom: 8px;
            padding-left: 10px;
            border-left: 2px solid var(--iron-hi);
        }

        .timeline-step-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--ember);
            text-transform: uppercase;
        }

        .timeline-step-desc {
            font-size: 11px;
            color: var(--ink-dim);
            margin-top: 2px;
        }

        
        #bottom-bar {
            position: absolute;
            bottom: 20px;
            left: 370px;
            right: 470px;
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
            margin-left: 8px;
        }
    </style>
</head>
<body>
    <div id="viewport-container">
        <canvas id="canvas-3d"></canvas>
    </div>

    <!-- Header Principal -->
    <header id="header">
        <div class="header-title">
            <h1>UAIDZIN · 96 Skills VFX Studio</h1>
            <span class="header-badge">96 Efeitos ThreeJS</span>
        </div>
        <div class="header-controls">
            <button id="btn-cam-front" class="btn-ui">Câmera Frontal</button>
            <button id="btn-cam-iso" class="btn-ui active">Câmera Isométrica</button>
            <button id="btn-cam-top" class="btn-ui">Câmera Top-Down</button>
            <button id="btn-speed" class="btn-ui">Velocidade: 1.0x</button>
            <button id="btn-clear" class="btn-ui">Limpar Efeitos</button>
        </div>
    </header>

    <!-- Sidebar Esquerda (Seleção de Skills) -->
    <aside id="sidebar-left">
        <div class="class-tabs">
            <div class="class-tab active" data-class="TK">TK</div>
            <div class="class-tab" data-class="FM">FM</div>
            <div class="class-tab" data-class="BM">BM</div>
            <div class="class-tab" data-class="HT">HT</div>
        </div>
        <div class="filter-bar">
            <input type="text" id="skill-search" class="search-input" placeholder="Buscar entre as 96 skills...">
            <div class="tree-pills">
                <div class="tree-pill active" data-tree="all">Todas (24)</div>
                <div class="tree-pill" data-tree="fisica">Física (8)</div>
                <div class="tree-pill" data-tree="controle">Controle (8)</div>
                <div class="tree-pill" data-tree="magia">Magia (8)</div>
            </div>
        </div>
        <div id="skill-list" class="skill-list"></div>
    </aside>

    <!-- Sidebar Direita (Prompt & Dados do VFX) -->
    <aside id="sidebar-right">
        <div class="prompt-header">
            <div id="prompt-skill-name" class="prompt-title">Nome da Skill</div>
            <div id="prompt-skill-sub" class="prompt-sub">Classe · Árvore · Elemento</div>
        </div>

        <div class="prompt-box">
            <div class="prompt-box-title">
                <span>Prompt Canônico de VFX</span>
                <button id="btn-copy-prompt" class="copy-btn">Copiar Prompt</button>
            </div>
            <div id="prompt-canonical-text">Carregando prompt...</div>
        </div>

        <div class="prompt-box">
            <div class="prompt-box-title">
                <span>Conceito & Atmosfera</span>
            </div>
            <div id="prompt-concept-text">...</div>
        </div>

        <div class="prompt-box">
            <div class="prompt-box-title">
                <span>Cores & Iluminação</span>
            </div>
            <div id="prompt-colors-box" style="display: flex; gap: 8px; align-items: center;">
                <div id="chip-primary" style="width: 24px; height: 24px; border-radius: 2px; border: 1px solid var(--iron-hi);"></div>
                <div id="chip-secondary" style="width: 24px; height: 24px; border-radius: 2px; border: 1px solid var(--iron-hi);"></div>
                <div id="chip-emissive" style="width: 24px; height: 24px; border-radius: 2px; border: 1px solid var(--iron-hi);"></div>
                <span id="chips-labels" style="font-size: 11px; color: var(--ink-dim); font-family: ui-monospace, monospace;">#HEX</span>
            </div>
        </div>

        <div class="prompt-box">
            <div class="prompt-box-title">
                <span>Linha do Tempo Visual</span>
            </div>
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

        <div class="prompt-box">
            <div class="prompt-box-title">
                <span>Parâmetros de Gameplay</span>
            </div>
            <div id="prompt-stats-text" style="font-family: ui-monospace, monospace; font-size: 11px;">...</div>
        </div>
    </aside>

    <!-- Barra Inferior de Reprodução e Telemetria -->
    <div id="bottom-bar">
        <div class="playback-group">
            <button id="btn-play" class="btn-ui btn-primary">Disparar Skill [Espaço]</button>
            <button id="btn-loop" class="btn-ui">Loop: Desligado</button>
            <span class="hint-text">Clique em qualquer ponto da arena para conjurar</span>
        </div>
        <div class="telemetry-group">
            <span>FPS: <span id="tel-fps" class="telemetry-val">60</span></span>
            <span>Partículas: <span id="tel-particles" class="telemetry-val">0</span></span>
        </div>
    </div>

    <!-- Catálogo de Dados das 96 Skills -->
    <script>
      window.UAIDZIN_96_SKILLS = ${JSON.stringify(enrichedSkills, null, 2)};
    </script>

    <!-- Engine 3D e Gerador de VFX ThreeJS -->
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        const skillsData = window.UAIDZIN_96_SKILLS;
        let selectedClass = 'TK';
        let selectedTree = 'all';
        let selectedSkillId = skillsData[0].id;
        let isLooping = false;
        let timeScale = 1.0;
        let loopTimer = null;

        
        const canvas = document.getElementById('canvas-3d');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0705);
        scene.fog = new THREE.FogExp2(0x0a0705, 0.035);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 7.5, 11);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.0, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 28;

        
        const ambientLight = new THREE.AmbientLight(0xfff0dd, 0.4);
        scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffdfae, 0.8);
        mainLight.position.set(6, 12, 8);
        scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
        fillLight.position.set(-6, 8, -6);
        scene.add(fillLight);

        
        const groundGeo = new THREE.PlaneGeometry(36, 36);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x140e0a,
            roughness: 0.85,
            metalness: 0.15
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        const gridHelper = new THREE.GridHelper(30, 30, 0xd4a017, 0x3d3228);
        gridHelper.position.y = 0.01;
        scene.add(gridHelper);

        
        const arenaRingGeo = new THREE.RingGeometry(5.8, 6.0, 64);
        const arenaRingMat = new THREE.MeshBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const arenaRing = new THREE.Mesh(arenaRingGeo, arenaRingMat);
        arenaRing.rotation.x = -Math.PI / 2;
        arenaRing.position.y = 0.02;
        scene.add(arenaRing);

        
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
                grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
                grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
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
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.stroke();
            }),
            smoke: createTexture((ctx, w, h) => {
                const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
                grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
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

        function spawnProjectile(origin, target, colorHex, speed, onHit, pCount = 20) {
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

        
        function triggerSkillVFX(skill, origin = new THREE.Vector3(0, 0.05, 0)) {
            const pCol = new THREE.Color(skill.prompt.colors.primary);
            const sCol = new THREE.Color(skill.prompt.colors.secondary);
            const eCol = new THREE.Color(skill.prompt.colors.emissive);
            const forward = new THREE.Vector3(0, 0, 1);
            const targetPos = origin.clone().addScaledVector(forward, skill.range || 4.5);

            
            const pLight = new THREE.PointLight(pCol, 2.5, 8);
            pLight.position.copy(origin).add(new THREE.Vector3(0, 1.2, 0));
            scene.add(pLight);
            setTimeout(() => scene.remove(pLight), 400);

            
            if (skill.shape === 'line' || skill.gameplay?.projectile || skill.kind === 'damage' && (skill.range || 0) >= 5.0) {
                
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

                const count = 50;
                for (let i = 0; i < count; i++) {
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
                        tex: skill.element === 'ice' ? textures.spark : textures.smoke
                    });
                }
            } else if (skill.kind === 'buff' || skill.kind === 'heal' || skill.shape === 'self') {
                
                spawnDome(origin.clone().add(new THREE.Vector3(0, 0.1, 0)), pCol.getHex(), 1.6, 1.2);
                spawnShockwave(origin, sCol.getHex(), 0.2, 1.8, 0.7);

                
                for (let i = 0; i < 30; i++) {
                    const prog = i / 30;
                    const ang = prog * Math.PI * 4;
                    const r = 0.85;
                    spawnParticle({
                        pos: origin.clone().add(new THREE.Vector3(Math.cos(ang) * r, prog * 1.8, Math.sin(ang) * r)),
                        vel: new THREE.Vector3((Math.random()-0.5)*0.3, 1.5 + Math.random()*1.5, (Math.random()-0.5)*0.3),
                        color: pCol,
                        endColor: eCol,
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

        
        function updateUI() {
            const skill = skillsData.find(s => s.id === selectedSkillId) || skillsData[0];
            
            document.getElementById('prompt-skill-name').innerText = skill.name;
            document.getElementById('prompt-skill-sub').innerText = \`\${skill.className} (\${skill.classId}) · \${skill.treeLabel} · \${skill.element || 'Físico'}\`;
            document.getElementById('prompt-canonical-text').innerText = skill.prompt.promptText;
            document.getElementById('prompt-concept-text').innerText = skill.prompt.concept;

            
            document.getElementById('chip-primary').style.backgroundColor = skill.prompt.colors.primary;
            document.getElementById('chip-secondary').style.backgroundColor = skill.prompt.colors.secondary;
            document.getElementById('chip-emissive').style.backgroundColor = skill.prompt.colors.emissive;
            document.getElementById('chips-labels').innerText = \`Prim: \${skill.prompt.colors.primary} | Sec: \${skill.prompt.colors.secondary}\`;

            
            document.getElementById('tl-cast').innerText = skill.prompt.timeline.cast;
            document.getElementById('tl-action').innerText = skill.prompt.timeline.action;
            document.getElementById('tl-impact').innerText = skill.prompt.timeline.impact;
            document.getElementById('tl-fade').innerText = skill.prompt.timeline.fade;

            
            document.getElementById('prompt-stats-text').innerHTML = \`
                Tipo: \${skill.kind.toUpperCase()} | Forma: \${skill.shape.toUpperCase()}<br>
                Alcance: \${skill.range}m | Raio: \${skill.radius ? skill.radius + 'm' : 'N/A'}<br>
                Cooldown: \${skill.cooldown}s | Custo MP: \${skill.mp}
            \`;
        }

        function renderSkillList() {
            const listEl = document.getElementById('skill-list');
            listEl.innerHTML = '';
            const searchTxt = (document.getElementById('skill-search').value || '').toLowerCase().trim();

            const filtered = skillsData.filter(s => {
                const matchClass = s.classId === selectedClass;
                const matchTree = selectedTree === 'all' || s.tree === selectedTree;
                const matchSearch = s.name.toLowerCase().includes(searchTxt) || s.id.toLowerCase().includes(searchTxt) || (s.element && s.element.toLowerCase().includes(searchTxt));
                return matchClass && matchTree && matchSearch;
            });

            filtered.forEach(s => {
                const card = document.createElement('div');
                card.className = \`skill-card \${s.id === selectedSkillId ? 'active' : ''}\`;
                card.innerHTML = \`
                    <div class="skill-card-head">
                        <span class="skill-card-name">\${s.name}</span>
                        <span class="skill-card-badge">\${s.tree.toUpperCase()}</span>
                    </div>
                    <div class="skill-card-meta">
                        <span>\${s.kind} \${s.element ? '· ' + s.element : ''}</span>
                        <span>\${s.range}m</span>
                    </div>
                \`;
                card.addEventListener('click', () => {
                    selectedSkillId = s.id;
                    document.querySelectorAll('.skill-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    updateUI();
                    triggerCurrent();
                });
                listEl.appendChild(card);
            });
        }

        function triggerCurrent(pos = new THREE.Vector3(0, 0.05, 0)) {
            const skill = skillsData.find(s => s.id === selectedSkillId);
            if (skill) {
                triggerSkillVFX(skill, pos);
            }
        }

        
        document.querySelectorAll('.class-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.class-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                selectedClass = tab.dataset.class;
                const first = skillsData.find(s => s.classId === selectedClass);
                if (first) selectedSkillId = first.id;
                renderSkillList();
                updateUI();
                triggerCurrent();
            });
        });

        document.querySelectorAll('.tree-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.tree-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedTree = pill.dataset.tree;
                renderSkillList();
            });
        });

        document.getElementById('skill-search').addEventListener('input', renderSkillList);

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
        let frameCount = 0;
        let lastFpsTime = performance.now();

        function animate() {
            requestAnimationFrame(animate);

            const dt = Math.min(clock.getDelta(), 0.1) * timeScale;
            controls.update();

            
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
                frameCount = 0;
                lastFpsTime = now;
            }
        }

        
        renderSkillList();
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

console.log(`Sucesso: ${enrichedSkills.length} skills geradas com prompts e renderizador ThreeJS.`);
console.log(`Arquivo criado em: ${targetHtml}`);
console.log(`Arquivo cópia sem extensão criado em: ${targetNoExt}`);
