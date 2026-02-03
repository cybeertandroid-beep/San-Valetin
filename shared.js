/* ===============================
   shared.js (FULL)
   - Countdown en todas las páginas
   - Player: “Toca para reproducir” (sin nombre), abajo, minimizable
   - iOS: reproduce SOLO tras toque (política)
   - Galería: modal pro con X siempre accesible
   - WhatsApp: abre chat sin mensaje
   =============================== */

(function () {
  const WA_NUMBER = "51990367042"; // 51 + tu número

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function pad2(n) { return String(n).padStart(2, "0"); }

  // -----------------------------
  // WhatsApp links (sin mensaje)
  // -----------------------------
  $$('[data-wa="open"]').forEach(a => {
    a.href = `https://wa.me/${WA_NUMBER}`;
    a.target = "_blank";
    a.rel = "noopener";
  });

  // -----------------------------
  // Countdown
  // -----------------------------
  const cd = $("#countdown");
  if (cd) {
    const targetStr = cd.getAttribute("data-target") || "2026-04-12T00:00:00-05:00";
    const target = new Date(targetStr);

    const elD = $("#cd_days");
    const elH = $("#cd_hrs");
    const elM = $("#cd_min");
    const elS = $("#cd_sec");

    function tick() {
      const now = new Date();
      let diff = target.getTime() - now.getTime();
      if (diff < 0) diff = 0;

      const sec = Math.floor(diff / 1000);
      const days = Math.floor(sec / 86400);
      const hrs = Math.floor((sec % 86400) / 3600);
      const min = Math.floor((sec % 3600) / 60);
      const s = sec % 60;

      if (elD) elD.textContent = String(days);
      if (elH) elH.textContent = pad2(hrs);
      if (elM) elM.textContent = pad2(min);
      if (elS) elS.textContent = pad2(s);
    }

    tick();
    setInterval(tick, 1000);
  }

  // -----------------------------
  // Audio Player (no autoplay, solo tras toque)
  // -----------------------------
  const audio = $("#bgm");
  const player = $("#player");
  const btn = $("#playerBtn");
  const mini = $("#playerMini");

  function setPlayingUI(isPlaying) {
    if (!btn) return;
    btn.innerHTML = "";
    const icon = document.createElement("span");
    icon.className = `icon ${isPlaying ? "pause" : "play"}`;
    btn.appendChild(icon);
    btn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
  }

  async function tryPlay(userAction = false) {
    if (!audio) return false;
    audio.loop = true;
    audio.setAttribute("playsinline", "true");

    try {
      await audio.play();
      localStorage.setItem("bgmWanted", "1");
      setPlayingUI(true);
      return true;
    } catch (e) {
      // iOS / Chrome: si no es acción del usuario, fallará.
      if (userAction) {
        // Si incluso con toque falla, normalmente es ruta o mime:
        // revisa que /audio/uwaie.mp3 abra en el navegador.
        console.warn("No se pudo reproducir audio:", e);
      }
      setPlayingUI(false);
      return false;
    }
  }

  function pauseAudio() {
    if (!audio) return;
    audio.pause();
    localStorage.setItem("bgmWanted", "0");
    setPlayingUI(false);
  }

  if (audio && btn) {
    // estado inicial
    const wanted = localStorage.getItem("bgmWanted") === "1";
    setPlayingUI(false);

    // intento suave al cargar (puede fallar por política)
    if (wanted) {
      tryPlay(false);
    }

    // click explícito
    btn.addEventListener("click", async () => {
      if (audio.paused) await tryPlay(true);
      else pauseAudio();
    });

    // primer toque en pantalla: intenta reproducir
    let firstGestureDone = false;
    const onFirstGesture = async () => {
      if (firstGestureDone) return;
      firstGestureDone = true;

      // si el usuario ya quería música antes
      const wantedNow = localStorage.getItem("bgmWanted") === "1";
      if (wantedNow) await tryPlay(true);
    };
    document.addEventListener("pointerdown", onFirstGesture, { passive: true, once: true });
  }

  // Minimizar player (se queda solo el botón)
  if (player && mini) {
    mini.addEventListener("click", () => {
      player.classList.toggle("is-collapsed");
    });
  }

  // -----------------------------
  // Modal pro para fotos
  // -----------------------------
  const modal = $("#modal");
  const modalImg = $("#modalImg");
  const modalClose = $("#modalClose");

  function openModal(src, alt) {
    if (!modal || !modalImg) return;
    modalImg.src = src;
    modalImg.alt = alt || "Foto";

    modal.classList.add("open");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    if (!modal || !modalImg) return;
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");

    // limpia para evitar “flash” y liberar memoria en móvil
    modalImg.src = "";
  }

  if (modal && modalClose) {
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }

  // Enlaza todas las .photo (button) con data-full o img src
  $$(".photo").forEach((btnPhoto) => {
    btnPhoto.addEventListener("click", () => {
      const img = $("img", btnPhoto);
      const src = btnPhoto.getAttribute("data-full") || (img ? img.getAttribute("src") : "");
      const alt = img ? img.getAttribute("alt") : "Foto";
      if (src) openModal(src, alt);
    });
  });

  // -----------------------------
  // Checklists (Citas/Cupones) con localStorage
  // -----------------------------
  $$("[data-store]").forEach((wrap) => {
    const key = wrap.getAttribute("data-store");
    const inputs = $$("input[type=checkbox]", wrap);

    // cargar
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      inputs.forEach((cb) => {
        if (saved[cb.id] === true) cb.checked = true;
      });
    } catch {}

    // guardar
    inputs.forEach((cb) => {
      cb.addEventListener("change", () => {
        const state = {};
        inputs.forEach((x) => state[x.id] = x.checked);
        localStorage.setItem(key, JSON.stringify(state));
      });
    });
  });

  // -----------------------------
  // Cita aleatoria
  // -----------------------------
  const pickBtn = $("#pickDateBtn");
  const pickOut = $("#pickDateOut");
  if (pickBtn && pickOut) {
    pickBtn.addEventListener("click", () => {
      const ideas = $$("#datesList .check label").map(l => l.textContent.trim()).filter(Boolean);
      if (!ideas.length) return;
      const chosen = ideas[Math.floor(Math.random() * ideas.length)];
      pickOut.textContent = chosen;
    });
  }

})();
