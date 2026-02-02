(function(){
  const TARGET = new Date("2026-04-11T12:00:00-05:00").getTime();

  function pad(n){ return String(n).padStart(2,'0'); }
  function fmt(ms){
    if (ms <= 0) return {done:true, d:0, h:0, m:0, s:0};
    const total = Math.floor(ms/1000);
    const d = Math.floor(total/86400);
    const h = Math.floor((total%86400)/3600);
    const m = Math.floor((total%3600)/60);
    const s = total%60;
    return {done:false, d, h, m, s};
  }

  function render(){
    const t = fmt(TARGET - Date.now());

    // Fallback texto (por si acaso)
    document.querySelectorAll("[data-countdown-badge]").forEach(el=>{
      el.innerHTML = t.done
        ? `¡Hoy nos vemos! 💗`
        : `Faltan <b>${t.d}</b>d <b>${pad(t.h)}</b>h <b>${pad(t.m)}</b>m <b>${pad(t.s)}</b>s ✨`;
    });

    // Dock grande (reloj)
    const d = document.getElementById("dock_d");
    const h = document.getElementById("dock_h");
    const m = document.getElementById("dock_m");
    const s = document.getElementById("dock_s");

    if(d && h && m && s){
      d.textContent = String(t.d);
      h.textContent = pad(t.h);
      m.textContent = pad(t.m);
      s.textContent = pad(t.s);
    }

    // Contador en carta (si existe)
    const box = document.getElementById("countdownBox");
    if (box){
      const dEl = document.getElementById("cd_d");
      const hEl = document.getElementById("cd_h");
      const mEl = document.getElementById("cd_m");
      const sEl = document.getElementById("cd_s");
      const msg = document.getElementById("cd_msg");

      if (t.done){
        box.classList.add("done");
        if(dEl) dEl.textContent = "0";
        if(hEl) hEl.textContent = "00";
        if(mEl) mEl.textContent = "00";
        if(sEl) sEl.textContent = "00";
        if(msg) msg.textContent = "Hoy volvemos a vernos 💗";
      }else{
        if(dEl) dEl.textContent = String(t.d);
        if(hEl) hEl.textContent = pad(t.h);
        if(mEl) mEl.textContent = pad(t.m);
        if(sEl) sEl.textContent = pad(t.s);
        if(msg) msg.textContent = "11 de abril: te espero con ganas y con amor 💗";
      }
    }
  }

  render();
  setInterval(render, 1000);
})();
