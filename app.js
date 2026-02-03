(() => {
  // =========================
  // 0) Helpers
  // =========================
  const $ = (id) => document.getElementById(id);

  // =========================
  // 1) AUDIO (GitHub Pages + iPhone)
  // - iOS bloquea autoplay: se reanuda al primer toque/scroll si estaba “en play”
  // =========================
  const audio = $("bgm");
  const playBtn = $("playBtn");
  const playHint = $("playHint");

  const KEY_PLAY = "bgm_playing";   // "1" | "0"
  const KEY_TIME = "bgm_time";      // segundos
  const KEY_VOL  = "bgm_vol";       // opcional

  const wantsPlay = () => localStorage.getItem(KEY_PLAY) === "1";

  const setBtn = (isPlaying) => {
    if (!playBtn) return;
    playBtn.textContent = isPlaying ? "⏸" : "▶";
    if (playHint) {
      playHint.textContent = isPlaying
        ? "Reproduciendo"
        : "Toca para reproducir";
    }
  };

  const saveAudioState = () => {
    if (!audio) return;
    try {
      localStorage.setItem(KEY_TIME, String(audio.currentTime || 0));
      localStorage.setItem(KEY_PLAY, audio.paused ? "0" : "1");
      localStorage.setItem(KEY_VOL, String(audio.volume ?? 0.9));
    } catch (_) {}
  };

  const restoreAudioState = () => {
    if (!audio) return;

    const t = parseFloat(localStorage.getItem(KEY_TIME) || "0");
    const v = parseFloat(localStorage.getItem(KEY_VOL) || "0.9");

    if (!Number.isNaN(v)) audio.volume = Math.min(1, Math.max(0, v));

    // set currentTime cuando ya hay metadata
    const applyTime = () => {
      if (!Number.isNaN(t) && t > 0 && isFinite(t)) {
        try { audio.currentTime = t; } catch (_) {}
      }
    };

    if (audio.readyState >= 1) applyTime();
    else audio.addEventListener("loadedmetadata", applyTime, { once: true });

    setBtn(wantsPlay());
  };

  const tryPlay = async () => {
    if (!audio) return false;
    try {
      await audio.play();
      setBtn(true);
      return true;
    } catch (e) {
      // si autoplay está bloqueado, quedará en pausa hasta que el usuario toque play
      setBtn(false);
      return false;
    }
  };

  if (audio) {
    restoreAudioState();

    audio.addEventListener("play", () => {
      localStorage.setItem(KEY_PLAY, "1");
      setBtn(true);
    });

    audio.addEventListener("pause", () => {
      localStorage.setItem(KEY_PLAY, "0");
      setBtn(false);
    });

    audio.addEventListener("timeupdate", () => {
      // guardado liviano
      if ((audio.currentTime % 3) < 0.25) saveAudioState();
    });

    window.addEventListener("beforeunload", saveAudioState);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveAudioState();
    });

    // Reanudar en la siguiente página al primer gesto del usuario (scroll/tap)
    const resumeOnGesture = async () => {
      if (!wantsPlay()) return;
      if (!audio.paused) return;
      await tryPlay();
    };
    ["pointerdown", "touchstart", "keydown"].forEach((ev) => {
      document.addEventListener(ev, resumeOnGesture, { once: true, passive: true });
    });
  }

  if (playBtn && audio) {
    playBtn.addEventListener("click", async () => {
      if (audio.paused) {
        localStorage.setItem(KEY_PLAY, "1");
        await tryPlay();
      } else {
        audio.pause();
        localStorage.setItem(KEY_PLAY, "0");
        setBtn(false);
      }
      saveAudioState();
    });
  }

  // =========================
  // 2) COUNTDOWN (en todas las páginas)
  // =========================
  const cdDays = $("cdDays");
  const cdHours = $("cdHours");
  const cdMins = $("cdMins");
  const cdSecs = $("cdSecs");

  const target = new Date("2026-04-11T00:00:00-05:00").getTime(); // Perú (UTC-5)

  const pad2 = (n) => String(n).padStart(2, "0");

  const tick = () => {
    if (!cdDays || !cdHours || !cdMins || !cdSecs) return;

    const now = Date.now();
    let diff = Math.max(0, target - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);

    const mins = Math.floor(diff / (1000 * 60));
    diff -= mins * (1000 * 60);

    const secs = Math.floor(diff / 1000);

    cdDays.textContent = String(days);
    cdHours.textContent = pad2(hours);
    cdMins.textContent = pad2(mins);
    cdSecs.textContent = pad2(secs);
  };

  tick();
  setInterval(tick, 1000);

  // =========================
  // 3) MODAL FOTOS (fix iPhone: usar img.src absoluto)
  // =========================
  const modal = $("photoModal");
  const modalImg = $("modalImg");
  const modalClose = $("modalClose");
  const burst = $("heartBurst");

  let lockedScrollY = 0;

  const lockScroll = () => {
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = "100%";
  };

  const unlockScroll = () => {
    document.body.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedScrollY);
  };

  const openModal = (src) => {
    if (!modal || !modalImg) return;

    // src absoluto y limpio (esto arregla el “Foto ampliada” / imagen rota en iPhone)
    const abs = src ? new URL(src, window.location.href).href : "";
    modalImg.src = abs;
    modalImg.alt = "Foto ampliada";
    modal.classList.add("open");
    lockScroll();
  };

  const closeModal = () => {
    if (!modal || !modalImg) return;
    modal.classList.remove("open");
    modalImg.removeAttribute("src");
    unlockScroll();
  };

  if (modal && modalClose) {
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }

  // Delegación: cualquier imagen dentro de .gallery abre modal
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".gallery img");
    if (!img) return;

    // img.src ya viene absoluto
    openModal(img.src);
  });

  // =========================
  // 4) WhatsApp link (sin caracteres raros)
  // =========================
  const waYes = $("waYes");
  if (waYes) {
    const msg = "Sí 💘 acepto ser tu 14 de febrero";
    waYes.href = "https://wa.me/51990367042?text=" + encodeURIComponent(msg);
  }

  // =========================
  // 5) Corazones flotando + burst
  // =========================
  const heartsLayer = document.querySelector(".hearts");
  const makeHearts = () => {
    if (!heartsLayer) return;
    heartsLayer.innerHTML = "";
    const total = 18;
    for (let i = 0; i < total; i++) {
      const h = document.createElement("i");
      h.textContent = "💗";
      const left = Math.random() * 100;
      const size = 14 + Math.random() * 18;
      const dur = 8 + Math.random() * 10;
      const delay = Math.random() * 6;

      h.style.left = `${left}%`;
      h.style.bottom = `${-20 - Math.random() * 80}px`;
      h.style.fontSize = `${size}px`;
      h.style.animationDuration = `${dur}s`;
      h.style.animationDelay = `${delay}s`;

      heartsLayer.appendChild(h);
    }
  };
  makeHearts();

  const burstHearts = (x, y) => {
    if (!burst) return;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.textContent = "💗";
      const dx = (Math.random() - 0.5) * 90;
      const dy = Math.random() * 30;
      p.style.left = `${x + dx}px`;
      p.style.top = `${y + dy}px`;
      p.style.fontSize = `${14 + Math.random() * 14}px`;
      burst.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
  };

  // burst al hacer click en botones principales
  document.addEventListener("click", (e) => {
    const isBtn = e.target.closest(".btn, #playBtn");
    if (!isBtn) return;
    burstHearts(e.clientX || 180, e.clientY || 180);
  });
})();
