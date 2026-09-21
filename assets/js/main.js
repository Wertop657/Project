/* ============================================================
   Leo-wend · интерактив и анимации
   Без зависимостей. Мобильные устройства получают
   облегчённую версию: без курсора, магнитов и тилта.
   ============================================================ */
(() => {
  'use strict';

  const doc = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  doc.classList.add('js-ready');

  /* ---------- 1. Разбивка заголовков на буквы ---------- */
  const splitWords = () => {
    $$('[data-split]').forEach((el) => {
      const text = el.textContent.trim();
      el.textContent = '';
      [...text].forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch === ' ' ? ' ' : ch;
        span.style.animationDelay = `${i * 0.04}s`;
        el.appendChild(span);
      });
    });
  };
  splitWords();

  /* ---------- 2. Прелоадер ---------- */
  const loader = $('#loader');
  const bar = $('#loaderBar');
  const num = $('#loaderNum');

  const finishLoad = () => {
    if (!loader || loader.classList.contains('is-done')) return;
    loader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    // герой оживает сразу после прелоадера
    $$('#hero [data-reveal], #hero .word').forEach((el) => el.classList.add('is-in'));
    setTimeout(() => loader.remove(), 900);
  };

  if (loader) {
    document.body.classList.add('is-locked');
    let pct = 0;
    const tick = setInterval(() => {
      pct = Math.min(100, pct + Math.random() * 16 + 6);
      if (bar) bar.style.width = pct + '%';
      if (num) num.textContent = Math.round(pct);
      if (pct >= 100) {
        clearInterval(tick);
        setTimeout(finishLoad, 320);
      }
    }, reduced ? 20 : 110);
    // страховка: не держим пользователя дольше 3.5 с
    setTimeout(() => { clearInterval(tick); finishLoad(); }, 3500);
  }

  /* ---------- 3. Появление при скролле ---------- */
  // Слова заголовков скрыты маской родителя, поэтому наблюдаем за самим
  // заголовком ([data-words]) и уже от него подсвечиваем слова внутри.
  const show = (el) => {
    el.classList.add('is-in');
    if (el.hasAttribute('data-words')) {
      $$('.word', el).forEach((w) => w.classList.add('is-in'));
    }
  };

  const targets = $$('[data-reveal], .tl, [data-words]')
    .filter((el) => !el.closest('#hero'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          show(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach(show);
  }

  /* ---------- 4. Счётчики ---------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const end = parseFloat(el.dataset.count);
        cio.unobserve(el);
        if (reduced) { el.textContent = end; return; }
        const dur = 1100;
        const t0 = performance.now();
        const step = (t) => {
          const p = clamp((t - t0) / dur, 0, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- 5. Шапка, прогресс, скроллспай ---------- */
  const nav = $('#nav');
  const progress = $('#scrollProgress');
  const fill = $('#timelineFill');
  const timeline = $('#timeline');
  const links = $$('.nav__menu a[data-link]');
  const sections = links
    .map((a) => $(a.getAttribute('href')))
    .filter(Boolean);

  let lastY = 0;
  let ticking = false;
  let menuOpen = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.body.scrollHeight - window.innerHeight;

    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (nav) {
      nav.classList.toggle('is-stuck', y > 20);
      nav.classList.toggle('is-hidden', y > lastY && y > 400 && !menuOpen);
    }

    if (timeline && fill) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((window.innerHeight * 0.62 - r.top) / r.height, 0, 1);
      fill.style.height = p * 100 + '%';
    }

    let active = null;
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.35) active = s.id;
    });
    links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + active));

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- 6. Мобильное меню ---------- */
  const burger = $('#burger');
  const mmenu = $('#mobileMenu');

  const setMenu = (open) => {
    menuOpen = open;
    burger?.classList.toggle('is-open', open);
    burger?.setAttribute('aria-expanded', String(open));
    burger?.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mmenu?.classList.toggle('is-open', open);
    mmenu?.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
  };

  burger?.addEventListener('click', () => setMenu(!menuOpen));
  $$('.mmenu__list a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  /* ---------- 7. Плавный переход по якорям ---------- */
  $$('a[data-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : 70);
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', id === '#top' ? location.pathname : id);
    });
  });

  /* ---------- 8. Курсор, магниты, тилт (только десктоп) ---------- */
  if (fine && !reduced) {
    const cursor = $('#cursor');
    const ring = $('.cursor__ring');
    const dot = $('.cursor__dot');
    let cx = innerWidth / 2, cy = innerHeight / 2, rx = cx, ry = cy;

    window.addEventListener('mousemove', (e) => {
      cx = e.clientX; cy = e.clientY;
      cursor?.classList.add('is-on');
      if (dot) dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    }, { passive: true });

    const loop = () => {
      rx += (cx - rx) * 0.16;
      ry += (cy - ry) * 0.16;
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();

    $$('a, button, [data-magnet], .card, .clink').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor?.classList.add('is-hot'));
      el.addEventListener('mouseleave', () => cursor?.classList.remove('is-hot'));
    });

    // магнитное притяжение
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    // лёгкий 3D-наклон
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', px * 100 + '%');
        el.style.setProperty('--my', py * 100 + '%');
        el.style.transform =
          `perspective(1000px) rotateX(${(0.5 - py) * 5}deg) rotateY(${(px - 0.5) * 6}deg) translateY(-4px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    // подсветка карточек без тилта
    $$('.card').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }

  /* ---------- 9. Частицы в герое ---------- */
  const canvas = $('#heroCanvas');
  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const hero = $('#hero');
    let w = 0, h = 0, dpr = 1, pts = [], raf = 0, visible = true;
    const pointer = { x: -999, y: -999 };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      w = canvas.width = Math.floor(r.width * dpr);
      h = canvas.height = Math.floor(r.height * dpr);
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';

      const density = isMobile ? 14000 : 9000;
      const count = clamp(Math.round((r.width * r.height) / density), 22, isMobile ? 46 : 110);
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22 * dpr,
        vy: (Math.random() - 0.5) * 0.22 * dpr,
        r: (Math.random() * 1.5 + 0.6) * dpr
      }));
    };

    const linkDist = () => (isMobile ? 110 : 140) * dpr;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const LD = linkDist();

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LD * LD) {
            const a = (1 - Math.sqrt(d2) / LD) * 0.3;
            ctx.strokeStyle = `rgba(124,92,255,${a})`;
            ctx.lineWidth = dpr * 0.7;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        const pdx = p.x - pointer.x, pdy = p.y - pointer.y;
        const near = pdx * pdx + pdy * pdy < (170 * dpr) ** 2;
        ctx.fillStyle = near ? 'rgba(37,230,210,.95)' : 'rgba(255,255,255,.55)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, near ? p.r * 1.7 : p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    start();

    let rt = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { resize(); }, 180);
    });

    if (fine) {
      window.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        pointer.x = (e.clientX - r.left) * dpr;
        pointer.y = (e.clientY - r.top) * dpr;
      }, { passive: true });
    }

    // не жжём батарею, когда герой вне экрана или вкладка скрыта
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        visible && !document.hidden ? start() : stop();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
      document.hidden || !visible ? stop() : start();
    });
  }

  /* ---------- 10. Мелочи ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
