(() => {
  // 11 Abril 2026 00:00:00 hora Perú (-05:00)
  const TARGET = new Date("2026-04-11T00:00:00-05:00").getTime();

  const cdDays  = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMins  = document.getElementById('cdMins');
  const cdSecs  = document.getElementById('cdSecs');

  if (!cdDays || !cdHours || !cdMins || !cdSecs) return;

  const pad2 = (n) => String(n).padStart(2, '0');

  function tick(){
    let diff = TARGET - Date.now();
    if (diff < 0) diff = 0;

    const d = Math.floor(diff / (1000*60*60*24));
    const h = Math.floor((diff / (1000*60*60)) % 24);
    const m = Math.floor((diff / (1000*60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    cdDays.textContent  = String(d);
    cdHours.textContent = pad2(h);
    cdMins.textContent  = pad2(m);
    cdSecs.textContent  = pad2(s);
  }

  tick();
  setInterval(tick, 1000);
})();
