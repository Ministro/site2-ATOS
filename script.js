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
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 40);
});

// ===== REVEAL =====
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

// ===== PLANOS =====
function trocarPlanoTab(target, btn) {
  document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const urbano = document.getElementById('planos-urbano');
  const rural = document.getElementById('planos-rural');

  if (!urbano || !rural) return;

  urbano.style.display = target === 'urbano' ? 'grid' : 'none';
  rural.style.display = target === 'rural' ? 'grid' : 'none';
}

// ===== MODAL =====
function abrirModal() {
  const overlay = document.getElementById('modalCadastro');
  if (!overlay) return;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  const overlay = document.getElementById('modalCadastro');
  if (!overlay) return;

  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// fechar modal clicando fora
const modal = document.getElementById('modalCadastro');
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'modalCadastro') fecharModal();
  });
}

// ESC fecha modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharModal();
});

// ======================================================
// 🚨 SCROLL FRAMES (VERSÃO SEGURA)
// ======================================================

(function () {
  const section = document.getElementById('scrollVideoSection');
  const canvas = document.getElementById('scrollCanvas');
  const overlay = document.getElementById('scrollVideoOverlay');
  const cardsPanel = document.getElementById('scrollCardsPanel');

  if (!section || !canvas) return;

  const ctx = canvas.getContext('2d');

  let currentFrame = 1;
  const TOTAL_FRAMES = 200; // 👈 reduzido pra evitar crash (ajusta depois)

  const img = new Image();

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  function getFrame(i) {
    return `assets/frames/scroll-video_${String(i).padStart(6, '0')}.png`;
  }

  function draw(frameIndex) {
    img.src = getFrame(frameIndex);

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );

      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function loop() {
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;

    if (scrollable > 0) {
      const progress = clamp((-rect.top) / scrollable, 0, 1);

      const frame = Math.floor(progress * (TOTAL_FRAMES - 1)) + 1;

      if (frame !== currentFrame) {
        currentFrame = frame;
        draw(currentFrame);
      }

      // cards simples (sem quebrar nada)
      const CARDS_START = 0.6;
      const p = clamp((progress - CARDS_START) / (1 - CARDS_START), 0, 1);

      if (cardsPanel) {
        cardsPanel.style.transform = `translateY(${(1 - p) * 100}%)`;
      }

      if (overlay) {
        overlay.style.opacity = String(1 - p);
      }
    }

    requestAnimationFrame(loop);
  }

  // frame inicial
  draw(1);
  requestAnimationFrame(loop);
})();
