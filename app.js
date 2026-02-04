(() => {
  if (window.__SV_APP_INITED) return;
  window.__SV_APP_INITED = true;

  // ---------- Helpers ----------
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- Layout offsets (no tapar contenido) ----------
  function updateDockOffsets(){
    const cd = $("#countdownDock");
    const pd = $("#playerDock");
    const top = cd ? cd.getBoundingClientRect().height + 26 : 40;
    const bottom = pd ? pd.getBoundingClientRect().height + 26 : 40;
    document.documentElement.style.setProperty("--topDock", `${Math.ceil(top)}px`);
    document.documentElement.style.setProperty("--bottomDock", `${Math.ceil(bottom)}px`);
  }

  window.addEventListener("resize", () => setTimeout(updateDockOffsets, 80));
  window.addEventListener("load", () => setTimeout(updateDockOffsets, 120));
  document.addEventListener("DOMContentLoaded", () => setTimeout(updateDockOffsets, 60));

  // ---------- Hearts (se ven en celular) ----------
  function initHearts(){
    let layer = $("#heartsLayer");
    if (!layer){
      layer = document.createElement("div");
      layer.id = "heartsLayer";
      document.body.appendChild(layer);
    }

    const heartChars = ["💗","💖","💘","💞","💕"];
    function spawn(){
      const h = document.createElement("div");
      h.className = "heart";
      h.textContent = heartChars[Math.floor(Math.random()*heartChars.length)];
      const size = 16 + Math.random()*18;
      h.style.fontSize = `${size}px`;
      h.style.left = `${Math.random()*100}vw`;
      h.style.bottom = `-30px`;
      h.style.animationDuration = `${8 + Math.random()*6}s`;
      h.style.opacity = `${0.12 + Math.random()*0.16}`;
      layer.appendChild(h);

      setTimeout(() => h.remove(), 16000);
    }

    // densidad suave (no molesta)
    setInterval(spawn, 900);
    for(let i=0;i<6;i++) setTimeout(spawn, i*250);
  }

  // ---------- Lightbox (X siempre visible + no se descuadra) ----------
  function initLightbox(){
    let lb = $("#lightbox");
    if (!lb){
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

    function open(src){
      imgEl.src = src;
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function close(){
      lb.classList.remove("open");
      imgEl.src = "";
      document.body.style.overflow = "";
    }

    closeBtn.addEventListener("click", close);
    lb.addEventListener("click", (e) => {
      if (e.target === lb) close();
    });

    // activa en todas las imágenes dentro de .photo
    $$(".photo img").forEach(img => {
      img.addEventListener("click", () => open(img.src));
    });
  }

  // ---------- Player (persistente + playlist + seek) ----------
  const STORAGE = "sv_player_state_v3";
  const TRACKS = [
    { id:"uwaie", label:"UWAIE", sources:["audio/uwaie.mp3","uwaie.mp3"] },
    { id:"mi_refe", label:"Mi refe", sources:["audio/Mi-refe.mp3","Mi-refe.mp3"] },
    { id:"mas_que_tu", label:"Más que tú", sources:["audio/mas-que-tu.mp3","mas-que-tu.mp3"] },
  ];

  function loadState(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE) || "{}");
    }catch{ return {}; }
  }
  function saveState(patch){
    const cur = loadState();
    const next = { ...cur, ...patch, ts: Date.now() };
    localStorage.setItem(STORAGE, JSON.stringify(next));
    return next;
  }

  async function pickFirstWorkingSource(audio, sources){
    // Intenta en orden; si falla, pasa al siguiente.
    for (const src of sources){
      try{
        audio.src = src;
        await audio.load();
        return src;
      }catch{}
    }
    // deja el primero igual
    audio.src = sources[0];
    return sources[0];
  }

  function fmtTime(t){
    if (!isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t/60);
    const s = Math.floor(t%60);
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function initPlayer(){
    let dock = $("#playerDock");
    if (!dock){
      dock = document.createElement("div");
      dock.id = "playerDock";
      document.body.appendChild(dock);
    }

    // UI
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
    setTimeout(updateDockOffsets, 0);

    const btnToggle = dock.querySelector('[data-act="toggle"]');
    const btnPrev = dock.querySelector('[data-act="prev"]');
    const btnNext = dock.querySelector('[data-act="next"]');
    const btnExpand = dock.querySelector('[data-act="expand"]');
    const seek = $("#seek", dock);
    const tcur = $("#tcur", dock);
    const tdur = $("#tdur", dock);
    const psub = $("#psub", dock);
    const trackRow = $("#trackRow", dock);

    // Audio element
    const audio = new Audio();
    audio.preload = "metadata";
    audio.loop = false;

    // Build track chips
    trackRow.innerHTML = TRACKS.map((t,i)=>(
      `<button class="track" type="button" data-i="${i}">${t.label}</button>`
    )).join("");

    function setActiveChip(i){
      $$(".track", trackRow).forEach(b => b.classList.toggle("active", Number(b.dataset.i) === i));
    }

    let st = loadState();
    let index = clamp(Number(st.index ?? 0), 0, TRACKS.length-1);
    let wasPlaying = Boolean(st.playing);
    let restoredTime = Number(st.time ?? 0);

    async function setTrack(i, keepTime=false){
      index = clamp(i, 0, TRACKS.length-1);
      setActiveChip(index);
      psub.textContent = `Música • ${index+1}/${TRACKS.length}`;

      const tr = TRACKS[index];
      await pickFirstWorkingSource(audio, tr.sources);

      audio.onloadedmetadata = () => {
        if (!keepTime) restoredTime = 0;
        const safe = clamp(restoredTime, 0, (audio.duration || restoredTime));
        audio.currentTime = isFinite(safe) ? safe : 0;
        tdur.textContent = fmtTime(audio.duration);
        saveState({ index, time: audio.currentTime });
      };

      saveState({ index });
    }

    function setPlayIcon(){
      btnToggle.textContent = audio.paused ? "▶" : "❚❚";
    }

    function updateSeek(){
      const dur = audio.duration || 0;
      const cur = audio.currentTime || 0;
      tcur.textContent = fmtTime(cur);
      tdur.textContent = fmtTime(dur);
      const val = dur ? Math.floor((cur/dur)*1000) : 0;
      seek.value = String(val);
    }

    // Seek interaction
    let seeking = false;
    seek.addEventListener("input", () => {
      seeking = true;
      const dur = audio.duration || 0;
      if (!dur) return;
      const target = (Number(seek.value)/1000) * dur;
      tcur.textContent = fmtTime(target);
    });
    seek.addEventListener("change", () => {
      const dur = audio.duration || 0;
      if (!dur) { seeking = false; return; }
      const target = (Number(seek.value)/1000) * dur;
      audio.currentTime = clamp(target, 0, dur);
      saveState({ time: audio.currentTime });
      seeking = false;
    });

    // Controls
    async function play(){
      try{
        await audio.play();
        setPlayIcon();
        saveState({ playing:true });
      }catch(e){
        // iOS puede bloquear autoplay: quedará listo, usuario toca play
        saveState({ playing:false });
        setPlayIcon();
      }
    }
    function pause(){
      audio.pause();
      setPlayIcon();
      saveState({ playing:false, time: audio.currentTime || 0 });
    }

    btnToggle.addEventListener("click", async () => {
      if (audio.paused) await play();
      else pause();
    });

    btnPrev.addEventListener("click", async () => {
      const next = (index - 1 + TRACKS.length) % TRACKS.length;
      restoredTime = 0;
      await setTrack(next, false);
      if (!audio.paused) await play();
      else setPlayIcon();
    });

    btnNext.addEventListener("click", async () => {
      const next = (index + 1) % TRACKS.length;
      restoredTime = 0;
      await setTrack(next, false);
      if (!audio.paused) await play();
      else setPlayIcon();
    });

    btnExpand.addEventListener("click", () => {
      dock.classList.toggle("expanded");
      btnExpand.textContent = dock.classList.contains("expanded") ? "▴" : "▾";
      setTimeout(updateDockOffsets, 60);
    });

    // Track chips
    trackRow.addEventListener("click", async (e) => {
      const b = e.target.closest(".track");
      if (!b) return;
      restoredTime = 0;
      await setTrack(Number(b.dataset.i), false);
      // si estaba sonando, sigue
      if (!audio.paused) await play();
      else setPlayIcon();
    });

    // Update loop
    audio.addEventListener("timeupdate", () => {
      if (!seeking) updateSeek();
      saveState({ time: audio.currentTime || 0 });
    });

    audio.addEventListener("ended", async () => {
      // pasa a la siguiente
      const next = (index + 1) % TRACKS.length;
      restoredTime = 0;
      await setTrack(next, false);
      // si estaba reproduciendo, sigue
      await play();
    });

    // Guardar antes de navegar
    function persistNow(){
      saveState({
        index,
        time: audio.currentTime || 0,
        playing: !audio.paused
      });
    }
    window.addEventListener("pagehide", persistNow);
    window.addEventListener("beforeunload", persistNow);

    // Interceptar clicks en links internos para guardar estado
    $$('a[href$=".html"]').forEach(a => {
      a.addEventListener("click", () => persistNow(), { capture:true });
    });

    // Init
    setActiveChip(index);
    setTrack(index, true).then(async () => {
      setPlayIcon();
      updateSeek();
      setTimeout(updateDockOffsets, 80);

      // Restaurar reproducción si estaba sonando (intenta)
      if (wasPlaying){
        // importante: restaurar tiempo guardado
        restoredTime = restoredTime || Number(loadState().time || 0);
        await play();
      }
    });
  }

  // ---------- Acepto page logic (WhatsApp SOLO tras aceptar) ----------
  function initAcepto(){
    const box = document.getElementById("aceptoBox");
    if (!box) return;

    const yes = document.getElementById("btnYes");
    const no = document.getElementById("btnNo");
    const ok = document.getElementById("accepted");
    const msg = document.getElementById("declined");

    let noCount = 0;

    yes.addEventListener("click", () => {
      ok.classList.add("show");
      msg.classList.remove("show");
      // burst hearts
      for(let i=0;i<20;i++){
        setTimeout(() => {
          const layer = document.getElementById("heartsLayer");
          if (!layer) return;
          const h = document.createElement("div");
          h.className = "heart";
          h.textContent = ["💗","💖","💘","💞","💕"][Math.floor(Math.random()*5)];
          h.style.fontSize = `${18 + Math.random()*22}px`;
          h.style.left = `${35 + Math.random()*30}vw`;
          h.style.bottom = `20vh`;
          h.style.animationDuration = `${5 + Math.random()*3}s`;
          h.style.opacity = `${0.22 + Math.random()*0.20}`;
          layer.appendChild(h);
          setTimeout(()=>h.remove(), 9000);
        }, i*40);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    no.addEventListener("click", () => {
      noCount++;
      msg.classList.add("show");
      ok.classList.remove("show");

      const phrases = [
        "mmm… piénsalo otra vez 😌",
        "yo sé que quieres 😳",
        "no me rompas el corazoncito 🥺",
        "última oportunidad… 💗"
      ];
      no.textContent = phrases[Math.min(noCount-1, phrases.length-1)];
    });
  }

  // ---------- LocalStorage checklist for citas / cupones ----------
  function initChecklist(storageKey){
    const inputs = $$(`[data-store="${storageKey}"] input[type="checkbox"]`);
    if (!inputs.length) return;

    let data = {};
    try{ data = JSON.parse(localStorage.getItem(storageKey) || "{}"); }catch{}

    inputs.forEach(ch => {
      const id = ch.getAttribute("data-id");
      ch.checked = Boolean(data[id]);

      ch.addEventListener("change", () => {
        data[id] = ch.checked;
        localStorage.setItem(storageKey, JSON.stringify(data));
      });
    });
  }

  // ---------- Random for citas / cupones ----------
  function initRandomPick(btnId, outId, items){
    const btn = document.getElementById(btnId);
    const out = document.getElementById(outId);
    if (!btn || !out) return;

    btn.addEventListener("click", () => {
      const pick = items[Math.floor(Math.random()*items.length)];
      out.textContent = pick;
      out.parentElement.classList.add("show");
    });
  }

  // ---------- Start ----------
  document.addEventListener("DOMContentLoaded", () => {
    initHearts();
    initLightbox();
    initPlayer();
    initAcepto();

    // Citas
    initChecklist("sv_citas_check");
    initRandomPick("pickCita", "citaOut", [
      "Cena romántica + postre sí o sí 🍰",
      "Helado + caminata de noche 🌙",
      "Peli en casa con mantita 🎬",
      "Un picnic simple pero lindo 🧺",
      "Fotos juntos en un lugar bonito 📸",
      "Ir a un mirador y hablar horas ✨",
      "Noche de juegos (cartas / retos) 🎮",
      "Café y hablar de nuestros sueños ☕"
    ]);

    // Cupones
    initChecklist("sv_cupones_check");
    initRandomPick("pickCupon", "cuponOut", [
      "Cupón: Un beso infinito 💗",
      "Cupón: Un abrazo largo (mínimo 2 min) 🫶",
      "Cupón: Cena bonita (yo invito) 🍽️",
      "Cupón: Salida sorpresa (yo la planeo) 🌹",
      "Cupón: Noche de pelis + antojos 🎬",
      "Cupón: Un día de mimos solo para ti 🧸"
    ]);

    setTimeout(updateDockOffsets, 120);
  });

})();
