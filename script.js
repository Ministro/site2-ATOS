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
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => io.observe(el));

// ===== PLAN TABS =====
function trocarPlanoTab(target, btn) {
  document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('planos-urbano').style.display = target === 'urbano' ? 'grid' : 'none';
  document.getElementById('planos-rural').style.display = target === 'rural' ? 'grid' : 'none';
}

// ===== MODAL =====
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

// ======================================================
// 🚀 SCROLL FRAME ANIMATION (SUBSTITUI O VÍDEO)
// ======================================================

(function () {
  const section = document.getElementById('scrollVideoSection');
  const canvas = document.getElementById('scrollCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const cardsPanel = document.getElementById('scrollCardsPanel');
  const overlay = document.getElementById('scrollVideoOverlay');

  if (!section || !canvas || !ctx) return;

  const TOTAL_FRAMES = 722;
  const framePath = (i) =>
    `assets/frames/scroll-video_${String(i).padStart(6, '0')}.png`;

  const frames = [];
  let loaded = 0;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // ===== PRELOAD FRAMES =====
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = framePath(i);

    img.onload = () => {
      loaded++;
    };

    frames.push(img);
  }

  function drawFrame(index) {
    const img = frames[index];
    if (!img || !img.complete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = Math.max(
      canvas.width / img.width,
      canvas.height / img.height
    );

    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;

    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }

  let currentFrame = 0;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function loop() {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;

    if (scrollable > 0) {
      let progress = clamp((-rect.top) / scrollable, 0, 1);

      // converte scroll → frame
      currentFrame = Math.floor(progress * (TOTAL_FRAMES - 1));

      drawFrame(currentFrame);

      // ===== CARDS SUBINDO =====
      const CARDS_START = 0.55;
      const cardsProgress = clamp((progress - CARDS_START) / (1 - CARDS_START), 0, 1);

      if (cardsPanel) {
        cardsPanel.style.transform = `translateY(${(1 - cardsProgress) * 100}%)`;
      }

      const items = cardsPanel
        ? Array.from(cardsPanel.querySelectorAll('.scroll-card, .btn'))
        : [];

      items.forEach((el, i) => {
        const start = i * 0.15;
        const local = clamp((cardsProgress - start) / (1 - start), 0, 1);

        el.style.opacity = local;
        el.style.transform = `translateY(${(1 - local) * 30}px)`;
      });

      // overlay fade
      if (overlay) {
        overlay.style.opacity = String(1 - cardsProgress);
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
