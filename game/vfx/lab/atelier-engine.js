import * as T from "three";
import { PALETTE } from "./score.js";

const TAU = Math.PI * 2;
const clamp = (n) => Math.max(0, Math.min(1, n));
const out = (n) => 1 - (1 - clamp(n)) ** 3;
const rise = (n) => Math.sin(clamp(n) * Math.PI);
const vec = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const typesParticle = new Set(["embers", "shards", "dust", "leaves", "motes", "heal"]);
const beasts = new Set(["wolf", "bear", "tiger", "condor", "dragon", "titan"]);

function rng(text) {
  let seed = [...text].reduce((a, b) => Math.imul(a ^ b.charCodeAt(0), 16777619), 2166136261);
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function ribbon(radius, width, sweep = 4.2, lift = 0) {
  const points = [], uvs = [], indices = [];
  for (let i = 0; i <= 48; i++) {
    const u = i / 48, a = -sweep / 2 + sweep * u;
    const taper = Math.sin(Math.PI * u) ** 0.7;
    for (let side = 0; side < 2; side++) {
      const r = radius - side * width * taper;
      points.push(Math.cos(a) * r, Math.sin(a) * r, lift * u);
      uvs.push(u, side);
    }
    if (i < 48) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(points, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function energyMaterial(hex, surface = false) {
  return new T.ShaderMaterial({
    uniforms: { ink: { value: new T.Color(hex) }, time: { value: 0 }, alpha: { value: 1 } },
    vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vP; void main(){vUv=uv;vN=normalize(normalMatrix*normal);vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `
      uniform vec3 ink; uniform float time; uniform float alpha;
      varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main(){
        float f=sin(vP.x*8.+time*8.)*sin(vP.y*5.-time*6.)+sin(vP.z*8.+time*3.);
        float bands=smoothstep(-.3,.1,f);
        float rim=pow(1.-abs(vN.z),2.);
        vec3 c=mix(ink*.38,ink*1.55,bands);
        c=mix(c,vec3(1.6,1.4,1.05),rim*.48);
        float edge=${surface ? "1." : "sin(vUv.x*3.14159)*(.35+.65*(1.-vUv.y))"};
        gl_FragColor=vec4(c,alpha*edge);
      }`,
    transparent: true, depthWrite: false, side: T.DoubleSide,
    blending: surface ? T.NormalBlending : T.AdditiveBlending,
  });
}

export class AtelierComposition {
  constructor(skill, proposal, version) {
    this.skill = skill;
    this.proposal = proposal;
    this.version = version;
    this.tracks = [];
    this.materials = new Set();
    this.geometries = new Set();
    this.textures = new Set();
    this.time = 0;
    this.active = false;
    this.random = rng(`${skill.id}-${version}`);
    this.baseColor = PALETTE[skill.element] ?? ({ TK: "#e7b875", FM: "#baddeb", BM: "#84c596", HT: "#dfcb92" }[skill.classId]);
    this.duration = Math.max(...proposal.layers.map((l) => l.delay + this.life(l))) + 0.08;
  }

  life(layer) {
    if (beasts.has(layer.type)) return 1.9;
    if (["shield", "cage", "crown", "echo", "heal"].includes(layer.type)) return 1.6;
    if (["bolt", "slash", "claw"].includes(layer.type)) return 0.85;
    return 1.35;
  }

  mat(hex, solid = false) {
    const material = solid
      ? new T.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.38, metalness: 0.4, roughness: 0.55, transparent: true })
      : new T.MeshBasicMaterial({ color: hex, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false });
    this.materials.add(material);
    return material;
  }

  mesh(geometry, material, group, position) {
    this.geometries.add(geometry);
    this.materials.add(material);
    const mesh = new T.Mesh(geometry, material);
    if (position) mesh.position.copy(position);
    group.add(mesh);
    return mesh;
  }

  tube(points, radius, material, group) {
    return this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), Math.max(16, points.length * 4), radius, 5, false), material, group);
  }

  ring(group, radius, width, material, y = 0.055) {
    const ring = this.mesh(new T.RingGeometry(Math.max(0.01, radius - width), radius, 64), material, group, vec(0, y, 0));
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }

  setup(context) {
    if (this.root) throw new Error("Composição já montada.");
    this.context = context;
    this.root = new T.Group();
    context.scene.add(this.root);
    this.origin = vec(-2.5, 0, 0);
    this.target = vec(2.4, 0, 0);
    for (const layer of this.proposal.layers) this.build(layer);
    this.seek(0);
    return this;
  }

  build(layer) {
    const group = new T.Group();
    this.root.add(group);
    const hex = layer.tint ? PALETTE[layer.tint] : this.baseColor;
    const material = this.mat(hex);
    const white = this.mat("#fff0c9");
    const localMaterials = [material, white];
    let animate;
    if (typesParticle.has(layer.type)) animate = this.particles(layer, group, hex, localMaterials);
    else if (beasts.has(layer.type)) animate = this.beast(layer, group, hex, localMaterials);
    else animate = this.geometry(layer, group, hex, material, white, localMaterials);
    this.tracks.push({ layer, group, animate, materials: localMaterials });
  }

  particles(layer, group, hex, materials) {
    const type = layer.type, count = layer.count;
    const soft = ["dust", "motes", "heal", "embers"].includes(type);
    const geometry = soft ? new T.PlaneGeometry(1, 1) : new T.OctahedronGeometry(0.12, 0);
    let material;
    if (soft) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const c = canvas.getContext("2d");
      const gradient = c.createRadialGradient(32, 32, 2, 32, 32, 30);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(type === "dust" ? 0.35 : 0.12, "rgba(255,255,255,0.65)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gradient;
      c.fillRect(0, 0, 64, 64);
      const texture = new T.CanvasTexture(canvas);
      this.textures.add(texture);
      material = new T.MeshBasicMaterial({ color: type === "dust" ? "#b1a38c" : hex, map: texture, transparent: true, depthWrite: false, side: T.DoubleSide, blending: type === "dust" ? T.NormalBlending : T.AdditiveBlending });
    } else material = this.mat(hex, true);
    this.materials.add(material);
    materials.push(material);
    this.geometries.add(geometry);
    const mesh = new T.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    mesh.userData.particles = count;
    group.add(mesh);
    const seeds = Array.from({ length: count }, () => ({
      a: this.random() * TAU, v: 0.5 + this.random() * 2, h: this.random() * 2, lag: this.random() * 0.22, n: this.random(),
    }));
    const dummy = new T.Object3D(), cameraQ = new T.Quaternion();
    return (p, age) => {
      if (this.context.camera) this.context.camera.getWorldQuaternion(cameraQ);
      for (let i = 0; i < count; i++) {
        const s = seeds[i], u = clamp((p - s.lag) / (1 - s.lag));
        const alive = p >= s.lag && u < 1;
        let r = s.v * out(u), y = Math.max(0, (4 + s.h) * u - 4 * u * u), angle = s.a;
        if (type === "heal") { r = (1 - u) * (0.8 + s.n); y = u * 2.5; angle += u * 3; }
        if (type === "leaves") { r = 0.8 + u; y = 0.1 + Math.sin(u * Math.PI) * 1.8; angle += u * 3; }
        if (type === "dust") y = 0.15 + out(u) * 0.5;
        if (type === "motes") { r = (0.6 + s.n) * (1 - 0.3 * u); y = s.h + u * 0.8; angle += u * 2; }
        dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        if (soft) dummy.quaternion.copy(cameraQ);
        else dummy.rotation.set(age * 3 + s.a, s.a, age * 4);
        const size = (type === "dust" ? 0.5 + u : type === "embers" ? 0.12 : 0.17) * (1 - u) * (0.6 + s.n);
        dummy.scale.setScalar(alive ? Math.max(0.001, soft ? size : (1 - u) * 1.4) : 0.001);
        if (type === "leaves") dummy.scale.set(dummy.scale.x * 0.45, dummy.scale.y * 2, dummy.scale.z * 0.4);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
  }

  geometry(layer, group, hex, mat, white, materials) {
    const { type, count } = layer;
    const parts = [];
    const add = (geo, material = mat, pos) => {
      const mesh = this.mesh(geo, material, group, pos);
      parts.push(mesh);
      return mesh;
    };
    if (type === "sigil" || type === "mark") {
      this.ring(group, type === "sigil" ? 1.5 : 0.65, 0.025, mat);
      this.ring(group, type === "sigil" ? 1.25 : 0.52, 0.012, white, 0.058);
      const ticks = type === "sigil" ? 20 : 4;
      for (let i = 0; i < ticks; i++) {
        const a = i / ticks * TAU, r = type === "sigil" ? 1.35 : 0.6;
        const tick = add(new T.BoxGeometry(0.025, 0.02, i % 3 ? 0.11 : 0.25), mat, vec(Math.cos(a) * r, 0.065, Math.sin(a) * r));
        tick.rotation.y = -a;
      }
      for (let i = 0; i < count; i++) {
        const diamond = add(new T.TorusGeometry(0.32 + i * 0.13, 0.016, 4, 4), white, vec(0, type === "mark" ? 1.5 : 0.08, 0));
        diamond.rotation.x = type === "mark" ? 0 : Math.PI / 2;
      }
      return (p, age) => { group.rotation.y = age * 0.3; group.scale.multiplyScalar(0.5 + 0.5 * out(p * 4)); };
    }
    if (type === "wave") {
      for (let i = 0; i < count; i++) {
        const ring = this.ring(group, 1, 0.11 - i * 0.014, i % 2 ? white : mat, 0.05 + i * 0.025);
        parts.push(ring);
      }
      return (p) => parts.forEach((mesh, i) => {
        const u = clamp(p * 1.5 - i * 0.12);
        mesh.scale.setScalar(0.15 + out(u) * 2.2);
      });
    }
    if (type === "slash" || type === "claw") {
      const n = type === "claw" ? count * 3 : count;
      const shader = energyMaterial(hex);
      this.materials.add(shader); materials.push(shader);
      for (let i = 0; i < n; i++) {
        const blade = add(ribbon(1.25, type === "claw" ? 0.15 : 0.45, type === "claw" ? 2.2 : 4.4), shader, vec(0, 1 + (i % 3) * 0.16, i * 0.12));
        blade.rotation.set(type === "claw" ? -0.2 : 1.15, 0.4, -0.8 + i * 0.45);
      }
      return (p) => {
        parts.forEach((part, i) => {
          part.rotation.z = -1.2 + out(p * 2) * 1.8 + i * 0.45;
          part.scale.setScalar(0.3 + out(p * 3) * 0.8);
        });
      };
    }
    if (type === "arrow" || type === "lance") {
      for (let i = 0; i < count; i++) {
        const dart = new T.Group();
        const shaft = this.mesh(new T.CylinderGeometry(0.018, 0.025, 1.4, 5), white, dart);
        shaft.rotation.z = -Math.PI / 2;
        const tip = this.mesh(new T.ConeGeometry(type === "lance" ? 0.14 : 0.08, 0.45, 4), mat, dart, vec(0.85));
        tip.rotation.z = -Math.PI / 2;
        const tail = this.mesh(ribbon(0.65, 0.12, 2.4), mat, dart, vec(-0.9));
        tail.rotation.z = Math.PI;
        group.add(dart); parts.push(dart);
      }
      return (p) => parts.forEach((dart, i) => {
        const u = out(clamp((p - i * 0.035) * 1.8));
        if (layer.anchor === "m") {
          dart.position.set(-this.distance / (2 * layer.size) + u * this.distance / layer.size, 1.1 + Math.sin(u * Math.PI) * (i % 2 ? 0.4 : 0.08), (i - (count - 1) / 2) * 0.16);
        } else if (layer.anchor === "t") {
          const a = i * TAU / count;
          dart.rotation.z = -Math.PI / 2;
          dart.position.set(Math.cos(a) * (count > 1 ? 1 : 0), 4.2 * (1 - u) + 0.5, Math.sin(a) * (count > 1 ? 1 : 0));
        } else {
          dart.rotation.z = -0.6 + i * 1.2;
          dart.position.set((i - (count - 1) / 2) * 0.5, 1.6, 0);
        }
        dart.scale.setScalar(0.3 + Math.sin(Math.PI * clamp(p)) * 0.7);
      });
    }
    if (type === "orb") {
      const shader = energyMaterial(hex, true);
      this.materials.add(shader); materials.push(shader);
      for (let i = 0; i < count; i++) {
        const sphere = add(new T.IcosahedronGeometry(0.55, 2), shader);
        const band = this.mesh(ribbon(0.7, 0.16, 5.4), mat, sphere);
        band.rotation.x = 1.1;
      }
      return (p, age) => parts.forEach((sphere, i) => {
        const a = i * TAU / count + age * 2.5, r = count > 1 ? 1 : 0;
        sphere.position.set(Math.cos(a) * r, 1.1 + Math.sin(a) * 0.25, Math.sin(a) * r);
        if (layer.anchor === "m") sphere.position.x += (out(p * 1.6) - 0.5) * this.distance / layer.size;
        sphere.scale.setScalar(Math.max(0.01, rise(p) ** 0.45));
        sphere.rotation.set(age, age * 2, i);
      });
    }
    if (type === "beam" || type === "bolt") {
      for (let i = 0; i < count; i++) {
        const a = i * TAU / count, x = count > 1 ? Math.cos(a) * 0.8 : 0, z = count > 1 ? Math.sin(a) * 0.8 : 0;
        const node = new T.Group(); group.add(node); parts.push(node);
        node.position.set(x, 0, z);
        if (type === "beam") {
          this.mesh(new T.CylinderGeometry(0.07, 0.18, 5.5, 8, 1, true), white, node, vec(0, 2.75));
          this.mesh(new T.CylinderGeometry(0.28, 0.42, 5.5, 8, 1, true), mat, node, vec(0, 2.75));
          this.ring(node, 0.65, 0.08, mat);
        } else {
          const path = Array.from({ length: 10 }, (_, j) => layer.anchor === "m"
            ? vec((j / 9 - 0.5) * 5, 1.2 + (this.random() - 0.5) * 0.7, (this.random() - 0.5) * 0.5)
            : vec((this.random() - 0.5) * 0.6, (1 - j / 9) * 4.5, (this.random() - 0.5) * 0.6));
          this.tube(path, 0.025, white, node);
          this.tube(path, 0.075, mat, node);
          this.tube([path[4], path[4].clone().add(vec(0.6, -0.5, 0.3)), path[7].clone().add(vec(1, 0, 0))], 0.025, mat, node);
        }
      }
      return (p) => parts.forEach((part, i) => {
        part.scale.setScalar(type === "bolt" ? 0.96 + Math.sin(p * 24 + i) * 0.04 : 0.4 + rise(p) * 0.6);
        part.visible = p > i * 0.025 && (type !== "bolt" || Math.sin(p * 32 + i) > -0.7);
      });
    }
    if (["shield", "cage", "crown"].includes(type)) {
      const solid = this.mat(hex, true); materials.push(solid);
      const shape = new T.Shape();
      shape.moveTo(-0.45, 0.55); shape.lineTo(0.45, 0.55); shape.lineTo(0.48, -0.15); shape.lineTo(0, -0.7); shape.lineTo(-0.48, -0.15); shape.closePath();
      for (let i = 0; i < count; i++) {
        const a = count === 1 ? Math.PI / 2 : i / count * TAU;
        const node = new T.Group(); node.userData.angle = a; group.add(node); parts.push(node);
        if (type === "shield") {
          this.mesh(new T.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 1, steps: 1 }), solid, node);
          this.mesh(new T.TorusGeometry(0.25, 0.018, 4, 4), white, node, vec(0, 0.05, 0.105));
          node.rotation.y = -a + Math.PI / 2;
        } else if (type === "cage") {
          this.tube([vec(-1.2, 0), vec(-1.15, 1.8), vec(0, 3), vec(1.15, 1.8), vec(1.2, 0)], 0.06, mat, node);
          node.rotation.y = a;
        } else {
          this.ring(node, 0.8, 0.06, mat, 1.85);
          for (let j = 0; j < 7; j++) {
            const b = j / 7 * TAU;
            this.mesh(new T.ConeGeometry(0.07, 0.4, 4), white, node, vec(Math.cos(b) * 0.8, 2.02, Math.sin(b) * 0.8));
          }
        }
      }
      return (p, age) => parts.forEach((part, i) => {
        const a = part.userData.angle;
        part.position.set(type === "shield" ? Math.cos(a) * (0.6 + out(p * 4) * 0.7) : 0, type === "shield" ? 1.1 : 0.1 + i * 0.2, type === "shield" ? Math.sin(a) * (0.6 + out(p * 4) * 0.7) : 0);
        part.scale.y = 0.08 + out(p * 4) * 0.92;
        if (type === "crown") part.rotation.y = age * (i % 2 ? -0.4 : 0.4);
      });
    }
    if (type === "vortex" || type === "drain" || type === "chain") {
      const linkGeo = new T.TorusGeometry(0.075, 0.026, 4, 8);
      if (type === "chain") this.geometries.add(linkGeo);
      for (let i = 0; i < count; i++) {
        const node = new T.Group(); group.add(node); parts.push(node);
        const points = [];
        const links = type === "chain" ? new T.InstancedMesh(linkGeo, mat, 33) : null;
        const transform = new T.Object3D();
        if (links) {
          links.frustumCulled = false;
          node.add(links);
        }
        for (let j = 0; j <= 32; j++) {
          const u = j / 32, a = u * TAU * 1.8 + i * TAU / count;
          const pos = type === "vortex" ? vec(Math.cos(a) * (1 - u) * 1.6, u * 3, Math.sin(a) * (1 - u) * 1.6)
            : vec((u - 0.5) * 5 / layer.size, 0.9 + Math.sin(u * Math.PI) * (0.6 + i * 0.3), Math.sin(u * TAU + i * 2) * (0.22 + i * 0.15));
          points.push(pos);
          if (links) {
            transform.position.copy(pos);
            transform.rotation.set(j % 2 ? Math.PI / 2 : 0, 0.3, j * 0.18);
            transform.scale.set(1.5, 1, 1);
            transform.updateMatrix();
            links.setMatrixAt(j, transform.matrix);
          }
        }
        if (type !== "chain") {
          this.tube(points, type === "vortex" ? 0.065 : 0.028, mat, node);
          if (type === "vortex") this.tube(points.map((v) => v.clone().multiplyScalar(0.92)), 0.015, white, node);
        }
      }
      return (p, age) => {
        if (type === "vortex") group.rotation.y = age * 4;
        parts.forEach((part, i) => {
          part.scale.setScalar(0.2 + out(p * 3 - i * 0.04) * 0.8);
          if (type !== "vortex") part.position.y = Math.sin(age * 4 + i) * 0.06;
        });
      };
    }
    if (["rift", "rock", "crystal"].includes(type)) {
      const solid = this.mat(hex, true); materials.push(solid);
      for (let i = 0; i < count; i++) {
        const a = i * TAU / count;
        let part;
        if (type === "rift") {
          const points = Array.from({ length: 8 }, (_, j) => vec((j - 3.5) * 0.5, 0.05, (this.random() - 0.5) * 0.35));
          part = this.tube(points, 0.045, mat, group);
        } else {
          part = this.mesh(type === "rock" ? new T.DodecahedronGeometry(0.45, 0) : new T.OctahedronGeometry(0.45, 0), solid, group);
          part.rotation.set(this.random() * 0.5, a, this.random() * 0.4);
        }
        parts.push(part); part.userData.angle = a;
      }
      return (p) => parts.forEach((part, i) => {
        const a = part.userData.angle, u = out(clamp(p * 3 - i * 0.04));
        part.position.set(Math.cos(a) * (count > 1 ? 1 : 0), type === "rift" ? 0.05 : -0.2 + u * (0.6 + i % 3 * 0.15), Math.sin(a) * (count > 1 ? 1 : 0));
        part.scale.set(type === "rift" ? u : 0.7, type === "rift" ? 1 : u * (type === "crystal" ? 2.8 : 1.2), type === "rift" ? 1 : 0.7);
        if (type === "rift") part.rotation.y = a;
      });
    }
    if (type === "moon" || type === "feather") {
      for (let i = 0; i < count; i++) {
        const part = add(ribbon(type === "moon" ? 0.85 : 0.7, type === "moon" ? 0.24 : 0.19, type === "moon" ? 4.7 : 2.4), mat);
        part.userData.angle = i * TAU / count;
        if (type === "feather") {
          this.tube([vec(0.2, -0.6), vec(0.62, 0), vec(0.2, 0.6)], 0.012, white, part);
          for (let j = 0; j < 5; j++) this.tube([vec(0.52, j * 0.18 - 0.4), vec(0.23, j * 0.18 - 0.33)], 0.01, mat, part);
        }
      }
      return (p, age) => parts.forEach((part, i) => {
        const a = part.userData.angle + age * 0.4;
        part.position.set(Math.cos(a) * (count > 1 ? 1 : 0), (type === "moon" ? 2.6 : 1) + Math.sin(p * Math.PI) * 0.45, Math.sin(a) * (count > 1 ? 0.7 : 0));
        part.rotation.z = type === "moon" ? -0.3 : a;
        part.scale.setScalar(out(p * 5) * (1 - p * 0.4));
      });
    }
    if (type === "echo") {
      for (let i = 0; i < count; i++) {
        const node = new T.Group(); group.add(node); parts.push(node);
        this.mesh(new T.CapsuleGeometry(0.32, 0.8, 4, 8), mat, node, vec(0, 0.95));
        this.mesh(new T.IcosahedronGeometry(0.22, 0), white, node, vec(0, 1.75));
      }
      return (p) => parts.forEach((part, i) => part.position.set((i - (count - 1) / 2) * out(p) * 1.4, 0, Math.sin(p * Math.PI) * 0.3));
    }
    throw new Error(`Primitiva não implementada: ${type}`);
  }

  beast(layer, group, hex, materials) {
    const skin = this.mat(hex, true), light = this.mat("#fff1b4");
    skin.color.multiplyScalar(0.32);
    skin.emissiveIntensity = 0.7;
    skin.depthWrite = false;
    skin.userData.alpha = 0.58;
    const outline = new T.LineBasicMaterial({ color:hex, transparent:true, opacity:0.5, depthWrite:false, blending:T.AdditiveBlending });
    this.materials.add(outline);
    materials.push(outline);
    materials.push(skin, light);
    const type = layer.type;
    const part = (geo, pos, scale = [1, 1, 1], material = skin) => {
      const mesh = this.mesh(geo, material, group, vec(...pos));
      mesh.scale.set(...scale);
      if (material === skin) {
        const edges = new T.EdgesGeometry(geo, 28);
        this.geometries.add(edges);
        mesh.add(new T.LineSegments(edges, outline));
      }
      return mesh;
    };
    if (type === "titan") {
      part(new T.DodecahedronGeometry(0.65), [0, 1.4, 0], [1.2, 1.3, 0.7]);
      part(new T.IcosahedronGeometry(0.35), [0, 2.45, 0]);
      for (const side of [-1, 1]) {
        part(new T.DodecahedronGeometry(0.42), [side * 0.85, 1.55, 0], [0.9, 1.6, 0.9]);
        part(new T.DodecahedronGeometry(0.4), [side * 0.4, 0.4, 0], [0.8, 1.5, 0.9]);
        part(new T.BoxGeometry(0.14, 0.065, 0.04), [side * 0.12, 2.5, 0.3], [1, 1, 1], light);
      }
    } else {
      const bear = type === "bear", bird = type === "condor";
      part(new T.IcosahedronGeometry(0.5, 1), [0, 0.9, 0], [bear ? 1.5 : 1.7, bear ? 1.2 : 0.7, 0.7]);
      part(new T.IcosahedronGeometry(bear ? 0.38 : 0.28, 1), [0.65, 1.2, 0], [1, 1, 0.85]);
      const muzzle = part(new T.ConeGeometry(bird ? 0.09 : 0.14, 0.38, 4), [0.95, 1.12, 0]);
      muzzle.rotation.z = -Math.PI / 2;
      for (const side of [-1, 1]) {
        part(new T.SphereGeometry(0.044, 6, 4), [0.8, 1.28, side * 0.21], [1, 1, 1], light);
        if (!bird) part(new T.ConeGeometry(0.13, bear ? 0.14 : 0.32, 4), [0.52, 1.53, side * 0.19]);
        for (const x of [-0.45, 0.45]) {
          const leg = part(new T.CylinderGeometry(0.085, 0.11, 0.62, 5), [x, 0.35, side * 0.25]);
          leg.rotation.z = x * 0.35;
        }
      }
      const tail = this.tube([vec(-0.6, 0.85), vec(-1.1, 0.7), vec(-1.45, 1.1)], 0.09, skin, group);
      tail.scale.setScalar(bear ? 0.35 : 1);
      if (type === "tiger") for (let i = 0; i < 5; i++) {
        const band = part(new T.TorusGeometry(0.37, 0.025, 4, 8, Math.PI), [-0.45 + i * 0.2, 0.92, 0], [1, 1, 1], light);
        band.rotation.y = Math.PI / 2;
      }
      if (bird || type === "dragon") for (const side of [-1, 1]) {
        const shape = new T.Shape();
        shape.moveTo(0, 0); shape.lineTo(-0.5, 1); shape.lineTo(-1.7, 1.6); shape.lineTo(-1.15, 0.2); shape.lineTo(-0.65, 0.35); shape.closePath();
        const wing = part(new T.ShapeGeometry(shape), [-0.05, 1, 0], [1, 1, 1], skin);
        wing.rotation.set(side * 0.9, side * 1.1, -0.3);
        skin.side = T.DoubleSide;
        if (bird) for (let j = 0; j < 5; j++) {
          const feather = part(new T.ConeGeometry(0.09, 0.9, 3), [-0.5 - j * 0.18, 1.45, side * (0.5 + j * 0.16)], [1, 1, 1], light);
          feather.rotation.x = side * 0.8;
        }
      }
    }
    return (p) => {
      const u = out(p * 3);
      group.scale.multiplyScalar(0.05 + u * 0.95);
      group.position.y += (type === "condor" || type === "dragon" ? Math.sin(p * Math.PI) * 0.8 : 0);
      if (layer.anchor === "m") group.position.x += (out(p * 2) - 0.5) * this.distance;
      group.rotation.z = Math.sin(p * Math.PI) * (type === "tiger" ? -0.13 : 0.025);
    };
  }

  cast(origin = this.origin, target = this.target) {
    this.origin.copy(origin);
    this.target.copy(target);
    this.active = true;
    this.seek(0);
  }

  seek(time) {
    if (!this.root) return;
    this.time = Math.max(0, time);
    this.distance = this.origin.distanceTo(this.target);
    const yaw = -Math.atan2(this.target.z - this.origin.z, this.target.x - this.origin.x);
    for (const { layer, group, animate, materials } of this.tracks) {
      const age = this.time - layer.delay, p = age / this.life(layer);
      group.visible = p >= 0 && p <= 1;
      if (!group.visible) continue;
      group.position.copy(layer.anchor === "s" ? this.origin : layer.anchor === "t" ? this.target : this.origin.clone().lerp(this.target, 0.5));
      group.scale.setScalar(layer.size);
      group.rotation.set(0, yaw, 0);
      animate(p, age);
      const alpha = clamp(p * 12) * (1 - clamp((p - 0.5) / 0.5));
      for (const material of materials) {
        if (material.uniforms) {
          material.uniforms.alpha.value = alpha;
          material.uniforms.time.value = age;
        } else material.opacity = alpha * (material.userData.alpha ?? (material.blending === T.AdditiveBlending ? 0.68 : 0.92));
      }
    }
    this.active = this.time < this.duration;
  }

  update(dt) { this.seek(this.time + dt); }

  telemetry() {
    let particles = 0, objects = 0;
    this.root?.traverseVisible((o) => {
      if (o.isMesh) objects++;
      particles += o.userData.particles ?? 0;
    });
    return { particles, objects, time: this.time, duration: this.duration, active: this.active };
  }

  dispose() {
    this.root?.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    this.root?.removeFromParent();
    this.root?.clear();
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const texture of this.textures) texture.dispose();
    this.tracks.length = 0;
    this.materials.clear(); this.geometries.clear(); this.textures.clear();
    this.root = null;
    this.active = false;
  }
}
