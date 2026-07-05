// ===== PRELOADER =====
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  setTimeout(() => {
    preloader.classList.add('hidden');
  }, 900);
});

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

// ===== VÍDEO CONTROLADO PELO SCROLL + CARDS SUBINDO POR CIMA =====
// Loop contínuo (em vez de só reagir a eventos de scroll) para ficar bem mais suave.
// Nos primeiros 60% do scroll da seção, o vídeo avança/rebobina.
// Nos 40% finais, os cards sobem por cima do vídeo (que fica parado no fim), um de cada vez.
(function () {
  const video = document.getElementById('scrollVideo');
  const section = document.getElementById('scrollVideoSection');
  const cardsPanel = document.getElementById('scrollCardsPanel');
  const overlay = document.getElementById('scrollVideoOverlay');
  if (!video || !section) return;

  const cards = cardsPanel ? Array.from(cardsPanel.querySelectorAll('.scroll-card')) : [];
  const ctaBtn = cardsPanel ? cardsPanel.querySelector('.btn') : null;
  const staggerItems = ctaBtn ? [...cards, ctaBtn] : cards;

  const VIDEO_PHASE_END = 0.6;
  const CARDS_PHASE_START = 0.55;
  const SMOOTHING = 0.18; // menor = mais suave (e mais "atrasado"), maior = mais direto

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  let smoothedTime = 0;

  function loop() {
    const duration = video.duration;
    const rect = section.getBoundingClientRect();
    const scrollableDistance = section.offsetHeight - window.innerHeight;

    if (scrollableDistance > 0) {
      let progress = (-rect.top) / scrollableDistance;
      progress = clamp(progress, 0, 1);

      if (duration && !isNaN(duration)) {
        const videoProgress = Math.min(progress / VIDEO_PHASE_END, 1);
        const targetTime = videoProgress * duration;
        // suaviza a aproximação até o tempo alvo (evita "pulos" perceptíveis)
        smoothedTime += (targetTime - smoothedTime) * SMOOTHING;
        if (Math.abs(smoothedTime - video.currentTime) > 0.008) {
          video.currentTime = smoothedTime;
        }
      }

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
