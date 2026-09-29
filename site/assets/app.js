(function () {
  "use strict";

  const U = window.U;
  const SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function svg(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, String(attrs[k]));
    }
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function img(src, alt) {
    const i = new Image();
    i.src = src;
    i.alt = alt || "";
    i.loading = "lazy";
    return i;
  }

  const SIGILS = {
    "d1-a1": "M12 21c0-5 2-8 6-10M12 21c0-5-2-8-6-10M9 14c2 1 4 1 6 0M12 3v5",
    "d1-a2": "M4 14l4-6 4 5 3-4 5 6M4 19h16M7 11l-2-2M17 11l2-2",
    d2: "M12 3a3 3 0 0 0-3 3c0 2 1 3 1 4H9v3l-2 3v5h10v-5l-2-3v-3h-1c0-1 1-2 1-4a3 3 0 0 0-3-3ZM9 19h6",
    "d1-a3": "M12 2c1 3-2 4-2 7 0 2 1 3 1 3M12 2c-1 3 2 4 2 7 0 2-1 3-1 3M6 21l1-6h10l1 6M9 12h6",
    chefe: "M5 21V8l7-5 7 5v13M9 21v-6h6v6M4 11h16M12 3v3",
  };

  function mobSigil(key) {
    const s = svg("svg", { viewBox: "0 0 24 24" });
    s.appendChild(
      svg("path", {
        d: SIGILS[key] || SIGILS.d2,
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 1.4,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      })
    );
    return s;
  }

  function renderHero() {
    const cast = document.getElementById("hero-cast");
    clear(cast);
    U.classes.forEach(function (c) {
      cast.appendChild(img("assets/img/class/char-" + c.arte + ".png", ""));
    });

    const cyc = document.getElementById("hero-cycle");
    if (cyc) cyc.textContent = U.game.ciclo;

    const st = document.getElementById("hero-stats");
    clear(st);
    U.destaques.forEach(function (d) {
      const cell = el("div");
      cell.appendChild(el("b", null, d.k));
      cell.appendChild(el("span", null, d.s));
      st.appendChild(cell);
    });
  }

  function renderClasses() {
    const host = document.getElementById("class-grid");
    clear(host);
    U.classes.forEach(function (c) {
      const card = el("div", "class-card");
      const port = el("div", "class-portrait");
      port.appendChild(img("assets/img/class/char-" + c.arte + ".png", c.nome));
      card.appendChild(port);
      card.appendChild(el("div", "class-id", c.id));
      card.appendChild(el("div", "class-nome", c.nome));
      card.appendChild(el("div", "class-pt", c.pt));
      card.appendChild(el("div", "class-desc", c.desc));
      const facts = el("div", "class-facts");
      facts.appendChild(el("span", null, c.prim));
      facts.appendChild(el("span", null, c.arma));
      card.appendChild(facts);
      host.appendChild(card);
    });
  }

  function renderDungeons() {
    const host = document.getElementById("dungeon-grid");
    clear(host);
    U.dungeons.forEach(function (d) {
      const card = el("div", "dg-card" + (d.entrada ? " locked" : ""));
      card.appendChild(el("div", "dg-nome", d.nome));
      card.appendChild(el("div", "dg-id", d.id));

      const rowN = el("div", "dg-row");
      rowN.appendChild(el("span", null, "Nível"));
      rowN.appendChild(el("span", null, d.min + " a " + d.max));
      card.appendChild(rowN);

      const rowD = el("div", "dg-row");
      rowD.appendChild(el("span", null, "Duração"));
      rowD.appendChild(el("span", null, "600 s"));
      card.appendChild(rowD);

      const rowA = el("div", "dg-row");
      rowA.appendChild(el("span", null, "Arenas"));
      rowA.appendChild(el("span", null, d.arenas + " · " + d.spawns + " inimigos"));
      card.appendChild(rowA);

      const rowE = el("div", "dg-row");
      rowE.appendChild(el("span", null, "Entrada"));
      const ev = el("span", d.entrada ? null : "dg-free", d.entrada || "Livre");
      rowE.appendChild(ev);
      card.appendChild(rowE);

      card.appendChild(el("div", "dg-nota", d.nota));
      host.appendChild(card);
    });

    const track = document.getElementById("dg-track");
    clear(track);
    const maxLv = 400;
    U.dungeons.forEach(function (d, i) {
      const left = (d.min / maxLv) * 100;
      const width = ((d.max - d.min) / maxLv) * 100;
      const bar = el("div", "dg-bar" + (d.entrada ? " sealed" : ""));
      bar.style.left = left + "%";
      bar.style.width = Math.max(width, 4) + "%";
      bar.style.top = (i % 2 === 0 ? 0 : 22) + "px";
      bar.textContent = d.min;
      track.appendChild(bar);

      const tick = el("div", "dg-tick");
      tick.style.left = left + "%";
      tick.style.top = "0px";
      const lab = el("span", null, String(d.min));
      tick.appendChild(lab);
      track.appendChild(tick);
    });
  }

  function renderBestiario() {
    const host = document.getElementById("mob-grid");
    clear(host);
    U.monstros.forEach(function (m) {
      const isBoss = m.id === "boss_mortal";
      const isElite = m.pv >= 150;
      const card = el("div", "mob-card" + (isBoss ? " boss" : isElite ? " elite" : ""));

      const sig = el("div", "mob-sigil");
      sig.appendChild(mobSigil(m.sigil));
      card.appendChild(sig);

      const body = el("div");
      body.appendChild(el("h3", "mob-nome", m.nome));
      body.appendChild(el("div", "mob-id", m.id));

      const max = 760;
      const bars = [
        ["hp", "PV", m.pv / max],
        ["atk", "ATQ", m.atk / 120],
      ];
      bars.forEach(function (b) {
        const row = el("div", "mob-bar " + b[0]);
        row.appendChild(el("em", null, b[1]));
        const track = el("i");
        const fill = el("b");
        fill.style.width = Math.max(3, Math.round(b[2] * 100)) + "%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("span", null, String(b[0] === "hp" ? m.pv : m.atk)));
        body.appendChild(row);
      });

      const xp = el("div", "mob-bar");
      xp.appendChild(el("em", null, "XP"));
      const xt = el("i");
      const xf = el("b");
      xf.style.width = Math.max(3, Math.round((m.xp / 50) * 100)) + "%";
      xt.appendChild(xf);
      xp.appendChild(xt);
      xp.appendChild(el("span", null, String(m.xp)));
      body.appendChild(xp);

      card.appendChild(body);
      host.appendChild(card);
    });
  }

  function renderEquip() {
    const doll = document.getElementById("paperdoll");
    clear(doll);
    doll.appendChild(el("p", "pd-title", "Sete slots"));
    U.equipSlots.forEach(function (s) {
      const row = el("div", "pd-slot");
      const ico = el("div", "pd-ico");
      ico.appendChild(img("assets/img/eq/" + s.icone + ".svg", ""));
      row.appendChild(ico);
      const txt = el("div");
      txt.appendChild(el("em", null, s.slot));
      txt.appendChild(el("strong", null, s.exemplo));
      row.appendChild(txt);
      doll.appendChild(row);
    });

    const items = document.getElementById("item-grid");
    clear(items);
    U.itens.forEach(function (it) {
      const card = el("div", "item-card");
      card.appendChild(img("assets/img/items/" + it.icone + ".svg", it.nome));
      card.appendChild(el("b", null, it.nome));
      card.appendChild(el("span", null, it.nota));
      items.appendChild(card);
    });
  }

  function renderSkills() {
    const host = document.getElementById("tree-grid");
    clear(host);
    U.arvores.forEach(function (t) {
      const card = el("div", "tree-card");
      card.appendChild(el("div", "tree-nome", t.nome));
      const slots = el("div", "tree-slots");
      for (let i = 0; i < 4; i++) {
        const s = el("div", "tree-slot" + (i > 0 ? "" : ""));
        if (t.icones[i]) s.appendChild(img("assets/img/skills/" + t.icones[i] + ".svg", ""));
        slots.appendChild(s);
      }
      card.appendChild(slots);
      host.appendChild(card);
    });
  }

  function renderLoja() {
    const host = document.getElementById("npc-grid");
    clear(host);
    U.loja.forEach(function (n) {
      const card = el("div", "npc-card");
      card.appendChild(el("div", "npc-nome", n.nome));
      const ul = el("ul");
      n.linhas.forEach(function (l) {
        ul.appendChild(el("li", null, l));
      });
      card.appendChild(ul);
      host.appendChild(card);
    });
  }

  function renderRegras() {
    const host = document.getElementById("rule-grid");
    clear(host);
    U.regras.forEach(function (r) {
      const card = el("div", "rule-card");
      card.appendChild(el("h3", null, r[0]));
      card.appendChild(el("p", null, r[1]));
      host.appendChild(card);
    });
  }

  function renderSteps() {
    const host = document.getElementById("steps");
    clear(host);
    U.passos.forEach(function (p, i) {
      const row = el("div", "step");
      row.appendChild(el("div", "step-n", String(i + 1).padStart(2, "0")));
      row.appendChild(el("div", "step-t", p[0]));
      row.appendChild(el("div", "step-d", p[1]));
      host.appendChild(row);
    });
  }

  function renderScrollSpy() {
    const links = Array.prototype.slice.call(document.querySelectorAll(".navlinks a"));
    const sections = links
      .map(function (a) {
        const id = a.getAttribute("href");
        return id && id.charAt(0) === "#" ? document.querySelector(id) : null;
      })
      .filter(Boolean);

    function onScroll() {
      const y = window.scrollY + 150;
      let active = null;
      sections.forEach(function (s) {
        const top = s.getBoundingClientRect().top + window.scrollY;
        if (top <= y) active = s;
      });
      links.forEach(function (a) {
        a.classList.toggle("on", !!(active && a.getAttribute("href") === "#" + active.id));
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  renderHero();
  renderClasses();
  renderDungeons();
  renderBestiario();
  renderEquip();
  renderSkills();
  renderLoja();
  renderRegras();
  renderSteps();
  renderScrollSpy();
})();
