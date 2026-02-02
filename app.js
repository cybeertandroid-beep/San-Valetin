(() => {
  // ==========================
  //  MUSIC: persist between pages
  // ==========================
  const audio = document.getElementById('bgm');
  const playBtn = document.getElementById('playBtn');

  function setBtn(isPlaying){
    if (!playBtn) return;
    playBtn.textContent = isPlaying ? '⏸' : '▶';
  }

  function saveState(){
    if (!audio) return;
    localStorage.setItem('bgm_playing', audio.paused ? '0' : '1');
    localStorage.setItem('bgm_time', String(audio.currentTime || 0));
  }

  async function restoreState(){
    if (!audio) return;
    const t = parseFloat(localStorage.getItem('bgm_time') || '0');
    const p = localStorage.getItem('bgm_playing') || '0';

    // Set time (may fail until metadata loaded; retry on loadedmetadata)
    const setTime = () => {
      try { audio.currentTime = isFinite(t) ? t : 0; } catch(e) {}
    };
    if (audio.readyState >= 1) setTime();
    else audio.addEventListener('loadedmetadata', setTime, { once:true });

    if (p === '1') {
      try {
        await audio.play();
        setBtn(true);
      } catch (e) {
        // Autoplay blocked: user must tap play
        setBtn(false);
      }
    } else {
      setBtn(false);
    }
  }

  if (audio) {
    restoreState();
    ['timeupdate','pause','play'].forEach(ev => audio.addEventListener(ev, saveState));
  }

  if (playBtn && audio) {
    playBtn.addEventListener('click', async () => {
      if (audio.paused) {
        try { await audio.play(); setBtn(true); } catch(e){ setBtn(false); }
      } else {
        audio.pause();
        setBtn(false);
      }
      saveState();
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
    if (!modal || !modalImg) return;
    // Asegura encode por si viene con espacios (fallback)
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
  //  COUNTDOWN: only if elements exist (Recuerdos)
  // ==========================
  const cdDays = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMins = document.getElementById('cdMins');
  const cdSecs = document.getElementById('cdSecs');

  if (cdDays && cdHours && cdMins && cdSecs) {
    // 11 Abril 2026 00:00:00 hora local (ajústalo si quieres otra hora)
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
