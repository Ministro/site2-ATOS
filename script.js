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
