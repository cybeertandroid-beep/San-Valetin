(() => {
  const dock = document.getElementById("countdownDock");
  if (!dock) return;

  // ✅ Cambia SOLO esta fecha si quieres (retorno / reencuentro)
  // Formato recomendado: 2026-04-12T00:00:00-05:00
  const fallbackTarget = "2026-04-12T00:00:00-05:00";
  const targetStr = dock.getAttribute("data-target") || fallbackTarget;
  const target = new Date(targetStr);

  const elDays = dock.querySelector('[data-cd="days"]');
  const elHours = dock.querySelector('[data-cd="hours"]');
  const elMins = dock.querySelector('[data-cd="mins"]');
  const elSecs = dock.querySelector('[data-cd="secs"]');

  function pad(n){ return String(n).padStart(2, "0"); }

  function tick(){
    const now = new Date();
    let diff = Math.max(0, target - now);

    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    if (elDays) elDays.textContent = days;
    if (elHours) elHours.textContent = pad(hours);
    if (elMins) elMins.textContent = pad(mins);
    if (elSecs) elSecs.textContent = pad(secs);
  }

  tick();
  setInterval(tick, 1000);
})();
