(() => {
  const CONFIG = {
    // Ajusta si quieres (fecha destino):
    // Importante: el -05:00 es Perú. Si no quieres hora exacta, déjalo así.
    targetDateISO: "2026-04-12T00:00:00-05:00",

    // WhatsApp (SIN mensaje automático) - tu número:
    waNumber: "51990367042", // 51 + 990367042

    // Audio real:
    audioSrc: "audio/uwaie.mp3",

    // Fotos (nombres exactos como los tienes en /fotos)
    recuerdosA: ["A1.jpeg","A2.jpeg","A3.jpeg","A4.jpeg","A5.jpeg"],
    recuerdosD: ["D1.jpeg","D2.jpeg","D3.jpeg","D4.jpeg","D5.jpeg"],
  };

  // ========= Helpers =========
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ========= WhatsApp (sin texto) =========
  function wireWhatsApp() {
    $$("[data-wa]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(`https://wa.me/${CONFIG.waNumber}`, "_blank", "noopener");
      });
    });
  }

  // ========= UI GLOBAL: Contador + Player =========
  let audio;
  let audioWanted = false; // se vuelve true cuando usuario toca play
  let firstGestureBound = false;

  function mountGlobalUI() {
    const root = $("#floating-ui");
    if (!root) return;

    root.innerHTML = `
      <section class="floating-counter" id="counter">
        <div class="counter-title">
          <span>Faltan para volver a vernos</span>
          <span class="heart" aria-hidden="true">💗</span>
        </div>
        <div class="counter-grid">
          <div class="counter-box"><span class="num" id="cd-days">--</span><span class="lab">DÍAS</span></div>
          <div class="counter-box"><span class="num" id="cd-hours">--</span><span class="lab">HRS</span></div>
          <div class="counter-box"><span class="num" id="cd-mins">--</span><span class="lab">MIN</span></div>
          <div class="counter-box"><span class="num" id="cd-secs">--</span><span class="lab">SEG</span></div>
        </div>
      </section>

      <section class="floating-player" id="player">
        <button class="player-btn" id="playerBtn" type="button" aria-label="Reproducir / Pausar">▶</button>
        <div class="player-label">
          <div class="t1">Toca para reproducir</div>
          <div class="t2">Música</div>
        </div>
      </section>
    `;

    // Ajustar padding de página para que el contador NO tape nada
    const counter = $("#counter");
    const player = $("#player");
    const updateSafeSpace = () => {
      const ch = counter?.offsetHeight || 0;
      const ph = player?.offsetHeight || 0;
      document.documentElement.style.setProperty("--ui-top", `${ch + 22}px`);
      document.documentElement.style.setProperty("--ui-bottom", `${ph + 22}px`);
    };
    updateSafeSpace();

    const ro = new ResizeObserver(updateSafeSpace);
    if (counter) ro.observe(counter);
    if (player) ro.observe(player);

    // Contador
    startCountdown();

    // Player
    setupAudioPlayer();
  }

  function startCountdown() {
    const target = new Date(CONFIG.targetDateISO).getTime();

    const pad2 = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const now = Date.now();
      let diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * (1000 * 60 * 60 * 24);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * (1000 * 60 * 60);

      const mins = Math.floor(diff / (1000 * 60));
      diff -= mins * (1000 * 60);

      const secs = Math.floor(diff / 1000);

      const dEl = $("#cd-days");
      const hEl = $("#cd-hours");
      const mEl = $("#cd-mins");
      const sEl = $("#cd-secs");
      if (dEl) dEl.textContent = String(days);
      if (hEl) hEl.textContent = pad2(hours);
      if (mEl) mEl.textContent = pad2(mins);
      if (sEl) sEl.textContent = pad2(secs);
    };

    tick();
    setInterval(tick, 1000);
  }

  function setupAudioPlayer() {
    // Creamos audio por JS para controlar estado entre páginas
    audio = new Audio(CONFIG.audioSrc);
    audio.loop = true;
    audio.preload = "auto";

    // Restaurar estado (si estaba sonando antes)
    const savedTime = Number(localStorage.getItem("sv_audio_time") || "0");
    const wasPlaying = localStorage.getItem("sv_audio_playing") === "1";

    if (Number.isFinite(savedTime) && savedTime > 0) {
      try { audio.currentTime = savedTime; } catch {}
    }
    audioWanted = wasPlaying;

    // Guardar tiempo cada cierto rato
    let lastSave = 0;
    audio.addEventListener("timeupdate", () => {
      const now = Date.now();
      if (now - lastSave > 1500) {
        lastSave = now;
        localStorage.setItem("sv_audio_time", String(audio.currentTime || 0));
      }
    });

    audio.addEventListener("play", () => localStorage.setItem("sv_audio_playing", "1"));
    audio.addEventListener("pause", () => localStorage.setItem("sv_audio_playing", "0"));

    const btn = $("#playerBtn");
    if (!btn) return;

    const setIcon = () => { btn.textContent = audio.paused ? "▶" : "⏸"; };
    setIcon();

    btn.addEventListener("click", async () => {
      // click del usuario = permitido en iPhone
      audioWanted = true;
      try {
        if (audio.paused) await audio.play();
        else audio.pause();
      } catch (e) {
        // Si falla, igual dejamos "wanted" para el siguiente gesto
      }
      setIcon();
    });

    // iPhone/Safari no permite autoplay:
    // Solución: cuando el usuario toque cualquier parte por primera vez,
    // intentamos reproducir si "audioWanted" estaba activo.
    if (!firstGestureBound) {
      firstGestureBound = true;

      const tryAuto = async () => {
        if (!audioWanted) return;
        try {
          await audio.play();
          setIcon();
        } catch {}
      };

      const onFirstGesture = () => {
        tryAuto();
        window.removeEventListener("touchstart", onFirstGesture);
        window.removeEventListener("click", onFirstGesture);
      };

      window.addEventListener("touchstart", onFirstGesture, { once: true, passive: true });
      window.addEventListener("click", onFirstGesture, { once: true });
    }

    // Si venía sonando en desktop (a veces permite), probamos suave:
    if (audioWanted) {
      audio.play().then(setIcon).catch(() => {
        // normal en iPhone: solo sonará tras el primer toque
        setIcon();
      });
    }
  }

  // ========= Lightbox Fotos (PRO: X siempre visible) =========
  let lockScrollY = 0;

  function lockBody() {
    lockScrollY = window.scrollY || 0;
    document.body.classList.add("is-locked");
    document.body.style.top = `-${lockScrollY}px`;
  }

  function unlockBody() {
    document.body.classList.remove("is-locked");
    document.body.style.top = "";
    window.scrollTo(0, lockScrollY);
  }

  function setupLightbox() {
    const lb = $("#lightbox");
    if (!lb) return;

    const img = $(".lightbox__img", lb);

    const close = () => {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      if (img) { img.src = ""; img.alt = ""; }
      unlockBody();
    };

    $$("[data-close]", lb).forEach(el => el.addEventListener("click", close));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("open")) close(); });

    // Exponer función global local
    window.__openLightbox = (src, alt="") => {
      if (!img) return;
      lockBody();
      img.src = src;
      img.alt = alt;
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
    };
  }

  // ========= Recuerdos =========
  function renderRecuerdos() {
    const gridA = $("#gridA");
    const gridD = $("#gridD");
    if (!gridA || !gridD) return;

    const makePhoto = (src, alt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "photo";
      btn.innerHTML = `<img loading="lazy" src="${src}" alt="${alt}" />`;
      btn.addEventListener("click", () => {
        if (window.__openLightbox) window.__openLightbox(src, alt);
      });
      return btn;
    };

    // A1..A5
    CONFIG.recuerdosA.forEach((name, idx) => {
      const src = `fotos/${name}`;
      gridA.appendChild(makePhoto(src, `Momento ${idx + 1}`));
    });

    // D1..D5
    CONFIG.recuerdosD.forEach((name, idx) => {
      const src = `fotos/${name}`;
      gridD.appendChild(makePhoto(src, `Foto ${idx + 1}`));
    });
  }

  // ========= Citas =========
  function setupCitas() {
    const btn = $("#btnPickDate");
    const out = $("#dateResult");
    const checklist = $("#checklistDates");
    if (!btn || !out || !checklist) return;

    const ideas = [
      "Cena romántica + postre 💗",
      "Helado + caminata de noche 🌙",
      "Peli en casa con mantita 🎬",
      "Cita sorpresa (yo la planeo) 🌹",
      "Fotos juntos en un lugar bonito 📸",
      "Desayuno juntos un domingo 🥐",
      "Ir a un mirador y conversar horas ✨",
      "Noche de juegos (cartas / retos) 🎮",
      "Café y hablar de nuestros sueños ☕",
      "Un picnic simple, pero lindo 🧺",
      "Atardecer juntos y promesas bonitas 🌅",
      "Salir a bailar y reírnos mucho 💃🕺"
    ];

    btn.addEventListener("click", () => {
      const pick = ideas[Math.floor(Math.random() * ideas.length)];
      out.textContent = pick;
    });

    const items = [
      "Cena romántica + postre 💗",
      "Helado + caminata de noche 🌙",
      "Peli en casa con mantita 🎬",
      "Cita sorpresa (yo la planeo) 🌹",
      "Fotos juntos en un lugar bonito 📸",
      "Desayuno juntos un domingo 🥐",
      "Ir a un mirador y conversar horas ✨",
      "Noche de juegos (cartas / retos) 🎮",
      "Café y hablar de nuestros sueños ☕",
      "Un picnic simple, pero lindo 🧺",
      "Atardecer juntos 🌅",
      "Día de spa casero 🧴"
    ];

    const KEY = "sv_dates_checklist";
    const state = JSON.parse(localStorage.getItem(KEY) || "{}");

    checklist.innerHTML = "";
    items.forEach((text, i) => {
      const id = `d_${i}`;
      const row = document.createElement("label");
      row.className = "check";
      row.innerHTML = `<input type="checkbox" ${state[id] ? "checked" : ""} /> <span>${text}</span>`;
      const cb = $("input", row);
      cb.addEventListener("change", () => {
        state[id] = cb.checked;
        localStorage.setItem(KEY, JSON.stringify(state));
      });
      checklist.appendChild(row);
    });
  }

  // ========= Cupones =========
  function setupCupones() {
    const grid = $("#couponGrid");
    const modal = $("#couponModal");
    if (!grid || !modal) return;

    const titleEl = $("#couponTitle");
    const descEl = $("#couponDesc");
    const btnToggle = $("#btnToggleCoupon");
    const btnRandom = $("#btnRandomCoupon");

    const coupons = [
      { id:"c1", title:"Cupón: Un beso infinito 💗", desc:"Canjeable por besos ilimitados (mínimo 10) cuando nos veamos." },
      { id:"c2", title:"Cupón: Abrazo de 2 minutos 🫂", desc:"Abrazo largo, de esos que curan. Sin apuro." },
      { id:"c3", title:"Cupón: Cita sorpresa ✨", desc:"Yo planifico todo: lugar, comida y detalle. Tú solo llegas bonita." },
      { id:"c4", title:"Cupón: Desayuno para ti 🥐", desc:"Desayuno rico hecho por mí o pedido a tu gusto." },
      { id:"c5", title:"Cupón: Peli + mantita 🎬", desc:"Noche de peli con snacks y cariño." },
      { id:"c6", title:"Cupón: Noche de juegos 🎮", desc:"Juegos / retos suaves / risas. Lo que tú quieras." },
      { id:"c7", title:"Cupón: Foto juntos 📸", desc:"Sesión de fotos juntos en un lugar bonito. Yo me esmero." },
      { id:"c8", title:"Cupón: Atardecer contigo 🌅", desc:"Ir a ver el atardecer y hablar de nosotros." },
      { id:"c9", title:"Cupón: Masaje (suave) 🧴", desc:"Masaje relajante (prometo hacerlo con amor y paciencia)." },
      { id:"c10", title:"Cupón: Tu antojo 🍓", desc:"Lo que se te antoje: dulce, salado, bebida… yo invito." }
    ];

    const KEY = "sv_coupons_used";
    const used = JSON.parse(localStorage.getItem(KEY) || "{}");

    const render = () => {
      grid.innerHTML = "";
      coupons.forEach(c => {
        const card = document.createElement("div");
        card.className = `coupon ${used[c.id] ? "used" : ""}`;
        card.innerHTML = `
          <div class="tag">${used[c.id] ? "CANJEADO ✅" : "DISPONIBLE 🎟️"}</div>
          <h3>${c.title}</h3>
          <p>${c.desc}</p>
        `;
        card.addEventListener("click", () => openCoupon(c.id));
        grid.appendChild(card);
      });
    };

    let currentId = null;

    const openCoupon = (id) => {
      currentId = id;
      const c = coupons.find(x => x.id === id);
      if (!c) return;

      titleEl.textContent = c.title;
      descEl.textContent = c.desc;

      btnToggle.textContent = used[id] ? "Marcar como disponible ↩" : "Marcar como canjeado ✅";

      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      lockBody();
    };

    const closeCoupon = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      unlockBody();
    };

    $$("[data-close-coupon]").forEach(el => el.addEventListener("click", closeCoupon));

    btnToggle.addEventListener("click", () => {
      if (!currentId) return;
      used[currentId] = !used[currentId];
      localStorage.setItem(KEY, JSON.stringify(used));
      btnToggle.textContent = used[currentId] ? "Marcar como disponible ↩" : "Marcar como canjeado ✅";
      render();
    });

    btnRandom?.addEventListener("click", () => {
      const available = coupons.filter(c => !used[c.id]);
      const pick = (available.length ? available : coupons)[Math.floor(Math.random() * (available.length ? available.length : coupons.length))];
      openCoupon(pick.id);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeCoupon();
    });

    render();
  }

  // ========= Init =========
  function init() {
    wireWhatsApp();
    mountGlobalUI();
    setupLightbox();

    const page = document.body?.dataset?.page || "";
    if (page === "recuerdos") renderRecuerdos();
    if (page === "citas") setupCitas();
    if (page === "cupones") setupCupones();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
