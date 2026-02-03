(() => {
  const meta = (name, fallback="") =>
    document.querySelector(`meta[name="${name}"]`)?.content?.trim() || fallback;

  const COUNTDOWN_TO = meta("countdown-to", "2026-04-12T00:00:00-05:00");
  const AUDIO_SRC = meta("site-audio", "audio/uwaie.mp3");
  const WA_NUMBER = meta("wa-number", "51999999999"); // cambia aquí o en <meta>

  // =========================
  // TOPBAR (contador) en TODAS
  // =========================
  const topbar = document.createElement("div");
  topbar.id = "topbar";
  topbar.innerHTML = `
    <div class="countdown" role="status" aria-label="Cuenta regresiva">
      <div class="countdown__title">
        <span>Faltan para volver a vernos</span>
        <span class="heart">💗</span>
      </div>
      <div class="countdown__grid">
        <div class="cd-box"><strong id="cd-d">--</strong><small>DÍAS</small></div>
        <div class="cd-box"><strong id="cd-h">--</strong><small>HRS</small></div>
        <div class="cd-box"><strong id="cd-m">--</strong><small>MIN</small></div>
        <div class="cd-box"><strong id="cd-s">--</strong><small>SEG</small></div>
      </div>
    </div>
  `;
  document.body.appendChild(topbar);

  const setTopSpace = () => {
    const h = topbar.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--topbar-space", `${h + 12}px`);
  };
  window.addEventListener("resize", setTopSpace);
  setTopSpace();

  // Countdown logic
  const elD = topbar.querySelector("#cd-d");
  const elH = topbar.querySelector("#cd-h");
  const elM = topbar.querySelector("#cd-m");
  const elS = topbar.querySelector("#cd-s");

  const target = new Date(COUNTDOWN_TO);
  const pad2 = (n) => String(Math.max(0, n)).padStart(2, "0");

  function tick(){
    const now = new Date();
    let diff = target.getTime() - now.getTime();
    if (diff < 0) diff = 0;

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    elD.textContent = days;
    elH.textContent = pad2(hours);
    elM.textContent = pad2(mins);
    elS.textContent = pad2(secs);
  }
  tick();
  setInterval(tick, 1000);

  // =========================
  // AUDIO: iPhone requiere toque (sin autoplay)
  // =========================
  let audio = document.getElementById("bgm");
  if (!audio){
    audio = document.createElement("audio");
    audio.id = "bgm";
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    document.body.appendChild(audio);
  }
  audio.src = AUDIO_SRC;

  // Player abajo (mini)
  const dock = document.createElement("div");
  dock.id = "playerDock";
  dock.innerHTML = `
    <div class="player-pill">
      <button class="player-btn" id="plBtn" aria-label="Reproducir/Pausar">▶</button>
      <div class="player-text">Toca para reproducir</div>
    </div>
  `;
  document.body.appendChild(dock);

  const plBtn = dock.querySelector("#plBtn");

  function ui(){
    plBtn.textContent = audio.paused ? "▶" : "⏸";
  }
  ui();

  async function tryPlay(){
    audio.muted = false;
    try{ await audio.play(); }catch(e){ /* iOS: solo con gesto */ }
    ui();
  }

  plBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (audio.paused) await tryPlay();
    else audio.pause();
    ui();
  });

  // Primer toque en la página también puede iniciar audio
  const firstGesture = async () => {
    if (audio.paused) await tryPlay();
    document.removeEventListener("touchstart", firstGesture);
    document.removeEventListener("pointerdown", firstGesture);
  };
  document.addEventListener("touchstart", firstGesture, { passive:true, once:true });
  document.addEventListener("pointerdown", firstGesture, { passive:true, once:true });

  audio.addEventListener("play", ui);
  audio.addEventListener("pause", ui);

  // =========================
  // WhatsApp sin mensaje automático
  // =========================
  document.querySelectorAll("[data-wa]").forEach(a => {
    a.setAttribute("href", `https://wa.me/${WA_NUMBER}`);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });

  // =========================
  // Lightbox pro para .gallery img
  // =========================
  let lb = document.getElementById("lightbox");
  if (!lb){
    lb = document.createElement("div");
    lb.id = "lightbox";
    lb.innerHTML = `
      <button class="lb-close" type="button" aria-label="Cerrar">×</button>
      <div class="lb-inner">
        <img class="lb-img" alt="Foto ampliada" />
      </div>
    `;
    document.body.appendChild(lb);
  }

  const lbImg = lb.querySelector(".lb-img");
  const lbClose = lb.querySelector(".lb-close");

  function openLB(src){
    document.body.classList.add("modal-open");
    lb.classList.add("open");
    lbImg.src = src;
  }
  function closeLB(){
    lb.classList.remove("open");
    document.body.classList.remove("modal-open");
    lbImg.src = "";
  }

  lbClose.addEventListener("click", closeLB);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLB(); });

  document.querySelectorAll(".gallery img").forEach(img => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
      const src = img.getAttribute("data-full") || img.currentSrc || img.src;
      openLB(src);
    });
  });

})();
