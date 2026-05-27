/* ═══════════════════════════════════════════════════════════════
   MEDSYNC – CONNECTED HEALTH  |  Main JS
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── HELPERS ─────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const raf = fn => requestAnimationFrame(fn);

/* ── SCROLL PROGRESS ─────────────────────────────────────────── */
let ticking = false;
let lastScrollY = 0;

function onScroll() {
  lastScrollY = window.scrollY;
  if (!ticking) {
    raf(() => {
      handleScroll(lastScrollY);
      ticking = false;
    });
    ticking = true;
  }
}

function handleScroll(scrollY) {
  // Nav scrolled state
  const nav = $('#nav');
  if (nav) {
    nav.classList.toggle('scrolled', scrollY > 40);
  }

  // Parallax hero orbs
  const orbs = $$('.hero__orb');
  orbs.forEach((orb, i) => {
    const speed = [0.08, 0.05, 0.04][i] || 0.04;
    orb.style.transform = `translateY(${scrollY * speed}px)`;
  });

  // Scroll indicator fade
  const scrollInd = $('.hero__scroll');
  if (scrollInd) {
    scrollInd.style.opacity = Math.max(0, 1 - scrollY / 200);
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ── INTERSECTION OBSERVER (animate on scroll) ───────────────── */
const observerOptions = {
  root: null,
  rootMargin: '0px 0px -60px 0px',
  threshold: 0.1
};

const animObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, idx) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = parseInt(el.dataset.delay || 0, 10);
      setTimeout(() => el.classList.add('in-view'), delay);
      animObserver.unobserve(el);
    }
  });
}, observerOptions);

function initAnimations() {
  $$('[data-animate]').forEach(el => animObserver.observe(el));
}

/* ── HERO CANVAS PARTICLE SWARM ──────────────────────────────── */
function initCanvas() {
  const canvas = $('#hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, animId;
  const particles = [];

  const COUNT       = window.innerWidth < 768 ? 100 : 250;
  const CURSOR_R    = 160;  // raio de órbita ao redor do cursor
  const FOLLOW_DIST = 250;  // distância para começar a seguir
  const EASE        = 0.05;
  const AURA_R      = 280;

  const PALETTE = [
    [14,  165, 233],
    [16,  185, 129],
    [56,  189, 248],
    [52,  211, 153],
    [99,  102, 241],
    [168, 85,  247],
  ];

  const mouse = { x: -1, y: -1, active: false };
  const hero = canvas.closest('.hero') || canvas.parentElement;
  hero.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });
  hero.addEventListener('mouseleave', () => { mouse.active = false; });

  class Particle {
    constructor(i, total) {
      this.homeX = Math.random() * W;
      this.homeY = Math.random() * H;
      this.x = this.homeX;
      this.y = this.homeY;
      this.orbitAngle   = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 1.5;
      this.radiusOffset = (Math.random() - 0.5) * 100;
      this.orbitSpeed   = (Math.random() * 0.01 + 0.003) * (Math.random() < 0.5 ? 1 : -1);
      this.baseLen = Math.random() * 2.5 + 1;
      this.len     = this.baseLen;
      this.width   = this.baseLen;
      this.rgb     = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      this.baseAlpha = Math.random() * 0.25 + 0.45;
      this.alpha   = this.baseAlpha;
      this.rot     = Math.random() * Math.PI * 2;
      // pulso individual: fase e velocidade únicos por partícula
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.04 + 0.02;
    }

    update() {
      let tx, ty, targetRot;

      if (mouse.active) {
        const dx   = this.homeX - mouse.x;
        const dy   = this.homeY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < FOLLOW_DIST) {
          // próximo: orbita ao redor do cursor
          this.orbitAngle += this.orbitSpeed;
          const r = CURSOR_R + this.radiusOffset;
          tx = mouse.x + Math.cos(this.orbitAngle) * r;
          ty = mouse.y + Math.sin(this.orbitAngle) * r;
        } else {
          // longe: fica em casa
          tx = this.homeX;
          ty = this.homeY;
        }
        // aponta em direção ao mouse independente da distância
        targetRot = Math.atan2(mouse.y - this.y, mouse.x - this.x);
      } else {
        tx = this.homeX;
        ty = this.homeY;
        targetRot = this.rot + 0.005;
      }

      this.x += (tx - this.x) * EASE;
      this.y += (ty - this.y) * EASE;

      // pulso: tamanho e opacidade oscilam de forma independente
      this.pulsePhase += this.pulseSpeed;
      const pulse = Math.sin(this.pulsePhase);
      const pv   = (pulse + 1) / 2;
      this.len   = this.baseLen * (0.4 + 0.6 * pv);
      this.alpha = this.baseAlpha * (0.5 + 0.5 * pv);

      let da = targetRot - this.rot;
      if (da >  Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      this.rot += da * 0.08;
    }

    draw() {
      const [r, g, b] = this.rgb;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.len, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${this.alpha})`;
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = canvas.parentElement.offsetWidth;
    H = canvas.height = canvas.parentElement.offsetHeight;
    particles.length = 0;
    for (let i = 0; i < COUNT; i++) particles.push(new Particle(i, COUNT));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (mouse.active) {
      const grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, AURA_R);
      grd.addColorStop(0,   'rgba(14,165,233,0.1)');
      grd.addColorStop(0.5, 'rgba(16,185,129,0.04)');
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, AURA_R, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    particles.forEach(p => { p.update(); p.draw(); });
    animId = raf(draw);
  }

  new ResizeObserver(() => resize()).observe(canvas.parentElement);
  resize();
  draw();

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!animId) draw(); }
    else { cancelAnimationFrame(animId); animId = null; }
  }, { threshold: 0 }).observe(canvas);
}

/* ── COUNTER ANIMATION ───────────────────────────────────────── */
function animateCounter(el, target, suffix, duration = 1800) {
  const start = performance.now();
  const isFloat = target % 1 !== 0;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out expo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const value = eased * target;
    el.textContent = (isFloat ? value.toFixed(1) : Math.floor(value)) + suffix;
    if (progress < 1) raf(step);
  }
  raf(step);
}

function initCounters() {
  const stats = $$('.hero__stat-value');
  const targets = [70, 100, 24];
  const suffixes = ['%', '%', 'h'];

  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Extract the unit span first
        const unit = entry.target.querySelector('.hero__stat-unit');
        const unitText = unit ? unit.textContent : '';
        // Clear and animate
        entry.target.innerHTML = '';
        if (unit) entry.target.appendChild(unit);
        animateCounter(entry.target, targets[i], unitText);
        counterObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(el => counterObs.observe(el));
}

/* ── MOBILE NAV ──────────────────────────────────────────────── */
function initMobileNav() {
  const burger = $('#nav-burger');
  const mobileMenu = $('#nav-mobile');
  if (!burger || !mobileMenu) return;

  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
    mobileMenu.classList.toggle('open', isOpen);
    mobileMenu.setAttribute('aria-hidden', !isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  burger.addEventListener('click', toggle);

  // Close on link click
  $$('.nav__link, .btn', mobileMenu).forEach(link => {
    link.addEventListener('click', () => {
      if (isOpen) toggle();
    });
  });

  // Close on escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) toggle();
  });
}

/* ── SMOOTH ANCHOR SCROLL ────────────────────────────────────── */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = $(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── CTA GLOW RIPPLE ─────────────────────────────────────────── */
function initCtaRipple() {
  $$('.btn--primary, .btn--xl').forEach(btn => {
    btn.addEventListener('mouseenter', e => {
      const rect = btn.getBoundingClientRect();
      const glow = document.createElement('span');
      glow.style.cssText = `
        position:absolute;
        top:50%;left:50%;
        width:0;height:0;
        background:rgba(255,255,255,0.15);
        border-radius:50%;
        transform:translate(-50%,-50%);
        pointer-events:none;
        animation:ripple 0.6s ease-out forwards;
      `;
      if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `@keyframes ripple{to{width:200%;height:200%;opacity:0}}`;
        document.head.appendChild(style);
      }
      btn.appendChild(glow);
      setTimeout(() => glow.remove(), 600);
    });
  });
}

/* ── FEATURE CARD MOUSE TILT ─────────────────────────────────── */
function initCardTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  $$('.feature-card, .problem__card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `translateY(-6px) scale(1.01) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ── TIMELINE PROGRESS ───────────────────────────────────────── */
function initTimelineGlow() {
  const items = $$('.timeline__item');
  const connectors = $$('.timeline__connector');

  const tObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.5 });

  items.forEach(item => tObs.observe(item));
}

/* ── LAZY LOAD IMAGES ────────────────────────────────────────── */
function initLazyImages() {
  if ('loading' in HTMLImageElement.prototype) return; // native lazy load support
  const lazyImgs = $$('img[loading="lazy"]');
  const imgObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.src = entry.target.dataset.src || entry.target.src;
        imgObs.unobserve(entry.target);
      }
    });
  });
  lazyImgs.forEach(img => imgObs.observe(img));
}

/* ── HERO CHIP STAGGER ENTRANCE ──────────────────────────────── */
function initChipEntrance() {
  const chips = $$('.hero__chip');
  chips.forEach((chip, i) => {
    chip.style.opacity = '0';
    chip.style.transform = 'translateX(20px)';
    setTimeout(() => {
      chip.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
      chip.style.opacity = '1';
      chip.style.transform = '';
    }, 1200 + i * 200);
  });
}

/* ── CTA CANVAS PARTICLES ────────────────────────────────────── */
function initCtaCanvas() {
  const canvas = $('#cta-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, animId;
  const particles = [];
  const COUNT = 400;

  const PALETTE = [
    [14,  165, 233],
    [16,  185, 129],
    [56,  189, 248],
    [52,  211, 153],
    [99,  102, 241],
    [168, 85,  247],
  ];

  const EASE_HOME   = 0.035;
  const EASE_TARGET = 0.07;

  let braceMode = false;
  let bracePts = [];

  function getCharPoints(char, cx, cy, size) {
    const oc = document.createElement('canvas');
    oc.width = size * 2;
    oc.height = size * 2;
    const ox = oc.getContext('2d');
    ox.fillStyle = '#fff';
    ox.font = `bold ${size}px serif`;
    ox.textAlign = 'center';
    ox.textBaseline = 'middle';
    ox.fillText(char, oc.width / 2, oc.height / 2);
    const data = ox.getImageData(0, 0, oc.width, oc.height).data;
    const pts = [];
    for (let py = 0; py < oc.height; py += 4) {
      for (let px = 0; px < oc.width; px += 4) {
        if (data[(py * oc.width + px) * 4 + 3] > 80) {
          pts.push({
            x: cx + px - oc.width  / 2,
            y: cy + py - oc.height / 2,
          });
        }
      }
    }
    return pts;
  }

  function assignBraceTargets() {
    const content = $('.cta-final__content');
    if (!content) return;
    const cvRect  = canvas.getBoundingClientRect();
    const cRect   = content.getBoundingClientRect();

    const cy    = cRect.top  - cvRect.top  + cRect.height / 2;
    const charH = cRect.height * 1.1;        // chave um pouco maior que o bloco
    const lCx   = cRect.left  - cvRect.left - charH * 0.22;
    const rCx   = cRect.right - cvRect.left + charH * 0.22;

    const lPts = getCharPoints('{', lCx, cy, charH);
    const rPts = getCharPoints('}', rCx, cy, charH);
    bracePts   = [...lPts, ...rPts];

    // evenly distribute particles across all brace points
    particles.forEach((p, i) => {
      const pt = bracePts[Math.floor(i / COUNT * bracePts.length)];
      p.tx = pt ? pt.x : p.homeX;
      p.ty = pt ? pt.y : p.homeY;
      p.following = true;
    });
  }

  function clearBraceTargets() {
    particles.forEach(p => { p.following = false; });
  }

  class CtaParticle {
    constructor() {
      this.homeX = Math.random() * W;
      this.homeY = Math.random() * H;
      this.x = this.homeX;
      this.y = this.homeY;
      this.tx = this.homeX;
      this.ty = this.homeY;
      this.following = false;
      this.baseLen   = Math.random() * 2 + 1.5;
      this.activeLen = Math.random() * 2.5 + 2;
      this.len       = this.baseLen;
      this.rgb       = [140, 140, 200];
      this.activeRgb = [99, 102, 241];
      if (Math.random() < 0.3) this.activeRgb = [14, 165, 233];
      if (Math.random() < 0.1) this.activeRgb = [16, 185, 129];
      this.baseAlpha   = Math.random() * 0.3 + 0.55;
      this.activeAlpha = Math.random() * 0.2 + 0.8;
      this.alpha       = this.baseAlpha;
      this.pulsePhase  = Math.random() * Math.PI * 2;
      this.pulseSpeed  = Math.random() * 0.02 + 0.008;
    }

    update() {
      this.pulsePhase += this.pulseSpeed;
      const pv = (Math.sin(this.pulsePhase) + 1) / 2;

      if (this.following) {
        this.x += (this.tx - this.x) * EASE_TARGET;
        this.y += (this.ty - this.y) * EASE_TARGET;
        this.len   = this.activeLen   * (0.75 + 0.25 * pv);
        this.alpha = this.activeAlpha * (0.75 + 0.25 * pv);
      } else {
        this.x += (this.homeX - this.x) * EASE_HOME;
        this.y += (this.homeY - this.y) * EASE_HOME;
        this.len   = this.baseLen   * (0.6 + 0.4 * pv);
        this.alpha = this.baseAlpha * (0.6 + 0.4 * pv);
      }
    }

    draw() {
      const [r, g, b] = this.following ? this.activeRgb : this.rgb;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.len, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${this.alpha})`;
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = canvas.parentElement.offsetWidth;
    H = canvas.height = canvas.parentElement.offsetHeight;
    if (particles.length === 0) {
      for (let i = 0; i < COUNT; i++) particles.push(new CtaParticle());
    } else {
      particles.forEach(p => {
        p.homeX = Math.random() * W;
        p.homeY = Math.random() * H;
        if (!p.following) { p.x = p.homeX; p.y = p.homeY; }
      });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    animId = raf(loop);
  }

  const btn = $('#final-cta');
  if (btn) {
    btn.addEventListener('mouseenter', () => {
      braceMode = true;
      assignBraceTargets();
    });
    btn.addEventListener('mouseleave', () => {
      braceMode = false;
      clearBraceTargets();
    });
  }

  new ResizeObserver(() => resize()).observe(canvas.parentElement);
  resize();
  loop();

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!animId) loop(); }
    else { cancelAnimationFrame(animId); animId = null; }
  }, { threshold: 0 }).observe(canvas);
}

/* ── INIT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initAnimations();
  initCanvas();
  initCtaCanvas();
  initMobileNav();
  initSmoothScroll();
  initCtaRipple();
  initCardTilt();
  initTimelineGlow();
  initLazyImages();
  initChipEntrance();

  // Trigger initial scroll state
  handleScroll(window.scrollY);

  // Counter animation — delayed for hero entrance
  setTimeout(initCounters, 800);

  console.log('%cMedSync – Connected Health 🏥', 'color:#10b981;font-size:16px;font-weight:bold;');
  console.log('%cO futuro do pronto atendimento.', 'color:#38bdf8;font-size:12px;');
});

/* ── PAGE VISIBILITY ─────────────────────────────────────────── */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause heavy animations when tab is not visible
    $$('.hero__orb, .hero__chip').forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  } else {
    $$('.hero__orb, .hero__chip').forEach(el => {
      el.style.animationPlayState = 'running';
    });
  }
});
