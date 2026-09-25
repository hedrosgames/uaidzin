import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import skills from "../skills-manifest.json";
import { PALETTE } from "./score.js";
import { proposals, installCompositions, instantiate } from "./registry.js";

const $ = (id) => document.getElementById(id);
const elementNames = { physical:"Físico", holy:"Sagrado", fire:"Fogo", ice:"Gelo", lightning:"Trovão", poison:"Veneno", shadow:"Sombra", earth:"Terra", water:"Água", mixed:"Misto", none:"Sem elemento" };
const kindNames = { damage:"Dano", buff:"Fortalecimento", heal:"Cura", passive:"Passiva", summon:"Invocação", transform:"Transformação" };
const shapeNames = { single:"Alvo único", line:"Linha", aoe:"Área", self:"Pessoal" };
const layerNames = { sigil:"Selo", wave:"Onda", slash:"Corte", claw:"Garras", arrow:"Flecha", lance:"Lança", orb:"Núcleo", beam:"Feixe", bolt:"Raio", embers:"Brasas", shards:"Fragmentos", dust:"Poeira", leaves:"Folhas", motes:"Partículas", heal:"Fluxo vital", shield:"Proteção", cage:"Arcos", crown:"Coroa", vortex:"Vórtice", rift:"Fenda", crystal:"Cristais", rock:"Rochas", chain:"Correntes", feather:"Penas", mark:"Marca", moon:"Lua", drain:"Elo", echo:"Eco", wolf:"Lobo", bear:"Urso", tiger:"Tigre", condor:"Condor", dragon:"Dragão", titan:"Titã" };
const KEY = new URLSearchParams(location.search).has("qa") ? "uaidzin-vfx-atelier-qa-v1" : "uaidzin-vfx-atelier-reviews-v1";
const versions = Object.keys(proposals);
const state = { skill:skills[0], version:"V1", mode:"stage", classId:"", loop:!matchMedia("(prefers-reduced-motion: reduce)").matches, paused:false, sequence:false, time:0, speed:1, bloom:true, camera:"iso", hover:null };
let choices = {}, views = [], filtered = [], fps = 0, frames = 0, sampleTime = 0, last = performance.now(), raf, hoverTimer;

try {
  const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [key, value] of Object.entries(stored)) {
      if (value && ["approved", "rejected", "pending"].includes(value.status) && typeof value.notes === "string") choices[key] = value;
    }
  }
} catch { $("save-status").textContent = "Armazenamento indisponível."; }

function glyph(skill) {
  const path = {
    TK:"M12 5h16v16l-8 13-8-13ZM20 9v18M15 16h10",
    FM:"m20 4 5 11 10 5-10 5-5 11-5-11-10-5 10-5ZM20 12v16M12 20h16",
    BM:"m6 29 4-20 5 12 5-17 5 17 5-12 4 20M10 29l10 6 10-6",
    HT:"M12 5q22 15 0 30M12 5v30M7 20h28m-7-6 7 6-7 6",
  }[skill.classId];
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${path}"/></svg>`;
}

const entry = (skill = state.skill, version = state.version) => proposals[version].find((p) => p.id === skill.id);
const reviewKey = () => `${state.skill.id}:${state.version}`;
const choice = (id = state.skill.id) => choices[`${id}:${state.version}`]?.status ?? "pending";
const fmt = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits:2 });

class View {
  constructor(skill, version, mount, thumbnail = false) {
    this.skill = skill; this.version = version; this.thumbnail = thumbnail;
    this.el = document.createElement("div");
    this.el.className = "render-view";
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-label", `${skill.name}, proposta ${version}`);
    this.el.append(this.canvas);
    mount.append(this.el);
    if (!thumbnail) {
      const label = document.createElement("div");
      label.className = "view-label";
      label.textContent = `${version} / ${skill.classId}`;
      const title = document.createElement("b"); title.textContent = entry(skill, version).title; label.append(title);
      if (skill.kind === "passive") { const text = document.createElement("small"); text.textContent = "Estudo de estado passivo"; label.append(text); }
      this.el.append(label);
    }
    this.renderer = new T.WebGLRenderer({ canvas:this.canvas, antialias:true, alpha:false, powerPreference:"high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new T.Scene();
    this.scene.background = new T.Color("#17120e");
    this.scene.fog = new T.Fog("#17120e", 18, 42);
    this.camera = new T.PerspectiveCamera(42, 1, 0.1, 80);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(skill.shape === "self" ? -2.5 : state.mode === "compare" && skill.shape === "aoe" ? 1.7 : 0.3, 1, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 6; this.controls.maxDistance = 24;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.scene.add(new T.HemisphereLight("#f6e2ba", "#362c24", 2));
    const light = new T.DirectionalLight("#ffe4bb", 3); light.position.set(3, 9, 5); this.scene.add(light);
    const rim = new T.DirectionalLight("#84a7bb", 1.4); rim.position.set(-4, 3, -4); this.scene.add(rim);
    this.scenery = new T.Group(); this.scene.add(this.scenery);
    const ground = new T.Mesh(new T.CylinderGeometry(8, 8.3, 0.24, 64), new T.MeshStandardMaterial({ color:"#312a22", roughness:0.85, metalness:0.25 }));
    ground.position.y = -0.16; this.scenery.add(ground);
    for (let i = 1; i <= 7; i++) {
      const ring = new T.Mesh(new T.RingGeometry(i - 0.012, i + 0.012, 96), new T.MeshBasicMaterial({ color:i === 7 ? "#8e6e3d" : "#484034", transparent:true, opacity:0.65, depthWrite:false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -0.025; this.scenery.add(ring);
    }
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const tile = new T.Mesh(new T.BoxGeometry(0.2, 0.012, 0.75), new T.MeshStandardMaterial({ color:"#67503a", roughness:0.8 }));
      tile.position.set(Math.cos(a) * 6.5, 0, Math.sin(a) * 6.5); tile.rotation.y = -a;
      this.scenery.add(tile);
    }
    this.dummy(-2.5, "#72654e", true);
    if (skill.shape !== "self") this.dummy(2.4, "#4f4540", false);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(800, 600), 0.24, 0.25, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.effect = instantiate(skill.id, version, { scene:this.scene, camera:this.camera });
    this.effect.cast();
    this.setCamera(state.camera);
    this.resize();
  }

  dummy(x, color, caster) {
    const mat = new T.MeshStandardMaterial({ color, metalness:0.65, roughness:0.5 });
    const body = new T.Mesh(new T.CapsuleGeometry(0.27, 0.75, 4, 10), mat);
    body.position.set(x, 0.78, 0); this.scenery.add(body);
    const head = new T.Mesh(new T.IcosahedronGeometry(0.22, 1), mat); head.position.set(x, 1.54, 0); this.scenery.add(head);
    if (caster) {
      const cape = new T.Mesh(new T.ConeGeometry(0.42, 0.9, 5, 1, true), new T.MeshStandardMaterial({ color:"#40382b", side:T.DoubleSide }));
      cape.position.set(x - 0.13, 0.8, 0); this.scenery.add(cape);
    }
  }

  setCamera(mode) {
    this.camera.position.copy({ iso:new T.Vector3(7.5, 7.2, 10.5), front:new T.Vector3(0, 3.2, 13.5), top:new T.Vector3(0, 14, 0.02) }[mode]).add(this.controls.target);
    if (state.mode === "compare") this.camera.position.sub(this.controls.target).multiplyScalar(1.9).add(this.controls.target);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }
  resize() {
    const width = this.el.clientWidth || 800, height = this.el.clientHeight || 560;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  render(time) {
    this.effect.seek(time); this.controls.update();
    this.bloom.enabled = state.bloom;
    this.composer.render();
  }
  dispose() {
    this.effect.dispose();
    const geos = new Set(), mats = new Set();
    this.scenery.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) mats.add(o.material); });
    for (const geo of geos) geo.dispose();
    for (const mat of mats) mat.dispose();
    this.controls.dispose();
    for (const pass of this.composer.passes) pass.dispose?.();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.el.remove();
  }
}

function fit() {
  $("stage").style.transform = `scale(${Math.min(innerWidth / 1600, innerHeight / 900)})`;
  views.forEach((view) => view.resize());
}

function mountViews() {
  for (const view of views) view.dispose();
  views = [];
  const skill = state.hover ?? state.skill;
  const list = state.mode === "compare" ? versions : [state.version];
  for (const version of list) views.push(new View(skill, version, $("views")));
  state.time = 0;
  $("scrub").max = String(Math.max(...views.map((v) => v.effect.duration)));
  $("duration").textContent = `${fmt(Number($("scrub").max))} s`;
  fit();
}

function updateFilters() {
  const query = $("search").value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  filtered = skills.filter((s) =>
    (!state.classId || s.classId === state.classId) &&
    (!$("tree").value || s.tree === $("tree").value) &&
    (!$("element").value || (s.element ?? "none") === $("element").value) &&
    (!$("shape").value || s.shape === $("shape").value) &&
    (!$("review-filter").value || choice(s.id) === $("review-filter").value) &&
    `${s.name} ${s.id}`.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(query));
  renderList();
  if (state.mode === "gallery") renderGallery();
}

function renderList() {
  $("count").textContent = String(filtered.length);
  $("skill-list").replaceChildren();
  for (const skill of filtered) {
    const card = document.createElement("button");
    card.className = `skill-card${state.skill.id === skill.id ? " active" : ""}`;
    card.dataset.id = skill.id; card.dataset.status = choice(skill.id);
    card.style.setProperty("--accent", PALETTE[skill.element] ?? "#c9aa68");
    card.setAttribute("aria-label", `${skill.classId} ${skill.name}`);
    card.setAttribute("aria-pressed", String(skill.id === state.skill.id));
    const icon = document.createElement("span"); icon.className = "sigil"; icon.innerHTML = glyph(skill);
    const text = document.createElement("span"), name = document.createElement("strong"), detail = document.createElement("small");
    name.textContent = skill.name; detail.textContent = `${skill.classId} · ${skill.treeLabel} · ${skill.tier}/8`;
    text.append(name, detail);
    const dot = document.createElement("i"); dot.className = "status-dot";
    card.append(icon, text, dot);
    card.onclick = () => selectSkill(skill.id);
    $("skill-list").append(card);
  }
  if (!filtered.length) $("skill-list").textContent = "Nenhuma skill neste filtro.";
  $("review-count").textContent = `${Object.values(choices).filter((c) => c.status !== "pending").length} revisadas / ${skills.length * versions.length}`;
}

function renderGallery() {
  clearTimeout(hoverTimer);
  state.hoverImage?.remove(); state.hoverImage = null;
  if (state.hover) { state.hover = null; mountViews(); }
  $("gallery").replaceChildren();
  for (const skill of filtered) {
    const card = document.createElement("button"); card.className = "gallery-card";
    card.dataset.id = skill.id; card.style.setProperty("--accent", PALETTE[skill.element] ?? "#c9aa68");
    card.innerHTML = glyph(skill);
    const title = document.createElement("strong"); title.textContent = skill.name;
    const subtitle = document.createElement("small"); subtitle.textContent = `${skill.classId} · ${entry(skill).title}`;
    card.append(title, subtitle);
    card.onclick = () => { state.mode = "stage"; selectSkill(skill.id); updateMode(); };
    card.onpointerenter = () => {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        state.hover = skill; mountViews();
        const image = document.createElement("img"); image.alt = `Prévia de ${skill.name}`; card.append(image);
        state.hoverImage = image;
        views[0].render(0.5);
        image.src = views[0].canvas.toDataURL("image/jpeg", 0.6);
      }, 180);
    };
    card.onpointerleave = () => {
      clearTimeout(hoverTimer);
      state.hoverImage?.remove(); state.hoverImage = null;
      if (state.hover) { state.hover = null; mountViews(); }
    };
    $("gallery").append(card);
  }
}

function selectSkill(id, preserveSequence = false) {
  const skill = skills.find((s) => s.id === id);
  if (!skill) throw new Error(`Skill inexistente: ${id}`);
  state.skill = skill; state.hover = null;
  if (!preserveSequence) state.sequence = false;
  $("sequence").setAttribute("aria-pressed", String(state.sequence));
  mountViews(); updateInspector(); renderList();
}

function updateInspector() {
  const s = state.skill, p = entry();
  $("skill-name").textContent = s.name;
  $("breadcrumb").textContent = `${s.className.toUpperCase()} / ${s.treeLabel.toUpperCase()}`;
  $("tier").textContent = `${s.tier} / 8`;
  $("concept-title").textContent = p.title;
  $("description").textContent = p.description;
  $("technique").textContent = p.technique;
  $("metadata").replaceChildren();
  for (const [label, value] of Object.entries({ "Natureza":kindNames[s.kind], "Forma":shapeNames[s.shape], "Elemento":elementNames[s.element ?? "none"], "Recarga":`${fmt(s.cooldown)} s`, "Mana":fmt(s.mp), "Alcance":`${fmt(s.range)} m`, ...(s.radius ? { "Raio":`${fmt(s.radius)} m` } : {}), ...(s.kind === "damage" ? { "Multiplicador":`${fmt(s.damageMultiplier)}×` } : {}) })) {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = label; dd.textContent = value; $("metadata").append(dt, dd);
  }
  $("layers").replaceChildren();
  for (const layer of p.layers) {
    const span = document.createElement("span"); span.className = "layer";
    span.textContent = `${layerNames[layer.type]} · ${fmt(layer.delay)} s`; $("layers").append(span);
  }
  for (const button of $("versions").children) button.classList.toggle("active", button.dataset.version === state.version);
  const selected = choices[reviewKey()];
  $("review-state").textContent = { approved:"Proposta aprovada por você", rejected:"Proposta reprovada por você", pending:"Pendente de revisão" }[selected?.status ?? "pending"];
  $("notes").value = selected?.notes ?? "";
}

function persist(status) {
  choices[reviewKey()] = { status:status ?? choice(), notes:$("notes").value, updatedAt:new Date().toISOString(), proposalTitle:entry().title };
  try { localStorage.setItem(KEY, JSON.stringify(choices)); $("save-status").textContent = "Escolha salva neste navegador."; }
  catch { $("save-status").textContent = "Sem armazenamento. Exporte as escolhas."; }
  updateInspector(); updateFilters();
}

function updateMode() {
  clearTimeout(hoverTimer);
  state.hoverImage?.remove();
  $("gallery").hidden = state.mode !== "gallery";
  $("mode-stage").classList.toggle("active", state.mode === "stage");
  $("mode-gallery").classList.toggle("active", state.mode === "gallery");
  $("mode-compare").classList.toggle("active", state.mode === "compare");
  state.hover = null; state.hoverImage = null;
  if (state.mode === "gallery") renderGallery();
  mountViews();
}

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const duration = Math.max(...views.map((v) => v.effect.duration));
  if (!state.paused || state.hover) state.time += dt * state.speed;
  if (state.time > duration + 0.4 && (!state.paused || state.hover)) {
    if (state.sequence) {
      const tree = skills.filter((s) => s.classId === state.skill.classId && s.tree === state.skill.tree);
      selectSkill(tree[(tree.findIndex((s) => s.id === state.skill.id) + 1) % tree.length].id, true);
    } else if (state.loop || state.hover) state.time = 0;
    else state.time = duration + 0.4;
  }
  for (const view of views) view.render(state.time);
  if (state.hoverImage && frames % 4 === 0) state.hoverImage.src = views[0].canvas.toDataURL("image/jpeg", 0.6);
  frames++; sampleTime += dt;
  if (sampleTime > 0.5) { fps = Math.round(frames / sampleTime); frames = 0; sampleTime = 0; }
  const telemetry = views.reduce((sum, v) => {
    const t = v.effect.telemetry(); return { particles:sum.particles + t.particles, objects:sum.objects + t.objects };
  }, { particles:0, objects:0 });
  $("telemetry").textContent = `${fps} FPS · ${telemetry.particles} partículas · ${telemetry.objects} objetos`;
  $("time").textContent = `${fmt(Math.min(state.time, duration))} s`;
  $("scrub").value = String(Math.min(state.time, duration));
  $("phase").textContent = state.paused ? "Pausada" : state.time > duration ? "Concluída" : state.time < 0.22 ? "Antecipação" : state.time < 0.65 ? "Ação" : state.time < 1.25 ? "Impacto" : "Dissipação";
  raf = requestAnimationFrame(tick);
}

try {
  installCompositions(skills);
  $("total").textContent = `96 SKILLS / ${96 * versions.length} PROPOSTAS`;
  for (const version of versions) {
    const button = document.createElement("button"); button.textContent = version; button.dataset.version = version;
    button.onclick = () => { state.version = version; mountViews(); updateInspector(); updateFilters(); };
    $("versions").append(button);
  }
  for (const [value, name] of Object.entries(elementNames)) {
    const option = document.createElement("option"); option.value = value; option.textContent = name; $("element").append(option);
  }
  for (const id of ["search", "tree", "element", "shape", "review-filter"]) $(id).addEventListener("input", updateFilters);
  $("classes").onclick = (event) => {
    const button = event.target.closest("button[data-class]"); if (!button) return;
    state.classId = button.dataset.class;
    for (const b of $("classes").children) b.classList.toggle("active", b === button);
    updateFilters();
  };
  for (const mode of ["stage", "gallery", "compare"]) $(`mode-${mode}`).onclick = () => { state.mode = mode; updateMode(); };
  for (const mode of ["iso", "front", "top"]) $(`cam-${mode}`).onclick = () => {
    state.camera = mode; views.forEach((v) => v.setCamera(mode));
    for (const m of ["iso", "front", "top"]) $(`cam-${m}`).classList.toggle("active", m === mode);
  };
  $("bloom").onclick = () => { state.bloom = !state.bloom; $("bloom").setAttribute("aria-pressed", String(state.bloom)); };
  $("replay").onclick = () => { state.time = 0; state.paused = false; $("pause").setAttribute("aria-pressed", "false"); $("pause").textContent = "Pausar"; };
  $("pause").onclick = () => { state.paused = !state.paused; $("pause").setAttribute("aria-pressed", String(state.paused)); $("pause").textContent = state.paused ? "Continuar" : "Pausar"; };
  $("loop").setAttribute("aria-pressed", String(state.loop));
  $("loop").onclick = () => { state.loop = !state.loop; $("loop").setAttribute("aria-pressed", String(state.loop)); };
  $("sequence").onclick = () => {
    state.sequence = !state.sequence; state.time = 0; state.paused = false;
    $("sequence").setAttribute("aria-pressed", String(state.sequence));
    $("pause").setAttribute("aria-pressed", "false"); $("pause").textContent = "Pausar";
  };
  $("speed").onchange = () => { state.speed = Number($("speed").value); };
  $("scrub").oninput = () => { state.time = Number($("scrub").value); state.paused = true; $("pause").textContent = "Continuar"; $("pause").setAttribute("aria-pressed", "true"); };
  $("approve").onclick = () => persist("approved");
  $("reject").onclick = () => persist("rejected");
  $("clear-review").onclick = () => { $("notes").value = ""; persist("pending"); };
  $("notes").onchange = () => persist();
  $("export").onclick = () => {
    const data = { schemaVersion:1, exportedAt:new Date().toISOString(), totalSkills:skills.length, choices };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "uaidzin-vfx-escolhas.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  addEventListener("resize", fit);
  document.addEventListener("visibilitychange", () => { last = performance.now(); });
  updateFilters(); mountViews(); updateInspector();
  raf = requestAnimationFrame(tick);
  window.__VFX_LAB__ = {
    skills, versions, proposals,
    select:(id, version = "V1") => { state.version = version; selectSkill(id); },
    seek:(time) => { state.paused = true; state.time = time; views.forEach((v) => v.render(time)); },
    compare:() => { state.mode = "compare"; updateMode(); },
    state:() => ({ skillId:state.skill.id, version:state.version, mode:state.mode, time:state.time, fps, sequence:state.sequence, views:views.length }),
    memory:() => views.map((v) => ({ ...v.renderer.info.memory, ...v.effect.telemetry() })),
    capture:() => views.map((v) => { v.render(state.time); return v.canvas.toDataURL("image/png"); }),
    audit:() => {
      const scene = new T.Scene(), camera = views[0].camera;
      let total = 0;
      for (const skill of skills) for (const version of versions) {
        const effect = instantiate(skill.id, version, { scene, camera });
        effect.cast();
        for (const t of [0.1, 0.4, 0.8, 1.2, 1.8, 3.5]) {
          effect.seek(t);
          views[0].renderer.render(scene, camera);
        }
        const count = effect.tracks.length;
        effect.cast();
        effect.seek(0.8);
        if (effect.tracks.length !== count) throw new Error(`Cast acumulou camadas: ${skill.id}`);
        scene.traverse((object) => {
          if (![...object.position, ...object.scale].every(Number.isFinite)) throw new Error(`Transform inválido: ${skill.id}`);
        });
        effect.dispose();
        if (scene.children.length) throw new Error(`Resíduo: ${skill.id} ${version}`);
        total++;
      }
      return { total, remainingObjects:scene.children.length };
    },
  };
  addEventListener("pagehide", () => { cancelAnimationFrame(raf); views.forEach((v) => v.dispose()); views = []; }, { once:true });
} catch (error) {
  $("fatal").hidden = false;
  $("fatal").textContent = `Não foi possível abrir o lab.\n${error.message}`;
  throw error;
}
