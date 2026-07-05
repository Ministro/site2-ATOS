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
// Nos primeiros 60% do scroll da seção, o vídeo avança/rebobina.
// Nos 40% finais, um painel de cards sobe por cima do vídeo (que fica parado no fim).
(function () {
  const video = document.getElementById('scrollVideo');
  const section = document.getElementById('scrollVideoSection');
  const cardsPanel = document.getElementById('scrollCardsPanel');
  const overlay = document.getElementById('scrollVideoOverlay');
  if (!video || !section) return;

  const VIDEO_PHASE_END = 0.6; // % do scroll dedicado a avançar o vídeo
  const CARDS_PHASE_START = 0.55; // começa um pouco antes, pra transição ficar suave

  let ticking = false;

  function renderScrollVideo() {
    ticking = false;
    const duration = video.duration;

    const rect = section.getBoundingClientRect();
    const scrollableDistance = section.offsetHeight - window.innerHeight;
    if (scrollableDistance <= 0) return;

    let progress = (-rect.top) / scrollableDistance;
    progress = Math.min(Math.max(progress, 0), 1);

    // fase do vídeo
    if (duration && !isNaN(duration)) {
      const videoProgress = Math.min(progress / VIDEO_PHASE_END, 1);
      const targetTime = videoProgress * duration;
      if (Math.abs(video.currentTime - targetTime) > 0.02) {
        video.currentTime = targetTime;
      }
    }

    // fase dos cards subindo por cima
    if (cardsPanel) {
      const cardsProgress = Math.min(Math.max((progress - CARDS_PHASE_START) / (1 - CARDS_PHASE_START), 0), 1);
      cardsPanel.style.transform = `translateY(${(1 - cardsProgress) * 100}%)`;
    }
    if (overlay) {
      const overlayFade = Math.min(Math.max((progress - CARDS_PHASE_START) / 0.2, 0), 1);
      overlay.style.opacity = String(1 - overlayFade);
    }
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(renderScrollVideo);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  video.addEventListener('loadedmetadata', renderScrollVideo);
  video.addEventListener('canplay', renderScrollVideo);
  renderScrollVideo();
})();
