(() => {
  // ==========================
  //  MUSIC: persist between pages + auto-find source
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
    if (audio.currentSrc) localStorage.setItem('bgm_src', audio.currentSrc);
  }

  function unique(arr){
    const seen = new Set();
    return arr.filter(x => (x && !seen.has(x) && seen.add(x)));
  }

  function loadCandidate(url, timeoutMs = 7000){
    return new Promise((resolve, reject) => {
      if (!audio) return reject();

      const onOk = () => cleanup(() => resolve(url));
      const onErr = () => cleanup(() => reject());
      const t = setTimeout(() => cleanup(() => reject()), timeoutMs);

      function cleanup(done){
        clearTimeout(t);
        audio.removeEventListener('canplaythrough', onOk);
        audio.removeEventListener('error', onErr);
        done();
      }

      audio.addEventListener('canplaythrough', onOk, { once:true });
      audio.addEventListener('error', onErr, { once:true });

      audio.src = url;
      audio.load();
    });
  }

  async function ensureAudioSource(){
    if (!audio) return;

    const stored = localStorage.getItem('bgm_src') || '';
    const candidates = unique([
      stored,
      // raíz (con y sin encode)
      "UWAIE%20-%20Kapo%20(Video%20Oficial).mp3",
      "UWAIE - Kapo (Video Oficial).mp3",
      // /audio (con y sin encode)
      "audio/UWAIE%20-%20Kapo%20(Video%20Oficial).mp3",
      "audio/UWAIE - Kapo (Video Oficial).mp3",
    ]);

    // Si ya tiene src válido, no molestamos
    if (audio.currentSrc) return;

    for (const url of candidates){
      try {
        await loadCandidate(url);
        localStorage.setItem('bgm_src', url);
        return;
      } catch(e) {}
    }
  }

  async function restoreState(){
    if (!audio) return;

    await ensureAudioSource();

    const t = parseFloat(localStorage.getItem('bgm_time') || '0');
    const p = localStorage.getItem('bgm_playing') || '0';

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
        // Autoplay bloqueado: usuario debe tocar Play
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
      await ensureAudioSource();

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
  //  MODAL: (solo en Recuerdos)
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
    modalImg.src = encodeURI(src);
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
})();
