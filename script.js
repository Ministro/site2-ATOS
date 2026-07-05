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
// Os frames ficam em assets/frames/scroll-video_000001.png até scroll-video_000722.png
(function () {
  const canvas = document.getElementById('scrollCanvas');
  const section = document.getElementById('scrollVideoSection');
  const cardsPanel = document.getElementById('scrollCardsPanel');
  const overlay = document.getElementById('scrollVideoOverlay');
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d');

  const FRAME_COUNT = 722;
  const FRAME_PATH = (i) => `assets/frames/scroll-video_${String(i).padStart(6, '0')}.png`;
  const MIN_FRAMES_BEFORE_READY = Math.min(40, FRAME_COUNT);

  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;

  function updateProgressText() {
    if (!preloaderProgressEl) return;
    const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
    preloaderProgressEl.textContent = `Carregando... ${pct}%`;
  }

  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.src = FRAME_PATH(i);
    img.onload = img.onerror = () => {
      loadedCount++;
      updateProgressText();
      if (loadedCount === 1) draw(1);
      if (loadedCount >= MIN_FRAMES_BEFORE_READY) {
        framesReadyForPreloader = true;
        tryHidePreloader();
      }
    };
    images[i - 1] = img;
  }
  updateProgressText();

  let lastDrawnIndex = 1;
  function draw(index) {
    let img = images[index - 1];
    if (!img || !img.complete || img.naturalWidth === 0) {
      index = lastDrawnIndex;
      img = images[index - 1];
      if (!img || !img.complete || img.naturalWidth === 0) return;
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
