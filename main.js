/* ---------- static mode (?static=1, or prefers-reduced-motion) ---------- */
const STATIC = new URLSearchParams(location.search).has('static')
  || matchMedia('(prefers-reduced-motion: reduce)').matches;
if (STATIC) document.documentElement.classList.add('static-mode');

/* verification helper: ?goto=<selector> scrolls there on load */
const gotoSel = new URLSearchParams(location.search).get('goto');
if (gotoSel) {
  window.addEventListener('load', () => {
    const el = document.querySelector(gotoSel);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' });
  });
}

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- intro replay ---------- */
function playIntro() {
  const introEl = document.querySelector('.intro');
  if (!introEl || STATIC) return;
  introEl.classList.remove('play');
  void introEl.offsetWidth;
  introEl.classList.add('play');
}
playIntro();

/* ---------- rotating words (hero) ---------- */
document.querySelectorAll('.h4-rotator').forEach((rot) => {
  const words = [...rot.querySelectorAll('span')];
  if (!words.length) return;
  let wi = 0;
  words[0].classList.add('on');
  if (!STATIC) {
    setInterval(() => {
      words[wi].classList.remove('on');
      wi = (wi + 1) % words.length;
      words[wi].classList.add('on');
    }, 4600);
  }
});

/* ---------- cursor glow ---------- */
const glow = document.querySelector('.cursor-glow');
if (glow && !STATIC) {
  window.addEventListener('mousemove', (e) => {
    glow.style.transform = `translate(${e.clientX - 320}px, ${e.clientY - 320}px)`;
  });
}

/* ---------- flow field factory ---------- */
function makeFlow(canvas, opts) {
  if (!canvas) return;
  const o = Object.assign({ n: 850, alpha: 0.085, fade: 0.045, speed: 1.35, weaveAlpha: 0.028 }, opts);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio, 1.6);
  let W = 0, H = 0, parts = [];

  function field(x, y, t) {
    return (
      Math.sin(x * 0.0013 + t * 0.00016) +
      Math.cos(y * 0.0011 - t * 0.00021) +
      Math.sin((x + y) * 0.0006 + t * 0.0001)
    ) * 1.9;
  }
  const spawn = () => ({ x: Math.random() * W, y: Math.random() * H, life: 60 + Math.random() * 220 });

  function stepAndDraw(t, speed, alpha) {
    ctx.strokeStyle = `rgba(150, 190, 250, ${alpha})`;
    ctx.lineWidth = dpr * 0.55;
    ctx.beginPath();
    for (const p of parts) {
      const a = field(p.x, p.y, t);
      const nx = p.x + Math.cos(a) * speed;
      const ny = p.y + Math.sin(a) * speed;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      p.x = nx; p.y = ny; p.life--;
      if (p.life <= 0 || nx < -8 || nx > W + 8 || ny < -8 || ny > H + 8) Object.assign(p, spawn());
    }
    ctx.stroke();
  }
  function staticWeave() {
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, W, H);
    for (let s = 0; s < 260; s++) stepAndDraw(s * 16, 2.1 * dpr, o.weaveAlpha);
  }
  function resize() {
    if (!canvas.offsetWidth) return;
    W = canvas.width = canvas.offsetWidth * dpr;
    H = canvas.height = canvas.offsetHeight * dpr;
    parts = Array.from({ length: o.n }, spawn);
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, W, H);
    if (STATIC) staticWeave();
  }
  window.addEventListener('resize', resize);

  let running = true;
  const vis = new IntersectionObserver((entries) => {
    const v = entries[0].isIntersecting;
    if (v && !running) { running = true; requestAnimationFrame(frame); }
    else if (!v) { running = false; }
  }, { threshold: 0.02 });
  vis.observe(canvas);

  function frame(t) {
    if (!running || STATIC) return;
    const cw = Math.round(canvas.offsetWidth * dpr);
    if (!W || Math.abs(cw - W) > 2) { resize(); requestAnimationFrame(frame); return; }
    ctx.fillStyle = `rgba(5, 6, 9, ${o.fade})`;
    ctx.fillRect(0, 0, W, H);
    stepAndDraw(t, o.speed * dpr, o.alpha);
    requestAnimationFrame(frame);
  }

  resize();
  if (!STATIC) requestAnimationFrame(frame);
  return { resize };
}

makeFlow(document.getElementById('flow-canvas'));
makeFlow(document.getElementById('flow-canvas-2'), { n: 300, alpha: 0.05, fade: 0.06, speed: 0.9, weaveAlpha: 0.02 });

/* ---------- scroll-driven effects: ghost kanji parallax + biography progress ---------- */
const ghosts = [...document.querySelectorAll('.pr-ghost')];
const bioTimeline = document.querySelector('.bio-timeline');
const bioProgress = document.querySelector('.bio-progress');

if (STATIC && bioProgress) bioProgress.style.height = '100%';

if (!STATIC && (ghosts.length || bioTimeline)) {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = innerHeight;
      for (const g of ghosts) {
        const r = g.parentElement.getBoundingClientRect();
        const offset = (r.top + r.height / 2 - vh / 2) * -0.12;
        g.style.transform = `translateY(calc(-50% + ${offset.toFixed(1)}px))`;
      }
      if (bioTimeline && bioProgress) {
        const r = bioTimeline.getBoundingClientRect();
        const passed = Math.min(Math.max(vh * 0.72 - r.top, 0), r.height);
        bioProgress.style.height = passed.toFixed(0) + 'px';
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
