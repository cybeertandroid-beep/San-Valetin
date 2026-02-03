(() => {
  const AUDIO_SRC = 'audio/uwaie.mp3';
  const TARGET_ISO = '2026-04-11T00:00:00-05:00'; // Perú (-05)

  // ==========================
  //  HELPERS
  // ==========================
  const $ = (sel) => document.querySelector(sel);

  // ==========================
  //  COUNTDOWN: in ALL pages (auto-inject)
  // ==========================
  function ensureCountdownDock(){
    if (document.getElementById('countdownDock')) return;

    const dock = document.createElement('aside');
    dock.className = 'countdown-dock';
    dock.id = 'countdownDock';
    dock.setAttribute('aria-live', 'polite');
    dock.innerHTML = `
      <div class="cd-title" id="cdTitle">Faltan para volver a vernos 💗</div>
      <div class="cd-clock-grid">
        <div class="cd-chip"><span class="cd-num" id="cdDays">--</span><span class="cd-lab">DÍAS</span></div>
        <div class="cd-chip"><span class="cd-num" id="cdHours">--</span><span class="cd-lab">HRS</span></div>
        <div class="cd-chip"><span class="cd-num" id="cdMins">--</span><span class="cd-lab">MIN</span></div>
        <div class="cd-chip"><span class="cd-num" id="cdSecs">--</span><span class="cd-lab">SEG</span></div>
      </div>
    `;
    document.body.appendChild(dock);
  }

  function startCountdown(){
    ensureCountdownDock();

    const cdTitle = document.getElementById('cdTitle');
    const cdDays  = document.getElementById('cdDays');
    const cdHours = document.getElementById('cdHours');
    const cdMins  = document.getElementById('cdMins');
    const cdSecs  = document.getElementById('cdSecs');

    if (!cdDays || !cdHours || !cdMins || !cdSecs) return;

    let target = new Date(TARGET_ISO).getTime();
    if (!Number.isFinite(target)) {
      target = new Date(2026, 3, 11, 0, 0, 0).getTime(); // fallback
    }

    const pad2 = (n) => String(n).padStart(2, '0');

    function tick(){
      const now = Date.now();
      let diff = target - now;
      if (diff < 0) diff = 0;

      const d = Math.floor(diff / (1000*60*60*24));
      const h = Math.floor((diff / (1000*60*60)) % 24);
      const m = Math.floor((diff / (1000*60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      cdDays.textContent  = String(d);
      cdHours.textContent = pad2(h);
      cdMins.textContent  = pad2(m);
      cdSecs.textContent  = pad2(s);

      if (cdTitle){
        cdTitle.textContent = diff === 0 ? '¡Hoy nos vemos! 💗' : 'Faltan para volver a vernos 💗';
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  // ==========================
  //  MUSIC: persist between pages (GitHub Pages friendly)
  // ==========================
  let audio = document.getElementById('bgm');
  const playBtn = document.getElementById('playBtn');

  function ensureAudioSource(){
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'bgm';
      audio.preload = 'auto';
      audio.loop = true;
      document.body.appendChild(audio);
    }

    // Si existe <source>, lo ponemos correcto
    const srcEl = audio.querySelector('source');
    if (srcEl) {
      if (srcEl.getAttribute('src') !== AUDIO_SRC) srcEl.setAttribute('src', AUDIO_SRC);
    } else {
      // si no hay <source>, set directo
      audio.src = AUDIO_SRC;
    }
  }

  function setBtn(isPlaying){
    if (!playBtn) return;
    playBtn.textContent = isPlaying ? '⏸' : '▶';
  }

  function saveState(){
    if (!audio) return;
    localStorage.setItem('bgm_playing', audio.paused ? '0' : '1');
    localStorage.setItem('bgm_time', String(audio.currentTime || 0));
  }

  async function startBgm(forcePlay = false){
    ensureAudioSource();

    const t = parseFloat(localStorage.getItem('bgm_time') || '0');
    const p = localStorage.getItem('bgm_playing') || '0';
    const shouldPlay = forcePlay || (p === '1');

    const setTime = () => {
      try { audio.currentTime = Number.isFinite(t) ? t : 0; } catch(e) {}
    };
    if (audio.readyState >= 1) setTime();
    else audio.addEventListener('loadedmetadata', setTime, { once:true });

    if (shouldPlay) {
      try {
        await audio.play();
        setBtn(true);
        localStorage.setItem('bgm_playing', '1');
        saveState();
        return true;
      } catch (e) {
        // Autoplay / iOS: se desbloquea con click del usuario
        setBtn(false);
        localStorage.setItem('bgm_playing', '1'); // intención de reproducir
        saveState();
        return false;
      }
    } else {
      setBtn(false);
      saveState();
      return false;
    }
  }

  // Exponer para tus HTML (sin cambiar nombres de archivos)
  window.__startBgm = startBgm;
  window.__saveBgmState = saveState;

  // Restore al cargar
  ensureAudioSource();
  startBgm(false);

  // Guardar SIEMPRE antes de salir (para que reanude bien)
  window.addEventListener('beforeunload', saveState);

  // Si el navegador bloqueó autoplay, al primer toque intenta arrancar
  const unlock = async () => {
    if (!audio) return;
    const p = localStorage.getItem('bgm_playing') || '0';
    if (p === '1' && audio.paused) {
      try { await audio.play(); setBtn(true); } catch(e) { setBtn(false); }
      saveState();
    }
  };
  document.addEventListener('pointerdown', unlock, { passive:true });

  // Botón play
  if (playBtn && audio) {
    playBtn.addEventListener('click', async () => {
      ensureAudioSource();
      if (audio.paused) {
        await startBgm(true);
      } else {
        audio.pause();
        setBtn(false);
        saveState();
      }
    });
  }

  // ==========================
  //  MODAL: open/close, ESC, scroll lock
  // ==========================
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modalImg');
  const modalBg = document.getElementById('modalBg');
  const modalClose = document.getElementById('modalClose');
  const photos = document.querySelectorAll('img.photo');

  function lockScroll(lock){
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function openModal(src){
    if (!modal || !modalImg || !src) return;
    const safeSrc = encodeURI(src);
    modalImg.src = safeSrc;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    lockScroll(true);
  }

  function closeModal(){
    if (!modal || !modalImg) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    modalImg.removeAttribute('src');
    lockScroll(false);
  }

  if (photos && photos.length) {
    photos.forEach(img => {
      img.addEventListener('click', () => openModal(img.getAttribute('src') || ''));
    });
  }

  if (modalBg) modalBg.addEventListener('click', closeModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // ==========================
  //  INIT countdown after DOM is ready
  // ==========================
  startCountdown();
})();
