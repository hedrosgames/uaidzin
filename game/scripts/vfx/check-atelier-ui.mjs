import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const binary = path.join(process.env.USERPROFILE, ".factory/bin/agent-browser.exe");
const baseUrl = process.env.VFX_LAB_URL || "http://127.0.0.1:5173/vfx/vfx_lab.html";
const url = `${baseUrl}?qa=1`;
if (!process.env.AGENT_BROWSER_CDP) throw new Error("AGENT_BROWSER_CDP é necessário.");
async function command(...args) {
  let stdout;
  try {
    ({ stdout } = await exec(binary, ["--cdp", process.env.AGENT_BROWSER_CDP, "--json", ...args], { timeout:120000, maxBuffer:24 * 1024 * 1024 }));
  } catch (error) {
    let message = "Falha na conexão com o painel CDP.";
    try { message = JSON.parse(error.stdout).error ?? message; } catch {}
    throw new Error(message);
  }
  const payload = JSON.parse(stdout);
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}
async function evaluate(code) {
  return (await command("eval", "-b", Buffer.from(code).toString("base64"))).result;
}

await fs.mkdir(path.join(game, "vfx/evidence"), { recursive:true });
try {
  await command("open", url);
  await command("wait", "--fn", "Boolean(window.__VFX_LAB__)");
  const functional = await evaluate(`(async()=>{
    const $=id=>document.getElementById(id), checks=[];
    const ok=(condition,name)=>{if(!condition) throw Error(name); checks.push(name);};
    const set=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('input'));};
    const count=()=>document.querySelectorAll('.skill-card').length;
    ok(count()===96,'96 skills na lista');
    document.querySelector('[data-class="BM"]').click();
    ok(count()===24,'24 skills por classe');
    set('tree','controle');
    ok(count()===8,'8 skills por árvore');
    document.querySelector('[data-class=""]').click();set('tree','');
    set('element','water');ok(count()>0 && count()<96,'filtro elemental');
    set('element','');set('shape','self');ok(count()>0 && count()<96,'filtro por forma');
    set('shape','');set('search','lamina');
    ok(count()===1,'busca ignora acentos');set('search','');
    window.__VFX_LAB__.select('fm_mag_nevasca','V2');
    ok($('concept-title').textContent==='Flores de granizo','conceito por versão');
    $('mode-compare').click();
    ok(document.querySelectorAll('.render-view').length===3,'comparador triplo');
    window.__VFX_LAB__.seek(0.75);
    const times=window.__VFX_LAB__.memory().map(x=>x.time);
    ok(times.every(t=>t===0.75),'comparador sincronizado');
    $('mode-stage').click();$('mode-gallery').click();
    ok(document.querySelectorAll('.gallery-card').length===96,'galeria completa');
    const card=document.querySelector('.gallery-card');
    card.dispatchEvent(new PointerEvent('pointerenter'));
    for(let attempt=0;attempt<40&&!card.querySelector('img')?.src;attempt++) await new Promise(r=>setTimeout(r,100));
    ok(Boolean(card.querySelector('img')?.src.startsWith('data:image/jpeg')),'prévia animada no hover');
    card.dispatchEvent(new PointerEvent('pointerleave'));$('mode-stage').click();
    window.__VFX_LAB__.select('fm_mag_nevasca','V3');
    $('notes').value='QA temporária do lab';$('approve').click();
    ok(JSON.parse(localStorage.getItem('uaidzin-vfx-atelier-qa-v1'))['fm_mag_nevasca:V3'].status==='approved','aprovação persistida');
    set('review-filter','approved');ok(count()>=1,'filtro por revisão');set('review-filter','');
    $('reject').click();ok($('review-state').textContent.includes('reprovada'),'reprovação');
    $('approve').click();
    const old=HTMLAnchorElement.prototype.click;
    let blobUrl;
    HTMLAnchorElement.prototype.click=function(){blobUrl=this.href;};
    $('export').click();HTMLAnchorElement.prototype.click=old;
    const data=await (await fetch(blobUrl)).json();
    ok(data.schemaVersion===1 && data.choices['fm_mag_nevasca:V3'].status==='approved','exportação JSON');
    $('speed').value='2';$('speed').dispatchEvent(new Event('change'));
    window.__VFX_LAB__.select('tk_fis_force_wave','V1');$('sequence').click();
    await new Promise(r=>setTimeout(r,1800));
    const next=window.__VFX_LAB__.state().skillId;
    ok(next!=='tk_fis_force_wave' && next.startsWith('tk_fis_'),'sequência avança na mesma árvore');
    $('sequence').click();$('speed').value='1';$('speed').dispatchEvent(new Event('change'));
    $('scrub').value='0.6';$('scrub').dispatchEvent(new Event('input'));
    ok(window.__VFX_LAB__.state().time===0.6,'scrub determinístico');
    return checks;
  })()`);
  await command("open", url);
  await command("wait", "--fn", "Boolean(window.__VFX_LAB__)");
  const restored = await evaluate(`window.__VFX_LAB__.select('fm_mag_nevasca','V3'); document.getElementById('review-state').textContent.includes('aprovada')`);
  assert.equal(restored, true);
  const result = { functional, restored, method:"Interação DOM pelo bridge CDP do navegador do desktop" };
  const memory = await evaluate(`(async()=>{
    const values=[];
    for(let i=0;i<8;i++){
      window.__VFX_LAB__.select('tk_fis_fire_burst','V2');window.__VFX_LAB__.seek(.85);
      values.push(window.__VFX_LAB__.memory()[0]);
    }
    return values;
  })()`);
  assert(memory.every((m) => m.geometries === memory[0].geometries && m.textures === memory[0].textures));
  result.repeatedSelectionMemoryStable = true;
  await evaluate(`window.__VFX_LAB__.select('fm_mag_nevasca','V1');window.__VFX_LAB__.compare();window.__VFX_LAB__.seek(.85);`);
  const captures = await evaluate("window.__VFX_LAB__.capture()");
  for (let i = 0; i < captures.length; i++) await fs.writeFile(path.join(game, `vfx/evidence/compare-V${i + 1}.png`), Buffer.from(captures[i].split(",")[1], "base64"));
  result.compareCaptures = captures.length;
  const board = await evaluate(`(()=>{
    const board=document.createElement('canvas');board.width=1600;board.height=900;
    const c=board.getContext('2d');c.fillStyle='#100c08';c.fillRect(0,0,1600,900);
    c.fillStyle='#d4a017';c.font='18px Georgia';c.fillText('UAIDZIN / ATELIER VFX',48,48);
    c.fillStyle='#f0e6d0';c.font='38px Georgia';c.fillText('Nevasca · três propostas autorais',48,103);
    const titles=['Círculo da geada','Flores de granizo','Catedral de inverno'];
    document.querySelectorAll('#views canvas').forEach((canvas,i)=>{
      const x=48+i*510;c.strokeStyle='#5a4a38';c.strokeRect(x,142,486,704);
      c.fillStyle='#d4a017';c.font='15px Segoe UI';c.fillText('V'+(i+1),x+20,178);
      c.fillStyle='#f0e6d0';c.font='23px Georgia';c.fillText(titles[i],x+20,215);
      const h=600,w=canvas.width/canvas.height*h;c.drawImage(canvas,x+(486-w)/2,236,w,h);
    });
    return board.toDataURL('image/png');
  })()`);
  await fs.writeFile(path.join(game, "vfx/evidence/comparacao-nevasca.png"), Buffer.from(board.split(",")[1], "base64"));
  const performance = await evaluate(`(async()=>{
    document.getElementById('mode-stage').click();
    window.__VFX_LAB__.select('tk_fis_fire_burst','V2');
    document.getElementById('replay').click();
    if(document.getElementById('loop').getAttribute('aria-pressed')!=='true') document.getElementById('loop').click();
    await new Promise(r=>setTimeout(r,1000));
    const samples=[]; let previous=performance.now(), start=previous;
    await new Promise(resolve=>{
      function sample(now){ samples.push(now-previous);previous=now; if(now-start<3500)requestAnimationFrame(sample);else resolve(); }
      requestAnimationFrame(sample);
    });
    samples.sort((a,b)=>a-b);
    return {meanFps:1000/(samples.reduce((a,b)=>a+b,0)/samples.length),p95FrameMs:samples[Math.floor(samples.length*.95)],frames:samples.length};
  })()`);
  result.performance = performance;
  result.target50Fps = performance.meanFps >= 50;
  await fs.writeFile(path.join(game, "vfx/evidence/ui-results.json"), JSON.stringify(result, null, 2));
  console.info(JSON.stringify(result));
} finally {
  await evaluate("localStorage.removeItem('uaidzin-vfx-atelier-qa-v1')");
  await command("open", baseUrl);
}
