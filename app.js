(() => {
  // ==========================
  //  HELPERS
  // ==========================
  const $ = (id) => document.getElementById(id);

  // ==========================
  //  MUSIC: persist between pages
  //  - Autoplay suele estar bloqueado:
  //    Se habilita en el PRIMER click/tap del usuario en cualquier parte.
  // ==========================
  const audio = $('bgm');
  const playBtn = $('playBtn');

  function setBtn(isPlaying){
    if (!playBtn) return;
    playBtn.textContent = isPlaying ? '⏸' : '▶';
  }

  function saveState(){
    if (!audio) return;
    localStorage.setItem('bgm_playing', audio.paused ? '0' : '1');
    localStorage.setItem('bgm_time', String(audio.currentTime || 0));
  }

  async function tryPlay(){
    if (!audio) return false;
    try {
      await audio.play();
      setBtn(true);
      saveState();
      return true;
    } catch (e) {
      setBtn(false);
      saveState();
      return false;
    }
  }

  function restoreTime(){
    if (!audio) return;
    const t = parseFloat(localStorage.getItem('bgm_time') || '0');
    const setTime = () => { try { audio.currentTime = isFinite(t) ? t : 0; } catch(e) {} };
    if (audio.readyState >= 1) setTime();
    else audio.addEventListener('loadedmetadata', setTime, { once:true });
  }

  async function restoreState(){
    if (!audio) return;

    restoreTime();

    const wants = localStorage.getItem('bgm_playing') || '0';

    // Si el usuario ya había dado play antes, intentamos reproducir.
    if (wants === '1') {
      await tryPlay();
    } else {
      setBtn(false);
    }
  }

  if (audio) {
    restoreState();
    ['timeupdate','pause','play','seeking','seeked'].forEach(ev => audio.addEventListener(ev, saveState));
  }

  if (playBtn && audio) {
    playBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (audio.paused) await tryPlay();
      else { audio.pause(); setBtn(false); saveState(); }
    });
  }

  // IMPORTANTE: desbloquea autoplay con el primer gesto
  // (click/tap/tecla). Así ya suena sí o sí cuando interactúe.
  const unlockOnce = async () => {
    if (!audio) return;
    const wants = localStorage.getItem('bgm_playing') || '0';
    // Si el usuario no había tocado play antes, igual lo intentamos suavemente
    // para que suene al entrar (tu caso).
    if (wants === '0') localStorage.setItem('bgm_playing', '1');
    await tryPlay();
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce, { once:true });
  window.addEventListener('keydown', unlockOnce, { once:true });

  // ==========================
  //  MODAL: open/close, ESC, scroll lock
  // ==========================
  const modal = $('modal');
  const modalImg = $('modalImg');
  const modalBg = $('modalBg');
  const modalClose = $('modalClose');
  const photos = document.querySelectorAll('img.photo');

  function lockScroll(lock){
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function openModal(src){
    if (!modal || !modalImg) return;
    const safeSrc = encodeURI(src || '');
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
  //  COUNTDOWN: en todas las páginas (si existen IDs)
  // ==========================
  const cdDays = $('cdDays');
  const cdHours = $('cdHours');
  const cdMins = $('cdMins');
  const cdSecs = $('cdSecs');

  if (cdDays && cdHours && cdMins && cdSecs) {
    // 11 Abril 2026 00:00:00 hora local
    const target = new Date(2026, 3, 11, 0, 0, 0).getTime();

    const pad2 = (n) => String(n).padStart(2,'0');

    function tick(){
      const now = Date.now();
      let diff = target - now;
      if (diff < 0) diff = 0;

      const d = Math.floor(diff / (1000*60*60*24));
      const h = Math.floor((diff / (1000*60*60)) % 24);
      const m = Math.floor((diff / (1000*60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      cdDays.textContent = d;
      cdHours.textContent = pad2(h);
      cdMins.textContent = pad2(m);
      cdSecs.textContent = pad2(s);
    }

    tick();
    setInterval(tick, 1000);
  }
})();
