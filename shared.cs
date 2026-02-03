:root{
  --bg-solid:#fdecef;
  --ink:#2b2b2b;
  --pink:#ff5e91;
  --pink-2:#ff7faa;
  --card:#fff7f9;

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --topbar-space: 0px; /* lo calcula JS */
}

html, body{
  height:100%;
  background: var(--bg-solid) !important;
}

body{
  margin:0;
  color:var(--ink);
  overflow-x:hidden;
  padding-top: calc(var(--topbar-space) + 10px);
}

/* Fondo uniforme (sin “dos colores”) */
body::before{
  content:"";
  position:fixed;
  inset:0;
  z-index:-2;
  pointer-events:none;
  background:
    radial-gradient(1200px 700px at 15% 10%, rgba(255, 94, 145, .22), transparent 55%),
    radial-gradient(900px 600px at 85% 30%, rgba(255, 164, 188, .18), transparent 55%),
    linear-gradient(180deg, #fdecef 0%, #fdecef 100%);
}

.bg, .page, main, .container{
  background: transparent !important;
}

/* =========================
   TOPBAR (CONTADOR) — FIXED
   ========================= */
#topbar{
  position:fixed;
  top: calc(10px + var(--safe-top));
  left: 12px;
  z-index: 9999;
  width: min(92vw, 360px);
}

@media (max-width: 520px){
  #topbar{
    left: 50%;
    transform: translateX(-50%);
    width: min(94vw, 420px);
  }
}

.countdown{
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(255,255,255,.7);
  border-radius: 18px;
  padding: 10px 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.10);
  backdrop-filter: blur(10px);
}

.countdown__title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  font-weight: 800;
  font-size: 13px;
  line-height: 1.2;
  margin-bottom: 8px;
}

.countdown__title .heart{
  font-size: 18px;
  color: var(--pink);
}

.countdown__grid{
  display:grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cd-box{
  background: rgba(255,255,255,.9);
  border: 1px solid rgba(255, 94, 145, .12);
  border-radius: 14px;
  padding: 8px 6px;
  text-align:center;
}

.cd-box strong{
  display:block;
  font-size: 20px;
  color: var(--pink);
  line-height: 1;
}

.cd-box small{
  display:block;
  font-size: 11px;
  opacity:.8;
  margin-top: 4px;
  letter-spacing: .6px;
}

@media (max-width: 380px){
  .cd-box strong{ font-size: 18px; }
  .countdown__title{ font-size: 12px; }
}

/* =========================
   PLAYER ABAJO (NO ESTORBA)
   ========================= */
#playerDock{
  position:fixed;
  right: 14px;
  bottom: calc(14px + var(--safe-bottom));
  z-index: 9999;
  display:flex;
  align-items:center;
  gap:10px;
  pointer-events:none; /* NO bloquea scroll */
}

.player-pill{
  pointer-events:auto; /* solo esto clickeable */
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 12px;
  border-radius: 18px;
  background: rgba(255,255,255,.82);
  border: 1px solid rgba(255,255,255,.75);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0,0,0,.12);
  user-select:none;
  -webkit-tap-highlight-color: transparent;
}

.player-btn{
  width: 44px;
  height: 44px;
  border:none;
  border-radius: 14px;
  cursor:pointer;
  background: linear-gradient(135deg, var(--pink), var(--pink-2));
  color:white;
  display:grid;
  place-items:center;
  font-size: 18px;
}

.player-text{
  font-weight: 800;
  font-size: 13px;
  line-height: 1.1;
  white-space: nowrap;
}

@media (max-width: 520px){
  #playerDock{
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }
}

/* Al abrir modal: ocultar dock + contador */
body.modal-open #playerDock,
body.modal-open #topbar{
  opacity:0;
  pointer-events:none;
}

/* =========================
   Corazones dentro de la carta
   ========================= */
.letter{
  position: relative;
  overflow:hidden;
}
.letter::before{
  content:"";
  position:absolute;
  inset:0;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255,94,145,.12) 0 2px, transparent 3px),
    radial-gradient(circle at 80% 30%, rgba(255,94,145,.10) 0 2px, transparent 3px),
    radial-gradient(circle at 30% 80%, rgba(255,94,145,.10) 0 2px, transparent 3px);
  opacity:.8;
  pointer-events:none;
}
.letter::after{
  content:"💗";
  position:absolute;
  right: 14px;
  top: 12px;
  font-size: 18px;
  opacity: .95;
}

/* =========================
   MODAL DE FOTOS (FIX iOS)
   ========================= */
#lightbox{
  position:fixed;
  inset:0;
  z-index: 99999;
  background: rgba(0,0,0,.55);
  display:none;
  overflow:auto;
  -webkit-overflow-scrolling: touch;
}

#lightbox.open{ display:block; }

.lb-inner{
  min-height: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: calc(60px + var(--safe-top)) 14px calc(90px + var(--safe-bottom)) 14px;
}

.lb-img{
  max-width: min(92vw, 980px);
  max-height: 78vh;
  width:auto;
  height:auto;
  border-radius: 16px;
  box-shadow: 0 14px 50px rgba(0,0,0,.35);
  object-fit: contain;
  background: rgba(255,255,255,.08);
}

.lb-close{
  position:fixed;
  top: calc(12px + var(--safe-top));
  right: 12px;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.5);
  background: rgba(255,255,255,.85);
  cursor:pointer;
  font-size: 22px;
  display:grid;
  place-items:center;
}
