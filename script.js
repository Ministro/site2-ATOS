// ===== FAIXA COM NOMES DAS REGIÕES (carrossel infinito) =====
(function () {
  const track = document.getElementById("regiaoMarqueeTrack");
  if (!track) return;

  const regioes = [
    "Candeias do Jamari",
    "Setor chacareiro Após Cemitério",
    "Setor chacareiro Antes do Cemitério",
    "Green-PK",
    "Pamus",
    "55A",
    "55B",
    "BR 364-Cuiba",
    "BR 364-PVH",
    "Rancho Alegre",
    "BR 364 (Cuiabá, Após o Silos)",
    "BR 364 KM 50 (Cinquentinha)",
    "Corpo Dourado",
    "Santa Luzia",
    "Setor Industrial PVH",
    "Bacia Leiteira Bom Jesus",
    "Bacia Leiteira Ramal do Boto",
    "Bacia Leiteira Ramal da Fortuna",
    "Bairro 13 / Castanheiras",
    "3 Piquiás",
    "Bairro Novo de Candeias",
    "Linha do Caju",
  ];

  const REPEATS = 3; // repete a lista pra garantir loop sem espaço vazio em telas largas
  let html = "";
  for (let r = 0; r < REPEATS; r++) {
    regioes.forEach((nome) => {
      html += `<span class="regiao-pill">${nome}</span>`;
    });
  }
  track.innerHTML = html;
})();

// ===== MENU MOBILE (hamburguer) =====
function toggleMobileMenu() {
  document.getElementById("mobileMenu").classList.toggle("open");
}
function fecharMobileMenu() {
  document.getElementById("mobileMenu").classList.remove("open");
}

// ===== HEADER SCROLL =====
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 40);
});

// ===== REVEAL ON SCROLL =====
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.50 }
);
revealEls.forEach((el) => io.observe(el));

// ===== CONTAGEM ANIMADA DOS NÚMEROS (Resultados) =====
function animarContagem(el) {
  const target = parseInt(el.dataset.target, 10) || 0;
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const duration = 2700;
  const start = performance.now();

  function passo(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out, sobe rápido no começo
    const current = Math.round(target * eased);
    el.textContent = prefix + current + suffix;
    if (progress < 1) requestAnimationFrame(passo);
    else el.textContent = prefix + target + suffix;
  }
  requestAnimationFrame(passo);
}
const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animarContagem(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);
document
  .querySelectorAll(".stat-num[data-target]")
  .forEach((el) => statObserver.observe(el));

// ===== PLAN TABS (Urbano / Rural) =====
function trocarPlanoTab(target, btn) {
  document
    .querySelectorAll(".plan-tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("planos-urbano").style.display =
    target === "urbano" ? "grid" : "none";
  document.getElementById("planos-rural").style.display =
    target === "rural" ? "grid" : "none";
}

// ===== PRELOADER (espera os primeiros frames carregarem) =====
const preloaderProgressEl = document.getElementById("preloaderProgress");
let framesReadyForPreloader = false;
let pageLoaded = false;

function tryHidePreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;
  if (pageLoaded && framesReadyForPreloader) {
    preloader.classList.add("hidden");
  }
}
window.addEventListener("load", () => {
  pageLoaded = true;
  setTimeout(tryHidePreloader, 400); // segura um mínimo pra animação da logo aparecer
});
// trava de segurança: nunca deixa o preloader preso pra sempre
setTimeout(() => {
  framesReadyForPreloader = true;
  tryHidePreloader();
}, 6000);

// ===== SEQUÊNCIA DE IMAGENS CONTROLADA PELO SCROLL + CARDS SUBINDO POR CIMA =====
// Os frames ficam em assets/frames/scroll-video_000001.webp até scroll-video_0000XX.webp
// >>> AJUSTE ESSE NÚMERO para a quantidade real de frames que você gerar <<<
(function () {
  const canvas = document.getElementById("scrollCanvas");
  const section = document.getElementById("scrollVideoSection");
  const cardsPanel = document.getElementById("scrollCardsPanel");
  if (!canvas || !section) return;
  const ctx = canvas.getContext("2d");

  const FRAME_COUNT = 150; // <-- troque para o número de frames que você gerar
  const FRAME_PATH = (i) =>
    `assets/frames/scroll-video_${String(i).padStart(6, "0")}.webp`;
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
    (window.requestIdleCallback || ((cb) => setTimeout(cb, 60)))(
      backgroundFill
    );
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

    const cw = canvas.width,
      ch = canvas.height;
    const iw = img.naturalWidth,
      ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih); // comportamento tipo object-fit:cover
    const dw = iw * scale,
      dh = ih * scale;
    const dx = (cw - dw) / 2,
      dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    draw(lastDrawnIndex);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  const heroLayer = document.getElementById("heroLayer");
  const cards = cardsPanel
    ? Array.from(cardsPanel.querySelectorAll(".scroll-card"))
    : [];
  const ctaBtn = cardsPanel ? cardsPanel.querySelector(".btn") : null;
  const staggerItems = ctaBtn ? [...cards, ctaBtn] : cards;

  const HERO_FADE_END = 0.12; // % do scroll em que o hero termina de desaparecer
  const CARDS_PHASE_START = 0.55;
  const SMOOTHING = 0.18;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  let smoothedProgress = 0;
  let heroInteractive = true;

  function loop() {
    const rect = section.getBoundingClientRect();
    const scrollableDistance = section.offsetHeight - window.innerHeight;

    if (scrollableDistance > 0) {
      let progress = -rect.top / scrollableDistance;
      progress = clamp(progress, 0, 1);

      // o vídeo avança do início ao fim do scroll da seção e NUNCA para
      smoothedProgress += (progress - smoothedProgress) * SMOOTHING;
      const frameIndex = clamp(
        Math.round(smoothedProgress * (FRAME_COUNT - 1)) + 1,
        1,
        FRAME_COUNT
      );
      draw(frameIndex);
      prefetchAround(frameIndex);

      // hero desaparece suavemente logo no início, revelando o vídeo
      if (heroLayer) {
        const heroFade = clamp(progress / HERO_FADE_END, 0, 1);
        heroLayer.style.opacity = String(1 - heroFade);
        heroLayer.style.transform = `translateY(${heroFade * -40}px)`;
        const shouldBeInteractive = heroFade < 0.5;
        if (shouldBeInteractive !== heroInteractive) {
          heroInteractive = shouldBeInteractive;
          heroLayer.style.pointerEvents = heroInteractive ? "auto" : "none";
        }
      }

      // cards sobem por cima do vídeo (que continua rodando por baixo)
      const cardsProgress = clamp(
        (progress - CARDS_PHASE_START) / (1 - CARDS_PHASE_START),
        0,
        1
      );
      if (cardsPanel) {
        cardsPanel.style.transform = `translateY(${
          (1 - cardsProgress) * 100
        }%)`;
      }
      staggerItems.forEach((el, i) => {
        const start = i * 0.15;
        const local = clamp((cardsProgress - start) / (1 - start), 0, 1);
        el.style.opacity = local;
        el.style.transform = `translateY(${(1 - local) * 30}px)`;
      });
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

// ===== SISTEMA GENÉRICO DE MODAIS =====
function abrirModalGenerico(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  if (id === "modalCadastro" && typeof initMapa === "function") {
    setTimeout(initMapa, 300);
  }
}
function fecharModalGenerico(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove("open");
  const algumAberto =
    document.querySelectorAll(".modal-overlay.open").length > 0;
  if (!algumAberto) document.body.style.overflow = "";
}
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fecharModalGenerico(overlay.id);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document
      .querySelectorAll(".modal-overlay.open")
      .forEach((overlay) => fecharModalGenerico(overlay.id));
  }
});

// aliases para manter compatibilidade com os botões já existentes ("Seja nosso cliente")
function abrirModal() {
  abrirModalGenerico("modalCadastro");
}
function fecharModal() {
  fecharModalGenerico("modalCadastro");
}
