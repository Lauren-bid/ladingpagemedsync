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

/* ── HERO CANVAS PARTICLE NETWORK ────────────────────────────── */
function initCanvas() {
  const canvas = $('#hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  const PARTICLE_COUNT = window.innerWidth < 768 ? 30 : 60;
  const CONNECTION_DIST = 130;
  const COLORS = ['rgba(14,165,233,', 'rgba(16,185,129,', 'rgba(139,92,246,'];

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.r = Math.random() * 1.5 + 0.5;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.opacity = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.opacity + ')';
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = canvas.parentElement.offsetWidth;
    H = canvas.height = canvas.parentElement.offsetHeight;
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(14,165,233,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => { p.update(); p.draw(); });
    animId = raf(draw);
  }

  const resizeObs = new ResizeObserver(() => { resize(); });
  resizeObs.observe(canvas.parentElement);

  resize();
  draw();

  // Pause when not visible (performance)
  const visObs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!animId) draw();
    } else {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }, { threshold: 0 });
  visObs.observe(canvas);
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

/* ── INIT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initAnimations();
  initCanvas();
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
