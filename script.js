// ===== HEADER SCROLL =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
});

// ===== REVEAL ON SCROLL =====
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// ===== PLAN TABS (Urbano / Rural) =====
function trocarPlanoTab(target, btn) {
  document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('planos-urbano').style.display = target === 'urbano' ? 'grid' : 'none';
  document.getElementById('planos-rural').style.display = target === 'rural' ? 'grid' : 'none';
}

// ===== PRELOADER (espera os primeiros frames carregarem) =====
const preloaderProgressEl = document.getElementById('preloaderProgress');
let framesReadyForPreloader = false;
let pageLoaded = false;

function tryHidePreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  if (pageLoaded && framesReadyForPreloader) {
    preloader.classList.add('hidden');
  }
}
window.addEventListener('load', () => {
  pageLoaded = true;
  setTimeout(tryHidePreloader, 400); // segura um mínimo pra animação da logo aparecer
});
// trava de segurança: nunca deixa o preloader preso pra sempre
setTimeout(() => { framesReadyForPreloader = true; tryHidePreloader(); }, 6000);

// ===== SEQUÊNCIA DE IMAGENS CONTROLADA PELO SCROLL + CARDS SUBINDO POR CIMA =====
// Os frames ficam em assets/frames/scroll-video_000001.webp até scroll-video_0000XX.webp
// >>> AJUSTE ESSE NÚMERO para a quantidade real de frames que você gerar <<<
(function () {
  const canvas = document.getElementById('scrollCanvas');
  const section = document.getElementById('scrollVideoSection');
  const cardsPanel = document.getElementById('scrollCardsPanel');
  const overlay = document.getElementById('scrollVideoOverlay');
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d');

  const FRAME_COUNT = 120; // <-- troque para o número de frames que você gerar
  const FRAME_PATH = (i) => `assets/frames/scroll-video_${String(i).padStart(6, '0')}.webp`;
  const PREFETCH_RADIUS = 12; // quantos frames pra frente/trás ficam sempre pré-carregados

  const images = new Array(FRAME_COUNT).fill(null);
  const requested = new Array(FRAME_COUNT).fill(false);
  let loadedCount = 0;

  function updateProgressText() {
    if (!preloaderProgressEl) return;
    const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
    preloaderProgressEl.textContent = `Carregando... ${pct}%`;
  }

  // carrega só o frame pedido (uma vez), em vez de todos de uma vez
  function ensureLoaded(index) {
    const idx = index - 1;
    if (idx < 0 || idx >= FRAME_COUNT || requested[idx]) return;
    requested[idx] = true;
    const img = new Image();
    img.onload = img.onerror = () => {
      images[idx] = img;
      loadedCount++;
      updateProgressText();
      if (index === 1) {
        draw(1);
        framesReadyForPreloader = true;
        tryHidePreloader();
      }
    };
    img.src = FRAME_PATH(index);
  }

  function prefetchAround(index) {
    for (let d = -PREFETCH_RADIUS; d <= PREFETCH_RADIUS; d++) {
      ensureLoaded(index + d);
    }
  }

  // preenchimento em segundo plano (baixa prioridade), pra quando o usuário rolar rápido
  // o restante dos frames já esteja mais adiantado no cache
  let bgIndex = 1;
  function backgroundFill() {
    if (bgIndex > FRAME_COUNT) return;
    ensureLoaded(bgIndex);
    bgIndex++;
    (window.requestIdleCallback || ((cb) => setTimeout(cb, 60)))(backgroundFill);
  }

  ensureLoaded(1); // primeiro frame carrega imediatamente (aparece rápido)
  prefetchAround(1);
  setTimeout(backgroundFill, 1200); // resto carrega devagar, sem competir com o carregamento inicial
  updateProgressText();

  let lastDrawnIndex = 1;
  function draw(index) {
    let img = images[index - 1];
    if (!img) {
      ensureLoaded(index); // pediu um frame que ainda não chegou: dispara o carregamento dele
      index = lastDrawnIndex;
      img = images[index - 1];
      if (!img) return;
    } else {
      lastDrawnIndex = index;
    }

    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih); // comportamento tipo object-fit:cover
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    draw(lastDrawnIndex);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const cards = cardsPanel ? Array.from(cardsPanel.querySelectorAll('.scroll-card')) : [];
  const ctaBtn = cardsPanel ? cardsPanel.querySelector('.btn') : null;
  const staggerItems = ctaBtn ? [...cards, ctaBtn] : cards;

  const VIDEO_PHASE_END = 0.6;
  const CARDS_PHASE_START = 0.55;
  const SMOOTHING = 0.18;

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  let smoothedProgress = 0;

  function loop() {
    const rect = section.getBoundingClientRect();
    const scrollableDistance = section.offsetHeight - window.innerHeight;

    if (scrollableDistance > 0) {
      let progress = (-rect.top) / scrollableDistance;
      progress = clamp(progress, 0, 1);

      const videoProgress = Math.min(progress / VIDEO_PHASE_END, 1);
      smoothedProgress += (videoProgress - smoothedProgress) * SMOOTHING;
      const frameIndex = clamp(Math.round(smoothedProgress * (FRAME_COUNT - 1)) + 1, 1, FRAME_COUNT);
      draw(frameIndex);
      prefetchAround(frameIndex);

      const cardsProgress = clamp((progress - CARDS_PHASE_START) / (1 - CARDS_PHASE_START), 0, 1);
      if (cardsPanel) {
        cardsPanel.style.transform = `translateY(${(1 - cardsProgress) * 100}%)`;
      }
      staggerItems.forEach((el, i) => {
        const start = i * 0.15;
        const local = clamp((cardsProgress - start) / (1 - start), 0, 1);
        el.style.opacity = local;
        el.style.transform = `translateY(${(1 - local) * 30}px)`;
      });
      if (overlay) {
        const overlayFade = clamp((progress - CARDS_PHASE_START) / 0.2, 0, 1);
        overlay.style.opacity = String(1 - overlayFade);
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

// ===== MODAL DE CADASTRO =====
function abrirModal() {
  const overlay = document.getElementById('modalCadastro');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (typeof initMapa === 'function') {
    setTimeout(initMapa, 300);
  }
}
function fecharModal() {
  document.getElementById('modalCadastro').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('modalCadastro').addEventListener('click', (e) => {
  if (e.target.id === 'modalCadastro') fecharModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharModal();
});
