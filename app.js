(() => {
  if (window.__SV_APP_INITED) return;
  window.__SV_APP_INITED = true;

  // ---------- Helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function updateDockOffsets(){
  const cd = document.querySelector("#countdownDock");
  const pd = document.querySelector("#playerDock");

  // ✅ topDock = parte de abajo REAL del contador + aire
  const top = cd ? (cd.getBoundingClientRect().bottom + 10) : 34;

  // ✅ bottomDock = altura real del player + aire (incluye safe-area)
  const bottom = pd ? ((window.innerHeight - pd.getBoundingClientRect().top) + 10) : 34;

  document.documentElement.style.setProperty("--topDock", `${Math.ceil(top)}px`);
  document.documentElement.style.setProperty("--bottomDock", `${Math.ceil(bottom)}px`);
}


  const scheduleOffsets = (() => {
    let t = null;
    return () => {
      if (t) cancelAnimationFrame(t);
      t = requestAnimationFrame(() => updateDockOffsets());
    };
  })();

  window.addEventListener("resize", () => setTimeout(scheduleOffsets, 60));
  window.addEventListener("load", () => setTimeout(scheduleOffsets, 120));

  // ---------- Hearts (se ven en celular) ----------
  function initHeartsOnce() {
    if (window.__SV_HEARTS_INITED) return;
    window.__SV_HEARTS_INITED = true;

    let layer = $("#heartsLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "heartsLayer";
      document.body.appendChild(layer);
    }

    const heartChars = ["💗", "💖", "💘", "💞", "💕"];

    function spawn() {
      const h = document.createElement("div");
      h.className = "heart";
      h.textContent = heartChars[Math.floor(Math.random() * heartChars.length)];
      const size = 16 + Math.random() * 18;
      h.style.fontSize = `${size}px`;
      h.style.left = `${Math.random() * 100}vw`;
      h.style.bottom = `-30px`;
      h.style.animationDuration = `${8 + Math.random() * 6}s`;
      h.style.opacity = `${0.12 + Math.random() * 0.16}`;
      layer.appendChild(h);
      setTimeout(() => h.remove(), 16000);
    }

    setInterval(spawn, 900);
    for (let i = 0; i < 6; i++) setTimeout(spawn, i * 250);
  }

  // ---------- Lightbox (X siempre funciona) ----------
  function initLightboxOnce() {
    if (window.__SV_LB_INITED) return;
    window.__SV_LB_INITED = true;

    let lb = $("#lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "lightbox";
      lb.innerHTML = `
        <button class="lb-close" type="button" aria-label="Cerrar">×</button>
        <div class="lb-stage">
          <img class="lb-img" alt="Foto" />
        </div>
      `;
      document.body.appendChild(lb);
    }

    const closeBtn = $(".lb-close", lb);
    const imgEl = $(".lb-img", lb);

    function open(src) {
      imgEl.src = src;
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lb.classList.remove("open");
      imgEl.src = "";
      document.body.style.overflow = "";
    }

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });

    lb.addEventListener("click", (e) => {
      // cerrar solo si clickean el fondo oscuro
      if (e.target === lb) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("open")) close();
    });

    // Delegación: sirve aunque cambies de página con SPA
    document.addEventListener("click", (e) => {
      const img = e.target.closest(".photo img");
      if (!img) return;
      open(img.src);
    });
  }

  // ---------- Player (persistente + playlist + seek) ----------
  const STORAGE = "sv_player_state_v4";

  // Ponemos varias rutas posibles para que no falle por carpeta/nombre.
  const TRACKS = [
    {
      id: "uwaie",
      label: "UWAIE",
      sources: [
        "UWAIE - Kapo (Video Oficial).mp3",
        "uwaie.mp3",
        "audio/UWAIE - Kapo (Video Oficial).mp3",
        "audio/uwaie.mp3",
      ],
    },
    {
      id: "mi_refe",
      label: "Mi refe",
      sources: ["Mi-refe.mp3", "audio/Mi-refe.mp3"],
    },
    {
      id: "mas_que_tu",
      label: "Más que tú",
      sources: ["mas-que-tu.mp3", "audio/mas-que-tu.mp3"],
    },
  ];

  const CITAS_RANDOM = [
    "Cena romántica 💗 (con postre sí o sí) 🍰",
    "Helado + caminata de noche 🌙",
    "Peli juntos (cine o en casita) 🎬",
    "Fotos en un lugar bonito 📸",
    "Playa y quedarnos hasta tarde ✨",
    "Chocolate caliente + postres 🍫",
    "Noche de juegos (cartas / retos) 🎮",
  ];

  const CUPONES_RANDOM = [
    "Cupón: Muchos besos 💗",
    "Cupón: Abrazo largo 🫶",
    "Cupón: Cena bonita 🍽️",
    "Cupón: Cita sorpresa 🌹",
    "Cupón: Noche de pelis 🎬",
    "Cupón: Día de mimos 🧸",
  ];

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || "{}");
    } catch {
      return {};
    }
  }
  function saveState(patch) {
    const cur = loadState();
    const next = { ...cur, ...patch, ts: Date.now() };
    localStorage.setItem(STORAGE, JSON.stringify(next));
    return next;
  }

  function fmtTime(t) {
    if (!isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function firstWorkingSource(audio, sources) {
    // Probamos por eventos de audio con timeout corto (no bloquea).
    let i = 0;

    return new Promise((resolve) => {
      const tryNext = () => {
        const src = sources[i] || sources[0];
        i++;

        const onCan = () => {
          cleanup();
          resolve(src);
        };
        const onErr = () => {
          cleanup();
          if (i < sources.length) tryNext();
          else resolve(sources[0]);
        };
        const cleanup = () => {
          audio.removeEventListener("canplay", onCan);
          audio.removeEventListener("error", onErr);
        };

        audio.addEventListener("canplay", onCan, { once: true });
        audio.addEventListener("error", onErr, { once: true });

        audio.src = src;
        audio.load();

        // timeout: si no responde, pasamos al siguiente
        setTimeout(() => {
          cleanup();
          if (i < sources.length) tryNext();
          else resolve(sources[0]);
        }, 800);
      };

      tryNext();
    });
  }

  function initPlayerOnce() {
    if (window.__SV_PLAYER_INITED) return;
    window.__SV_PLAYER_INITED = true;

    let dock = $("#playerDock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "playerDock";
      document.body.appendChild(dock);
    }

    dock.innerHTML = `
      <div class="player-bar">
        <button class="pbtn" type="button" data-act="toggle" aria-label="Reproducir o pausar">▶</button>

        <div class="ptxt">
          <div class="ptitle" id="ptitle">Toca para reproducir</div>
          <div class="psub" id="psub">Música • 1/${TRACKS.length}</div>
        </div>

        <button class="pbtn secondary" type="button" data-act="prev" aria-label="Anterior">⟨</button>
        <button class="pbtn secondary" type="button" data-act="next" aria-label="Siguiente">⟩</button>
        <button class="pbtn secondary" type="button" data-act="expand" aria-label="Expandir">▾</button>
      </div>

      <div class="player-panel">
        <div class="seek">
          <input id="seek" type="range" min="0" max="1000" value="0" />
          <div class="timeRow">
            <span id="tcur">0:00</span>
            <span id="tdur">0:00</span>
          </div>
        </div>
        <div class="trackRow" id="trackRow"></div>
      </div>
    `;

    scheduleOffsets();

    const btnToggle = dock.querySelector('[data-act="toggle"]');
    const btnPrev = dock.querySelector('[data-act="prev"]');
    const btnNext = dock.querySelector('[data-act="next"]');
    const btnExpand = dock.querySelector('[data-act="expand"]');

    const seek = $("#seek", dock);
    const tcur = $("#tcur", dock);
    const tdur = $("#tdur", dock);
    const psub = $("#psub", dock);
    const trackRow = $("#trackRow", dock);

    // Audio global: si existe, lo reusamos (por si en algún momento re-inician JS)
    const audio = window.__SV_AUDIO || new Audio();
    window.__SV_AUDIO = audio;

    audio.preload = "metadata";
    audio.loop = false;

    trackRow.innerHTML = TRACKS.map((t, i) => `<button class="track" type="button" data-i="${i}">${t.label}</button>`).join("");

    function setActiveChip(i) {
      $$(".track", trackRow).forEach((b) => b.classList.toggle("active", Number(b.dataset.i) === i));
    }

    let st = loadState();
    let index = clamp(Number(st.index ?? 0), 0, TRACKS.length - 1);
    let restoredTime = Number(st.time ?? 0);
    let wantPlaying = Boolean(st.playing);

    function setPlayIcon() {
      btnToggle.textContent = audio.paused ? "▶" : "❚❚";
    }

    function updateSeek() {
      const dur = audio.duration || 0;
      const cur = audio.currentTime || 0;
      tcur.textContent = fmtTime(cur);
      tdur.textContent = fmtTime(dur);
      const val = dur ? Math.floor((cur / dur) * 1000) : 0;
      seek.value = String(val);
    }

    let seeking = false;
    seek.addEventListener("input", () => {
      seeking = true;
      const dur = audio.duration || 0;
      if (!dur) return;
      const target = (Number(seek.value) / 1000) * dur;
      tcur.textContent = fmtTime(target);
    });
    seek.addEventListener("change", () => {
      const dur = audio.duration || 0;
      if (!dur) {
        seeking = false;
        return;
      }
      const target = (Number(seek.value) / 1000) * dur;
      audio.currentTime = clamp(target, 0, dur);
      saveState({ time: audio.currentTime });
      seeking = false;
    });

    async function setTrack(i, keepTime) {
      index = clamp(i, 0, TRACKS.length - 1);
      setActiveChip(index);
      psub.textContent = `Música • ${index + 1}/${TRACKS.length}`;

      const tr = TRACKS[index];
      const src = await firstWorkingSource(audio, tr.sources);
      audio.src = src;

      audio.onloadedmetadata = () => {
        const safe = keepTime ? clamp(restoredTime, 0, audio.duration || restoredTime) : 0;
        audio.currentTime = isFinite(safe) ? safe : 0;
        updateSeek();
        saveState({ index, time: audio.currentTime });
      };

      saveState({ index });
    }

    async function play() {
      try {
        await audio.play();
        setPlayIcon();
        saveState({ playing: true });
      } catch {
        // Autoplay bloqueado: queda listo, el usuario toca play
        setPlayIcon();
        saveState({ playing: false });
      }
    }
    function pause() {
      audio.pause();
      setPlayIcon();
      saveState({ playing: false, time: audio.currentTime || 0 });
    }

    btnToggle.addEventListener("click", async () => {
      if (audio.paused) await play();
      else pause();
    });

    btnPrev.addEventListener("click", async () => {
      restoredTime = 0;
      await setTrack((index - 1 + TRACKS.length) % TRACKS.length, false);
      if (!audio.paused) await play();
      else setPlayIcon();
    });

    btnNext.addEventListener("click", async () => {
      restoredTime = 0;
      await setTrack((index + 1) % TRACKS.length, false);
      if (!audio.paused) await play();
      else setPlayIcon();
    });

    btnExpand.addEventListener("click", () => {
      dock.classList.toggle("expanded");
      btnExpand.textContent = dock.classList.contains("expanded") ? "▴" : "▾";
      setTimeout(scheduleOffsets, 60);
    });

    trackRow.addEventListener("click", async (e) => {
      const b = e.target.closest(".track");
      if (!b) return;
      restoredTime = 0;
      await setTrack(Number(b.dataset.i), false);
      if (!audio.paused) await play();
      else setPlayIcon();
    });

    audio.addEventListener("timeupdate", () => {
      if (!seeking) updateSeek();
      saveState({ time: audio.currentTime || 0, index, playing: !audio.paused });
    });

    audio.addEventListener("ended", async () => {
      restoredTime = 0;
      await setTrack((index + 1) % TRACKS.length, false);
      await play();
    });

    function persistNow() {
      saveState({
        index,
        time: audio.currentTime || 0,
        playing: !audio.paused,
      });
    }
    window.addEventListener("pagehide", persistNow);
    window.addEventListener("beforeunload", persistNow);

    // Init track
    setActiveChip(index);
    setTrack(index, true).then(async () => {
      setPlayIcon();
      updateSeek();
      setTimeout(scheduleOffsets, 80);

      // Si venía sonando y estás en SPA (sin recargar), seguirá.
      // Si recargaste la página, intentamos reanudar (puede bloquearse por autoplay del navegador).
      if (wantPlaying) {
        restoredTime = Number(loadState().time || 0);
        await play();
      }
    });
  }

  // ---------- Checklist (delegación: funciona con SPA) ----------
  function initChecklistDelegationOnce() {
    if (window.__SV_CHECK_DELEG_INITED) return;
    window.__SV_CHECK_DELEG_INITED = true;

    function readStore(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        return {};
      }
    }
    function writeStore(key, obj) {
      localStorage.setItem(key, JSON.stringify(obj));
    }

    // Al cargar o al navegar, marcamos checks según storage
    function hydrate(container) {
      const key = container.getAttribute("data-store");
      if (!key) return;
      const data = readStore(key);
      $$('input[type="checkbox"][data-id]', container).forEach((ch) => {
        const id = ch.getAttribute("data-id");
        ch.checked = Boolean(data[id]);
      });
    }

    // Exponemos para SPA re-hidrate
    window.__SV_HYDRATE_CHECKLISTS = () => {
      $$("[data-store]").forEach(hydrate);
    };

    document.addEventListener("change", (e) => {
      const ch = e.target;
      if (!(ch instanceof HTMLInputElement)) return;
      if (ch.type !== "checkbox") return;

      const id = ch.getAttribute("data-id");
      if (!id) return;

      const container = ch.closest("[data-store]");
      if (!container) return;

      const key = container.getAttribute("data-store");
      if (!key) return;

      const data = readStore(key);
      data[id] = ch.checked;
      writeStore(key, data);
    });
  }

  // ---------- Random pick (delegación) ----------
  function initRandomDelegationOnce() {
    if (window.__SV_RANDOM_DELEG_INITED) return;
    window.__SV_RANDOM_DELEG_INITED = true;

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.id === "pickCita") {
        const out = $("#citaOut");
        const box = $("#citaBox");
        if (!out || !box) return;
        const pick = CITAS_RANDOM[Math.floor(Math.random() * CITAS_RANDOM.length)];
        out.textContent = pick;
        box.classList.add("show");
      }

      if (btn.id === "pickCupon") {
        const out = $("#cuponOut");
        const box = $("#cuponBox");
        if (!out || !box) return;
        const pick = CUPONES_RANDOM[Math.floor(Math.random() * CUPONES_RANDOM.length)];
        out.textContent = pick;
        box.classList.add("show");
      }
    });
  }

  // ---------- Acepto page logic (WhatsApp SOLO tras aceptar) ----------
  function initAceptoDelegationOnce() {
    if (window.__SV_ACEPTO_DELEG_INITED) return;
    window.__SV_ACEPTO_DELEG_INITED = true;

    let noCount = 0;

    document.addEventListener("click", (e) => {
      const yes = e.target.closest("#btnYes");
      const no = e.target.closest("#btnNo");
      if (!yes && !no) return;

      const box = $("#aceptoBox");
      if (!box) return; // solo si estamos en acepto.html

      const ok = $("#accepted");
      const msg = $("#declined");
      const wa = $("#waAfterYes"); // si existe lo mostramos

      if (yes) {
        ok && ok.classList.add("show");
        msg && msg.classList.remove("show");
        wa && wa.classList.add("show");

        // guardar estado "aceptado" por si quieres usarlo luego
        localStorage.setItem("sv_accepted", "1");

        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            const layer = $("#heartsLayer");
            if (!layer) return;
            const h = document.createElement("div");
            h.className = "heart";
            h.textContent = ["💗", "💖", "💘", "💞", "💕"][Math.floor(Math.random() * 5)];
            h.style.fontSize = `${18 + Math.random() * 22}px`;
            h.style.left = `${35 + Math.random() * 30}vw`;
            h.style.bottom = `20vh`;
            h.style.animationDuration = `${5 + Math.random() * 3}s`;
            h.style.opacity = `${0.22 + Math.random() * 0.20}`;
            layer.appendChild(h);
            setTimeout(() => h.remove(), 9000);
          }, i * 40);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (no) {
        noCount++;
        msg && msg.classList.add("show");
        ok && ok.classList.remove("show");
        wa && wa.classList.remove("show");

        const phrases = [
          "mmm… piénsalo otra vez 😌",
          "yo sé que quieres 😳",
          "no me rompas el corazoncito 🥺",
          "última oportunidad… 💗",
        ];
        no.textContent = phrases[Math.min(noCount - 1, phrases.length - 1)];
      }
    });
  }

  // ---------- SPA navigation (para que la música NO se corte) ----------
  function initSpaNavOnce() {
    if (window.__SV_SPA_INITED) return;
    window.__SV_SPA_INITED = true;

    const isHtmlPage = (url) => url.pathname.endsWith(".html");

    async function loadPage(url) {
      const res = await fetch(url.href, { cache: "no-store" });
      const txt = await res.text();
      const doc = new DOMParser().parseFromString(txt, "text/html");

      const title = doc.querySelector("title")?.textContent || document.title;
      const newMain = doc.querySelector("main");
      const html = newMain ? newMain.innerHTML : doc.body.innerHTML;

      // Quitamos scripts dentro del main (evita duplicados/bugs)
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      $$("script", tmp).forEach((s) => s.remove());

      return { title, html: tmp.innerHTML };
    }

    async function navigateTo(href, { push = true } = {}) {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) {
        location.href = url.href;
        return;
      }
      if (!isHtmlPage(url)) {
        location.href = url.href;
        return;
      }

      // Guardamos estado del player antes de “cambiar”
      try {
        const a = window.__SV_AUDIO;
        if (a) saveState({ time: a.currentTime || 0, playing: !a.paused, index: loadState().index ?? 0 });
      } catch {}

      const { title, html } = await loadPage(url);

      if (push) history.pushState({}, "", url.href);
      document.title = title;

      const main = $("main");
      if (main) {
        main.innerHTML = html;
      }

      // Re-hidratar checklists y recalcular offsets
      window.__SV_HYDRATE_CHECKLISTS && window.__SV_HYDRATE_CHECKLISTS();
      setTimeout(scheduleOffsets, 40);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      if (a.target === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const url = new URL(a.getAttribute("href"), location.href);
      if (url.origin !== location.origin) return;
      if (!isHtmlPage(url)) return;

      e.preventDefault();
      navigateTo(url.href, { push: true });
    });

    window.addEventListener("popstate", () => {
      navigateTo(location.href, { push: false });
    });
  }

  // ---------- Start ----------
  document.addEventListener("DOMContentLoaded", () => {
    initHeartsOnce();
    initLightboxOnce();

    initChecklistDelegationOnce();
    initRandomDelegationOnce();
    initAceptoDelegationOnce();

    initPlayerOnce();
    initSpaNavOnce();

    // Inicial: aplicar checks guardados
    window.__SV_HYDRATE_CHECKLISTS && window.__SV_HYDRATE_CHECKLISTS();

    setTimeout(scheduleOffsets, 120);
  });
})();
