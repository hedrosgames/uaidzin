(function () {
  const body = document.body;
  const toc = document.getElementById("toc");
  const search = document.getElementById("search");
  const empty = document.getElementById("toc-empty");
  const menuBtn = document.getElementById("menu-btn");
  const overlay = document.getElementById("overlay");
  const chapters = Array.from(document.querySelectorAll(".chapter"));
  const tocChapters = Array.from(document.querySelectorAll(".toc-chapter"));
  const sectionLinks = Array.from(document.querySelectorAll(".toc-sections a"));

  function setNav(open) {
    body.classList.toggle("nav-open", open);
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      setNav(!body.classList.contains("nav-open"));
    });
  }
  if (overlay) {
    overlay.addEventListener("click", function () {
      setNav(false);
    });
  }

  function closeMobileNav() {
    if (window.matchMedia("(max-width: 900px)").matches) setNav(false);
  }

  tocChapters.forEach(function (item) {
    const btn = item.querySelector(".toc-chapter-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      const id = item.getAttribute("data-target");
      const target = id && document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#" + id);
      }
      item.classList.add("is-open");
      closeMobileNav();
    });
  });

  sectionLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      closeMobileNav();
    });
  });

  function norm(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function filterToc(q) {
    const query = norm(q.trim());
    let visible = 0;
    tocChapters.forEach(function (ch) {
      const label = norm(ch.getAttribute("data-search") || ch.textContent);
      const links = Array.from(ch.querySelectorAll(".toc-sections a"));
      let childHit = false;
      links.forEach(function (a) {
        const hit = !query || norm(a.getAttribute("data-search") || a.textContent).includes(query);
        a.style.display = hit ? "" : "none";
        if (hit) childHit = true;
      });
      const show = !query || label.includes(query) || childHit;
      ch.style.display = show ? "" : "none";
      if (show) {
        visible += 1;
        if (query) ch.classList.add("is-open");
      }
    });
    if (empty) empty.style.display = visible ? "none" : "block";
  }

  if (search) {
    search.addEventListener("input", function () {
      filterToc(search.value);
    });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        search.value = "";
        filterToc("");
        search.blur();
      }
    });
  }

  const linkById = new Map();
  sectionLinks.forEach(function (a) {
    const id = (a.getAttribute("href") || "").replace(/^#/, "");
    if (id) linkById.set(id, a);
  });

  function setActive(id) {
    sectionLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
    });
    tocChapters.forEach(function (ch) {
      const target = ch.getAttribute("data-target");
      const isChapter = target === id;
      const hasActive = !!ch.querySelector(".toc-sections a.is-active");
      ch.classList.toggle("is-active", isChapter || hasActive);
      if (isChapter || hasActive) ch.classList.add("is-open");
    });
  }

  const observed = [];
  chapters.forEach(function (ch) {
    observed.push(ch);
    ch.querySelectorAll(".section").forEach(function (s) {
      observed.push(s);
    });
  });

  if ("IntersectionObserver" in window && observed.length) {
    const ratios = new Map();
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        let best = null;
        let bestRatio = 0;
        observed.forEach(function (el) {
          const r = ratios.get(el) || 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = el;
          }
        });
        if (!best) {
          // fallback: last chapter above the fold
          const y = window.scrollY + 80;
          for (let i = chapters.length - 1; i >= 0; i--) {
            if (chapters[i].offsetTop <= y) {
              best = chapters[i];
              break;
            }
          }
        }
        if (best) setActive(best.id);
      },
      {
        root: null,
        rootMargin: "-10% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );
    observed.forEach(function (el) {
      io.observe(el);
    });
  }

  function applyHash() {
    const id = (location.hash || "").replace(/^#/, "");
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  }

  window.addEventListener("hashchange", applyHash);
  if (location.hash) {
    requestAnimationFrame(applyHash);
  } else if (chapters[0]) {
    setActive(chapters[0].id);
  }

  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "/" && search) {
      e.preventDefault();
      search.focus();
      search.select();
    }
  });
})();
