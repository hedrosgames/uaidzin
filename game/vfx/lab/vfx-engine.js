const THREE = globalThis.THREE;

const phaseNames = ["antecipação", "ação", "impacto", "dissipação"];

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function easeOut(value) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
}

function pulse(value) {
  return Math.sin(Math.min(1, Math.max(0, value)) * Math.PI);
}

function color(value) {
  return new THREE.Color(value);
}

function material(hex, opacity = 1, additive = false) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: opacity < 1,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !additive,
    side: THREE.DoubleSide,
  });
}

function canvasTexture(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 256, 256);
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function glowTexture(primary, secondary) {
  return canvasTexture((context) => {
    const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 122);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.12, primary);
    gradient.addColorStop(0.46, secondary);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(2, 2, 252, 252);
  });
}

function runeTexture(glyph, primary, secondary) {
  return canvasTexture((context) => {
    context.strokeStyle = primary;
    context.lineWidth = 4;
    context.shadowBlur = 18;
    context.shadowColor = secondary;
    context.beginPath();
    context.arc(128, 128, 102, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([8, 13]);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(128, 128, 82, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = primary;
    context.font = "700 92px Georgia";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(glyph, 128, 128);
  });
}

function makeSprite(texture, tint, scale = 1) {
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    color: tint,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.setScalar(scale);
  return sprite;
}

function makeRing(radius, thickness, hex, opacity = 1) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(0.01, radius - thickness), radius, 64),
    material(hex, opacity, true),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.baseRadius = radius;
  mesh.userData.role = "ring";
  return mesh;
}

function makeTube(points, hex, radius = 0.045, opacity = 1) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, radius, 6, false),
    material(hex, opacity, true),
  );
  mesh.userData.role = "tube";
  return mesh;
}

function makeLine(points, hex, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  line.userData.role = "line";
  return line;
}

function makeShardField(spec, random, count) {
  const geometry = spec.style.includes("folha")
    ? new THREE.ConeGeometry(0.08, 0.38, 4)
    : new THREE.OctahedronGeometry(0.12, 0);
  const meshMaterial = new THREE.MeshStandardMaterial({
    color: spec.primary,
    emissive: color(spec.secondary),
    emissiveIntensity: 1.3,
    roughness: 0.35,
    metalness: spec.style.includes("ferro") ? 0.8 : 0.15,
    transparent: true,
    opacity: 0.95,
  });
  const instances = new THREE.InstancedMesh(geometry, meshMaterial, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 0.6 + random() * (1.8 + spec.tier * 0.15);
    position.set(Math.cos(angle) * radius, 0.12 + random() * 2.4, Math.sin(angle) * radius);
    quaternion.setFromEuler(new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI));
    const size = 0.5 + random() * 1.4;
    scale.setScalar(size);
    matrix.compose(position, quaternion, scale);
    instances.setMatrixAt(index, matrix);
  }
  instances.userData.role = "shards";
  return instances;
}

function makeShaderDome(spec) {
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uPrimary: { value: color(spec.primary) },
    uSecondary: { value: color(spec.secondary) },
  };
  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "varying vec2 vUv; varying vec3 vNormalW; void main(){vUv=uv; vNormalW=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: "uniform float uTime; uniform float uOpacity; uniform vec3 uPrimary; uniform vec3 uSecondary; varying vec2 vUv; varying vec3 vNormalW; void main(){float rim=pow(1.0-abs(vNormalW.z),2.2); float bands=0.55+0.45*sin((vUv.y*9.0-uTime*2.0)*6.2831); vec3 c=mix(uPrimary,uSecondary,bands); gl_FragColor=vec4(c,(rim*0.78+bands*0.12)*uOpacity);}",
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.55 + spec.tier * 0.12, 32, 16), shaderMaterial);
  dome.scale.y = 0.72;
  dome.position.y = 0.72;
  dome.userData.role = "shader";
  return dome;
}

function makeTarget(primary) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 1.1, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x332b25, metalness: 0.65, roughness: 0.48 }),
  );
  body.position.y = 0.9;
  group.add(body);
  const band = makeRing(0.55, 0.04, primary, 0.6);
  band.position.y = 0.02;
  group.add(band);
  group.userData.role = "target";
  return group;
}

function makeTotem(spec) {
  const group = new THREE.Group();
  const mainMaterial = new THREE.MeshStandardMaterial({
    color: spec.primary,
    emissive: color(spec.secondary),
    emissiveIntensity: 0.45,
    roughness: 0.62,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.78, 5, 8), mainMaterial);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.72;
  group.add(body);
  const headScale = spec.style.includes("urso") || spec.style.includes("titã") ? 0.48 : 0.32;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(headScale, 1), mainMaterial);
  head.position.set(0.68, 0.86, 0);
  group.add(head);
  const limbGeometry = new THREE.CylinderGeometry(0.08, 0.11, 0.72, 6);
  for (const x of [-0.35, 0.35]) {
    for (const z of [-0.22, 0.22]) {
      const limb = new THREE.Mesh(limbGeometry, darkMaterial);
      limb.position.set(x, 0.35, z);
      limb.rotation.z = x * 0.3;
      group.add(limb);
    }
  }
  if (spec.style.includes("condor") || spec.style.includes("dragão")) {
    for (const direction of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 3), mainMaterial);
      wing.rotation.z = direction * Math.PI / 2;
      wing.position.set(-0.05, 0.9, direction * 0.56);
      group.add(wing);
    }
  }
  if (spec.style.includes("lobo") || spec.style.includes("tigre")) {
    for (const direction of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.35, 4), mainMaterial);
      ear.position.set(0.66, 1.18, direction * 0.18);
      group.add(ear);
    }
  }
  group.userData.role = "totem";
  return group;
}

function makeClaw(spec, direction = 1) {
  const group = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const offset = (index - 1) * 0.24;
    const points = [
      new THREE.Vector3(-1.8 * direction, 0.45 + offset, -0.4),
      new THREE.Vector3(-0.55 * direction, 1.4 + offset, 0),
      new THREE.Vector3(1.7 * direction, 0.75 + offset, 0.35),
    ];
    group.add(makeTube(points, index === 1 ? spec.primary : spec.secondary, 0.055 + spec.tier * 0.004, 0.9));
  }
  group.userData.role = "claw";
  return group;
}

function makeArrow(spec, index = 0) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6),
    material(index % 2 ? spec.secondary : spec.primary, 1, true),
  );
  shaft.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.42, 5),
    material(spec.highlight, 1, true),
  );
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 1.25;
  group.add(shaft, tip);
  group.userData.role = "arrow";
  return group;
}

function makeBolt(spec, random) {
  const points = [];
  for (let index = 0; index < 9; index += 1) {
    const amount = index / 8;
    points.push(new THREE.Vector3(
      (random() - 0.5) * 0.5,
      4.8 - amount * 4.6,
      (random() - 0.5) * 0.5,
    ));
  }
  return makeLine(points, spec.highlight, 0.95);
}

function createQuarks(spec, context, group, random) {
  const Q = THREE.QUARKS;
  if (!Q || !context.batchRenderer) return null;
  const texture = glowTexture(spec.primary, spec.secondary);
  const particleMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    color: spec.primary,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const count = 10 + spec.tier * 4;
  const system = new Q.ParticleSystem({
    duration: 1.8 + spec.tier * 0.08,
    looping: false,
    startLife: new Q.IntervalValue(0.35, 0.8 + spec.tier * 0.05),
    startSpeed: new Q.IntervalValue(0.7, 2.2 + spec.tier * 0.16),
    startSize: new Q.IntervalValue(0.12, 0.34 + spec.tier * 0.02),
    startRotation: new Q.IntervalValue(0, Math.PI * 2),
    startColor: new Q.ConstantColor(new THREE.Vector4(1, 1, 1, 1)),
    emissionOverTime: new Q.ConstantValue(0),
    emissionBursts: [{ time: 0.18, count: new Q.ConstantValue(count), cycle: 1, interval: 0, probability: 1 }],
    shape: spec.shape === "line"
      ? new Q.ConeEmitter({ radius: 0.12, angle: 0.18, arc: Math.PI * 2 })
      : new Q.SphereEmitter({ radius: 0.32 + random() * 0.18, arc: Math.PI * 2 }),
    material: particleMaterial,
    behaviors: [
      new Q.ColorOverLife(new Q.ColorRange(
        new THREE.Vector4(1, 1, 1, 1),
        new THREE.Vector4(0.3, 0.08, 0.01, 0),
      )),
      new Q.SizeOverLife(new Q.PiecewiseBezier([[new Q.Bezier(0.5, 1.2, 0.7, 0), 0]])),
    ],
    renderMode: Q.RenderMode.BillBoard,
    worldSpace: false,
  });
  system.emitter.position.y = spec.technique === "projétil" ? 1.1 : 0.35;
  context.batchRenderer.addSystem(system);
  group.add(system.emitter);
  return { system, material: particleMaterial, texture, count };
}

function addTechnique(group, spec, random, textures) {
  const scale = 0.82 + spec.tier * 0.08;
  const rune = runeTexture(spec.glyph, spec.primary, spec.secondary);
  const glow = glowTexture(spec.primary, spec.secondary);
  textures.push(rune, glow);
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8 * scale, 2.8 * scale),
    new THREE.MeshBasicMaterial({
      map: rune,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.025;
  decal.userData.role = "decal";
  group.add(decal);
  const ring = makeRing(1.2 * scale, 0.055, spec.secondary, 0.72);
  ring.position.y = 0.04;
  group.add(ring);

  if (spec.technique === "onda") {
    for (let index = 0; index < 3 + Math.floor(spec.tier / 3); index += 1) {
      const wave = makeRing(0.65 + index * 0.42, 0.05 + index * 0.012, index % 2 ? spec.secondary : spec.primary, 0.78);
      wave.position.y = 0.06 + index * 0.025;
      wave.userData.delay = index * 0.08;
      group.add(wave);
    }
    group.add(makeClaw(spec, 1));
  } else if (spec.technique === "projétil") {
    const count = spec.hits || Math.min(5, 1 + Math.floor(spec.tier / 2));
    for (let index = 0; index < count; index += 1) {
      const projectile = spec.style.includes("flecha") || spec.style.includes("arco")
        ? makeArrow(spec, index)
        : makeSprite(glow, index % 2 ? spec.secondary : spec.primary, 0.65 + spec.tier * 0.045);
      projectile.position.set(-3.2 - index * 0.28, 0.85 + index * 0.12, (index - count / 2) * 0.22);
      projectile.userData.role = "projectile";
      projectile.userData.delay = index * 0.07;
      group.add(projectile);
    }
    const path = [
      new THREE.Vector3(-3.1, 0.9, 0),
      new THREE.Vector3(-0.5, 1.15 + spec.tier * 0.04, spec.motion === "serpente" ? 0.8 : 0),
      new THREE.Vector3(3.0, 0.75, 0),
    ];
    group.add(makeTube(path, spec.secondary, 0.035 + spec.tier * 0.004, 0.48));
    const target = makeTarget(spec.primary);
    target.position.x = 3.1;
    group.add(target);
  } else if (spec.technique === "campo") {
    group.add(makeShaderDome(spec));
    group.add(makeShardField(spec, random, 10 + spec.tier * 3));
    for (let index = 0; index < 4; index += 1) {
      const orbit = makeSprite(glow, index % 2 ? spec.secondary : spec.primary, 0.42 + spec.tier * 0.04);
      orbit.userData.role = "orbit";
      orbit.userData.angle = index * Math.PI / 2;
      group.add(orbit);
    }
  } else if (spec.technique === "aura") {
    group.add(makeShaderDome(spec));
    for (let index = 0; index < 3; index += 1) {
      const halo = makeRing(0.7 + index * 0.36, 0.04, index === 1 ? spec.highlight : spec.primary, 0.7);
      halo.rotation.set(Math.PI / 2, index * 0.65, 0);
      halo.position.y = 0.55 + index * 0.45;
      halo.userData.role = "halo";
      halo.userData.delay = index * 0.09;
      group.add(halo);
    }
    group.add(makeShardField(spec, random, 8 + spec.tier * 2));
  } else if (spec.technique === "barreira") {
    group.add(makeShaderDome(spec));
    const panels = 5 + Math.floor(spec.tier / 2);
    for (let index = 0; index < panels; index += 1) {
      const angle = index / panels * Math.PI * 2;
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 1.35, 0.07),
        new THREE.MeshStandardMaterial({
          color: spec.primary,
          emissive: color(spec.secondary),
          emissiveIntensity: 0.6,
          metalness: spec.style.includes("ferro") ? 0.85 : 0.25,
          roughness: 0.28,
          transparent: true,
          opacity: 0.66,
        }),
      );
      panel.position.set(Math.cos(angle) * 1.25, 0.78, Math.sin(angle) * 1.25);
      panel.rotation.y = -angle + Math.PI / 2;
      panel.userData.role = "panel";
      panel.userData.angle = angle;
      group.add(panel);
    }
  } else if (spec.technique === "corte") {
    group.add(makeClaw(spec, spec.motion === "reverso" ? -1 : 1));
    const cross = makeClaw({ ...spec, primary: spec.secondary, secondary: spec.highlight }, -1);
    cross.rotation.y = spec.tier >= 6 ? Math.PI / 2 : 0.16;
    cross.scale.setScalar(spec.tier >= 6 ? 0.8 : 0.55);
    group.add(cross);
  } else if (spec.technique === "invocação") {
    const count = spec.style.includes("exército") ? 3 : 1;
    for (let index = 0; index < count; index += 1) {
      const totem = makeTotem({ ...spec, style: count > 1 ? ["condor", "lobo", "tigre"][index] : spec.style });
      totem.position.set((index - (count - 1) / 2) * 1.55, 0, index % 2 ? -0.4 : 0.25);
      totem.userData.delay = index * 0.12;
      group.add(totem);
    }
    group.add(makeShaderDome(spec));
  } else if (spec.technique === "transformação") {
    const totem = makeTotem(spec);
    totem.scale.setScalar(1.15 + spec.tier * 0.055);
    group.add(totem);
    group.add(makeClaw(spec, 1));
    group.add(makeShaderDome(spec));
  } else if (spec.technique === "tempestade") {
    const bolts = 3 + Math.floor(spec.tier / 2);
    for (let index = 0; index < bolts; index += 1) {
      const bolt = makeBolt(spec, random);
      const angle = index / bolts * Math.PI * 2;
      bolt.position.set(Math.cos(angle) * (0.3 + index * 0.26), 0, Math.sin(angle) * (0.3 + index * 0.26));
      bolt.userData.delay = index * 0.06;
      group.add(bolt);
    }
    group.add(makeShardField(spec, random, 12 + spec.tier * 3));
  }
}

export class SkillVisualComposition {
  constructor(spec) {
    this.spec = Object.freeze({ ...spec });
    this.context = null;
    this.group = null;
    this.elapsed = 0;
    this.duration = 1.8 + spec.tier * 0.16;
    this.active = false;
    this.quarks = null;
    this.textures = [];
    this.phase = "pronta";
    this.castCount = 0;
    this.random = seeded(hash(spec.id));
  }

  setup(context) {
    if (!THREE) throw new Error("Three.js não foi carregado.");
    this.context = context;
    this.group = new THREE.Group();
    this.group.name = `v1_${this.spec.id}`;
    context.root.add(this.group);
    addTechnique(this.group, this.spec, this.random, this.textures);
    this.group.visible = false;
    return this;
  }

  cast() {
    if (!this.group) throw new Error(`Composição ${this.spec.id} sem setup.`);
    this.elapsed = 0;
    this.active = true;
    this.castCount += 1;
    this.phase = phaseNames[0];
    this.group.visible = true;
    this.group.scale.setScalar(0.001);
    this.group.rotation.set(0, 0, 0);
    if (this.quarks) this.disposeQuarks();
    if (this.spec.layers.includes("partículas")) {
      this.quarks = createQuarks(this.spec, this.context, this.group, this.random);
    }
    return this;
  }

  update(delta) {
    if (!this.active || !this.group) return;
    this.elapsed += delta;
    const progress = Math.min(1, this.elapsed / this.duration);
    const anticipationEnd = 0.2;
    const actionEnd = 0.48;
    const impactEnd = 0.7;
    const phaseIndex = progress < anticipationEnd ? 0 : progress < actionEnd ? 1 : progress < impactEnd ? 2 : 3;
    this.phase = phaseNames[phaseIndex];
    const anticipation = Math.min(1, progress / anticipationEnd);
    const action = Math.min(1, Math.max(0, (progress - anticipationEnd) / (actionEnd - anticipationEnd)));
    const impact = Math.min(1, Math.max(0, (progress - actionEnd) / (impactEnd - actionEnd)));
    const dissipate = Math.min(1, Math.max(0, (progress - impactEnd) / (1 - impactEnd)));
    const stageScale = progress < anticipationEnd
      ? 0.25 + easeOut(anticipation) * 0.55
      : progress < actionEnd
        ? 0.8 + easeOut(action) * 0.2
        : 1 + pulse(impact) * (0.2 + this.spec.tier * 0.025);
    this.group.scale.setScalar(stageScale);
    this.group.rotation.y += delta * (this.spec.motion === "órbita" ? 1.4 : 0.18);
    const fade = 1 - easeOut(dissipate);
    this.group.traverse((object) => {
      const role = object.userData.role;
      const delay = object.userData.delay || 0;
      const local = Math.max(0, progress - delay);
      if (object.material && "opacity" in object.material && role !== "target") {
        const base = role === "decal" ? 0.72 : 0.92;
        object.material.opacity = Math.max(0, base * fade * Math.min(1, local * 8));
      }
      if (role === "ring") {
        const expansion = 1 + easeOut(action) * (0.4 + this.spec.tier * 0.055);
        object.scale.setScalar(expansion);
        object.rotation.z += delta * (0.4 + this.spec.tier * 0.05);
      } else if (role === "projectile") {
        const travel = easeOut(Math.min(1, Math.max(0, action * 1.25 - delay)));
        object.position.x = -3.2 + travel * 6.2;
        object.position.y += Math.sin((travel + delay) * Math.PI) * delta * 0.8;
      } else if (role === "orbit") {
        const angle = object.userData.angle + this.elapsed * (1.2 + this.spec.tier * 0.08);
        const radius = 1.25 + pulse(action) * 0.7;
        object.position.set(Math.cos(angle) * radius, 0.55 + Math.sin(angle * 2) * 0.35, Math.sin(angle) * radius);
      } else if (role === "halo") {
        object.rotation.z += delta * (1.1 + this.spec.tier * 0.07);
        object.scale.setScalar(0.72 + easeOut(action) * 0.5);
      } else if (role === "panel") {
        const angle = object.userData.angle + this.elapsed * 0.35;
        const radius = 0.35 + easeOut(anticipation) * 0.95;
        object.position.x = Math.cos(angle) * radius;
        object.position.z = Math.sin(angle) * radius;
        object.rotation.y = -angle + Math.PI / 2;
      } else if (role === "claw") {
        object.rotation.z = -0.5 + easeOut(action) * 1.0;
        object.scale.setScalar(0.55 + easeOut(action) * 0.55);
      } else if (role === "totem") {
        object.position.y = -0.65 + easeOut(Math.min(1, action * 1.4)) * 0.65;
        object.rotation.y += delta * 0.35;
      } else if (role === "shader") {
        object.material.uniforms.uTime.value = this.elapsed;
        object.material.uniforms.uOpacity.value = fade * (0.35 + pulse(action) * 0.55);
        object.rotation.y += delta * 0.28;
      } else if (role === "shards") {
        object.rotation.y += delta * (0.45 + this.spec.tier * 0.04);
        object.rotation.x = Math.sin(this.elapsed * 1.4) * 0.12;
      } else if (role === "line" || role === "tube") {
        object.scale.y = 0.2 + easeOut(action) * 0.8;
      }
    });
    if (progress >= 1) {
      this.active = false;
      this.phase = "pronta";
      this.group.visible = false;
      this.disposeQuarks();
      if (this.context.loop) this.cast();
    }
  }

  getTelemetry() {
    let objects = 0;
    this.group?.traverse(() => {
      objects += 1;
    });
    return {
      objects,
      particles: this.quarks?.count || 0,
      phase: this.phase,
      casts: this.castCount,
      active: this.active,
    };
  }

  disposeQuarks() {
    if (!this.quarks) return;
    if (this.context?.batchRenderer) this.context.batchRenderer.deleteSystem(this.quarks.system);
    this.quarks.system.emitter.removeFromParent();
    this.quarks.material.dispose();
    this.quarks.texture.dispose();
    this.quarks = null;
  }

  dispose() {
    this.disposeQuarks();
    if (!this.group) return;
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((entry) => {
        if (entry.map && !this.textures.includes(entry.map)) entry.map.dispose();
        entry.dispose();
      });
    });
    this.textures.forEach((texture) => texture.dispose());
    this.textures.length = 0;
    this.group.removeFromParent();
    this.group.clear();
    this.group = null;
    this.context = null;
    this.active = false;
  }
}

export function createSkillComposition(spec) {
  return new SkillVisualComposition(spec);
}
