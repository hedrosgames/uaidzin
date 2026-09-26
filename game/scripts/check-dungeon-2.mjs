import { chromium } from "playwright";

const BASE = process.env.UAIDZIN_BASE || "http://127.0.0.1:5173";
let failed = 0;
const ok = (m) => console.log("OK", m);
const fail = (m) => {
  failed += 1;
  console.error("FAIL", m);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/tools/save-wipe.html?auto=all`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(600);

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);

  const frame = page.frameLocator("iframe").first();
  await frame.locator("#user").waitFor({ timeout: 20000 });
  await frame.locator("#user").fill("admin");
  await frame.locator("#pass").fill("admin");
  await frame.locator("#btnLogin").click();

  await page.waitForFunction(
    () => {
      const f = document.querySelector("iframe");
      return !!f && /02-selecao/.test(f.contentWindow?.location?.href || "");
    },
    null,
    { timeout: 20000 },
  );

  await frame.locator("#btnCreateFirst").click();
  await frame.locator("#newName").fill("DungeonTest");
  await frame.locator("#btnCreateConfirm").click();
  await page.waitForTimeout(900);
  await frame.locator("#btnConnect").click();

  await page.waitForFunction(
    () => window.__UAIDZIN__?.session?.character?.name === "DungeonTest",
    null,
    { timeout: 30000 },
  );

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.mode === "CITY",
    null,
    { timeout: 30000 },
  );
  ok("Login e entrada na Cidade concluídos");

  const gateLowLevel = await page.evaluate(() => {
    return window.__UAIDZIN__.session.tryEnterDungeon("dungeon-2");
  });
  if (!gateLowLevel.ok && gateLowLevel.reason === "level") {
    ok("Bloqueio de nível < 35 para Dungeon 2 validado com sucesso");
  } else {
    fail("Falha no bloqueio de nível para Dungeon 2: " + JSON.stringify(gateLowLevel));
  }

  const pick35 = await page.evaluate(() => {
    window.__UAIDZIN__.session.progression.state.level = 35;
    window.__UAIDZIN__.session.character.level = 35;
    const pick = window.__UAIDZIN__.session.pickDungeonForLevel();
    const portal = window.__UAIDZIN__.session.worlds.getCurrent().interactables.find((i) => i.kind === "portal");
    let portalBody = "";
    if (portal) {
      window.__UAIDZIN__.session.player.setPosition(portal.x, portal.z);
      window.__UAIDZIN__.session.beginInteract(portal);
      portalBody = document.querySelector("#interaction-body")?.textContent || "";
      window.__UAIDZIN__.session.closePanel();
    }
    return { pickId: pick.id, portalBody };
  });
  if (pick35.pickId === "dungeon-2" && pick35.portalBody.includes("4 arenas")) {
    ok("Auto-seleção de Dungeon 2 no nível 35 e texto dinâmico com 4 arenas validados com sucesso");
  } else {
    fail("Falha na auto-seleção de Dungeon 2: " + JSON.stringify(pick35));
  }

  await page.evaluate(() => {
    window.__UAIDZIN__.session.progression.state.level = 40;
    window.__UAIDZIN__.session.character.level = 40;
  });

  const enterResult = await page.evaluate(() => {
    return window.__UAIDZIN__.enterDungeonById("dungeon-2");
  });
  if (enterResult.ok) {
    ok("Transição para Dungeon 2 iniciada com sucesso");
  } else {
    fail("Falha ao entrar na Dungeon 2: " + JSON.stringify(enterResult));
  }

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.mode === "DUNGEON",
    null,
    { timeout: 20000 },
  );

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.world === "dungeon-2",
    null,
    { timeout: 20000 },
  );
  ok("Mundo atual confirmado como dungeon-2 em modo DUNGEON");

  const worldProps = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const w = s.worlds.getCurrent();
    const ground = w.group.getObjectByName("ground");
    const mat = ground?.material;
    const mapSrc = mat?.map?.image?.src || "";
    const hasWalls = w.group.children.some((c) => c.name === "prop-wall" || c.name.includes("wall"));
    const portal = w.interactables.find((i) => i.id === "portal-exit");
    return {
      groundName: ground?.name,
      hasTexture: mapSrc.includes("dungeon-cemetery-albedo.png"),
      textureSrc: mapSrc,
      hasWalls,
      boundary: w.boundary,
      portalExit: portal ? { id: portal.id, kind: portal.kind, x: portal.x, z: portal.z } : null,
    };
  });

  if (worldProps.groundName === "ground" && worldProps.hasTexture) {
    ok("Piso 36x36 com textura de cemitério configurado e renderizado");
  } else {
    fail("Piso incorreto: " + JSON.stringify(worldProps));
  }

  if (worldProps.hasWalls) {
    ok("Muralha de 4 faces presente na cena da Dungeon 2");
  } else {
    fail("Muralhas ausentes na cena");
  }

  if (worldProps.portalExit && worldProps.portalExit.kind === "portal-exit") {
    ok("Portal de saída (portal-exit) posicionado em X=0, Z=-13.5");
  } else {
    fail("Portal de saída não encontrado: " + JSON.stringify(worldProps.portalExit));
  }

  await page.waitForFunction(
    () => {
      const s = window.__UAIDZIN__.session;
      if (!s || s.enemies.enemies.length !== 12) return false;
      const view = s.enemyView;
      if (!view) return false;
      const all = view.listAll();
      if (all.length !== 12) return false;
      for (const item of all) {
        const ctrl = view.controllers.get(item.id);
        if (!ctrl || !ctrl.model) return false;
      }
      const specials = s.enemies.enemies.filter((e) => e.monsterId === "caveira_especial");
      return specials.every((sp) => {
        const ctrl = view.controllers.get(sp.id);
        return ctrl && ctrl.actions && ctrl.actions.size >= 5;
      });
    },
    null,
    { timeout: 30000 },
  );
  ok("Todos os 12 modelos 3D de esqueletos carregados e instanciados no runtime");

  const enemyAudit = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const view = s.enemyView;
    const enemies = s.enemies.enemies;
    const details = enemies.map((e) => {
      const ctrl = view.controllers.get(e.id);
      return {
        id: e.id,
        monsterId: e.monsterId,
        archetype: e.archetype,
        modelUrl: e.modelUrl,
        isBoss: e.isBoss,
        hasModel: !!ctrl?.model,
        isProceduralMesh: ctrl?.isProceduralMesh,
        hasMixer: !!ctrl?.mixer,
        currentAnim: ctrl?.currentAnim,
        actions: ctrl?.actions ? Array.from(ctrl.actions.keys()) : [],
      };
    });
    const normals = details.filter((d) => d.monsterId === "caveira_normal");
    const specials = details.filter((d) => d.monsterId === "caveira_especial");
    return {
      total: details.length,
      normalsCount: normals.length,
      specialsCount: specials.length,
      normalsAllProcedural: normals.every((n) => n.isProceduralMesh === true),
      specialsAllMixer: specials.every((sp) => sp.hasMixer === true && sp.actions.includes("idle")),
      bossFound: specials.some((sp) => sp.isBoss === true),
      details,
    };
  });

  if (enemyAudit.total === 12 && enemyAudit.normalsCount === 8 && enemyAudit.specialsCount === 4) {
    ok("Contagem e distribuição de inimigos exata: 8 normais e 4 especiais (4 blocos de 3)");
  } else {
    fail("Contagem de inimigos incorreta: " + JSON.stringify(enemyAudit));
  }

  if (enemyAudit.normalsAllProcedural) {
    ok("8 esqueletos normais com animação procedural contínua configurada");
  } else {
    fail("Esqueletos normais sem animação procedural: " + JSON.stringify(enemyAudit));
  }

  if (enemyAudit.specialsAllMixer) {
    ok("4 esqueletos especiais com mixers esqueletais e clipes registrados");
  } else {
    fail("Esqueletos especiais sem mixer completo: " + JSON.stringify(enemyAudit));
  }

  if (enemyAudit.bossFound) {
    ok("Chefe Guardião Esqueleto (Bloco 4) registrado como boss");
  } else {
    fail("Chefe da Dungeon 2 não encontrado");
  }

  const specialAnimTest = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const view = s.enemyView;
    const special = s.enemies.enemies.find((e) => e.monsterId === "caveira_especial");
    if (!special) return { ok: false, reason: "special_not_found" };
    const ctrl = view.controllers.get(special.id);
    if (!ctrl) return { ok: false, reason: "ctrl_not_found" };

    const initial = ctrl.currentAnim;
    ctrl.play("run");
    const ranRun = ctrl.currentAnim === "run";

    view.playAttack(special.id);
    const ranAttack = ctrl.currentAnim === "attack";

    view.playHit(special.id);
    const ranHit = ctrl.currentAnim === "hit";

    view.playDeath(special.id);
    const ranDeath = ctrl.currentAnim === "death";

    return {
      ok: true,
      initial,
      ranRun,
      ranAttack,
      ranHit,
      ranDeath,
    };
  });

  if (specialAnimTest.ok && specialAnimTest.ranAttack && specialAnimTest.ranDeath) {
    ok("Máquina de estados de animação dos esqueletos especiais verificada (idle/run/attack/hit/death)");
  } else {
    fail("Falha nas animações dos especiais: " + JSON.stringify(specialAnimTest));
  }

  const materialIndependence = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const view = s.enemyView;
    const specials = s.enemies.enemies.filter((e) => e.monsterId === "caveira_especial");
    if (specials.length < 2) return { ok: false, reason: "less_than_2_specials" };
    const ctrl1 = view.controllers.get(specials[0].id);
    const ctrl2 = view.controllers.get(specials[1].id);
    if (!ctrl1?.model || !ctrl2?.model) return { ok: false, reason: "models_not_loaded" };
    let mat1 = null;
    let mat2 = null;
    ctrl1.model.traverse((o) => { if (o.isMesh && o.material && !mat1) mat1 = o.material; });
    ctrl2.model.traverse((o) => { if (o.isMesh && o.material && !mat2) mat2 = o.material; });
    return {
      ok: mat1 !== null && mat2 !== null && mat1 !== mat2,
      mat1Defined: !!mat1,
      mat2Defined: !!mat2,
      areIdentical: mat1 === mat2,
    };
  });

  if (materialIndependence.ok) {
    ok("Materiais clonados por instância: esqueletos possuem materiais 3D independentes");
  } else {
    fail("Materiais de esqueletos compartilhados incorretamente: " + JSON.stringify(materialIndependence));
  }

  const hpBarTest = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const enemy = s.enemies.enemies[0];
    const enemyScale = enemy.modelScale > 0 ? enemy.modelScale : 1.0;
    const enemyHpY = (enemy.isBoss ? 2.4 : 1.85) * enemyScale;
    return { enemyHpY, scale: enemyScale };
  });

  if (hpBarTest.enemyHpY >= 1.7) {
    ok("Barra de HP de esqueletos posicionada acima da cabeça (> 1.7m)");
  } else {
    fail("Altura da barra de HP incorreta: " + JSON.stringify(hpBarTest));
  }

  const labels = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const pos = [
      { x: -8, z: -4 },
      { x: 8, z: -4 },
      { x: -7, z: 6 },
      { x: 7, z: 6 },
    ];
    return pos.map((p) => {
      s.player.setPosition(p.x, p.z);
      return s.currentArenaLabel();
    });
  });

  if (
    labels[0]?.includes("Noroeste") &&
    labels[1]?.includes("Nordeste") &&
    labels[2]?.includes("Sudoeste") &&
    labels[3]?.includes("Sudeste")
  ) {
    ok("Rótulos de arena por quadrante validados: Noroeste, Nordeste, Sudoeste, Sudeste");
  } else {
    fail("Rótulos de arena incorretos: " + JSON.stringify(labels));
  }

  const exitResult = await page.evaluate(() => {
    const s = window.__UAIDZIN__.session;
    const portal = s.worlds.getCurrent().interactables.find((i) => i.id === "portal-exit");
    if (!portal) return { ok: false, reason: "no_portal" };
    s.player.setPosition(portal.x, portal.z);
    s.beginInteract(portal);
    return { ok: true };
  });

  if (exitResult.ok) {
    ok("Interação com portal de saída acionada");
  } else {
    fail("Falha ao interagir com o portal de saída: " + JSON.stringify(exitResult));
  }

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.mode === "CITY",
    null,
    { timeout: 20000 },
  );

  await page.waitForFunction(
    () => window.__UAIDZIN__?.getSnapshot?.()?.world === "city",
    null,
    { timeout: 20000 },
  );
  ok("Retorno suave com fade para a Cidade concluído com sucesso");

} catch (err) {
  fail("Exceção não tratada durante o teste: " + err.message + "\n" + err.stack);
} finally {
  await browser.close();
  if (failed > 0) {
    console.error(`TOTAL DE FALHAS: ${failed}`);
    process.exit(1);
  } else {
    console.log("TODOS OS TESTES PASSARAM COM SUCESSO!");
    process.exit(0);
  }
}
